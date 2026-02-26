(function () {
  // ===== אלמנטים מה‑DOM =====
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("pdfFile");
  const detailSel = document.getElementById("detail");
  const statusEl = document.getElementById("status");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!form) return;

  // ===== עזרי UI =====
  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#b00020" : "#0a2540";
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.style.opacity = busy ? 0.7 : 1;
    submitBtn.style.cursor = busy ? "not-allowed" : "pointer";
  }

  // ===== בדיקות קובץ =====
  function validateFile(file) {
    if (!file) {
      alert("בחר קובץ PDF");
      return false;
    }
    const okTypes = ["application/pdf", "application/octet-stream"];
    if (!okTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("נא לבחור קובץ עם סיומת .pdf");
      return false;
    }
    const MAX = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX) {
      alert("גודל קובץ מרבי: 20MB");
      return false;
    }
    return true;
  }

  // ===== הורדה אוטומטית =====
  function autoDownload(url, suggestedName = "WI-output.docx") {
    // אפשר גם: window.open(url, "_blank");
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName; // ייתכן שהשרת יקבע שם אחר לפי Header
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ===== Warm-up ל‑API בעת טעינת הדף (מעיר את Render) =====
  (async function warmUp() {
    try {
      // Netlify ינתב /api/health ל‑Render לפי netlify.toml
      await fetch("/api/health", { method: "GET", cache: "no-store" });
      // אין צורך לעדכן UI; המטרה רק להעיר את השרת
    } catch (_) {
      // מתעלמים – גם אם נכשל, הניסיון הבא יצליח לאחר זמן קצר
    }
  })();

  // ===== Fetch עם Timeout =====
  async function fetchWithTimeout(url, options = {}, timeoutMs = 65000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  // ===== קריאה ל‑/api/process-pdf עם Retry בעת 504/Timeout =====
  async function processPdfWithRetry(formData, maxAttempts = 2) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        // ניסיון
        const res = await fetchWithTimeout("/api/process-pdf", {
          method: "POST",
          body: formData
        }, 65000); // 65 שניות לניסיון – מתאים ל‑cold start + עיבוד קצר

        // אם השרת ענה 504 – ננסה שוב אחרי השהייה קצרה
        if (res.status === 504) {
          if (attempt < maxAttempts) {
            setStatus("השרת מתעורר... ניסיון חוזר עוד רגע (504)", true);
            await new Promise(r => setTimeout(r, 4000));
            continue;
          } else {
            return res; // נחזיר את ה‑504 האחרון, יטופל בחוץ
          }
        }
        return res; // כל סטטוס אחר נחזיר למעלה
      } catch (err) {
        lastError = err;
        // Abort/Timeout או כשל רשת – ננסה שוב אם יש עוד ניסיון
        if (attempt < maxAttempts) {
          setStatus("זמן תגובה ארוך – מנסה שוב...", true);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        } else {
          throw lastError;
        }
      }
    }
    // לא אמור להגיע לכאן
    throw lastError || new Error("כשל לא ידוע");
  }

  // ===== שליחת הטופס =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = fileInput?.files?.[0];
    if (!validateFile(file)) return;

    // בניית גוף הבקשה
    const formData = new FormData();
    formData.append("file", file);
    formData.append("detail_level", detailSel?.value ?? "2");

    setBusy(true);
    setStatus("מעלה ומעבד...");

    try {
      // קריאה יחסית ל‑/api/process-pdf – Netlify redirect → Render
      const res = await processPdfWithRetry(formData, 2);

      if (!res.ok) {
        let msg = `שגיאה בעיבוד בצד השרת (HTTP ${res.status})`;
        try {
          const problem = await res.json();
          if (problem?.detail) msg += `: ${problem.detail}`;
        } catch (_) { /* ייתכן שאין JSON */ }
        throw new Error(msg);
      }

      const data = await res.json();

      if (data?.docx_url) {
        setStatus("מוכן – מתחיל הורדה אוטומטית ✅");
        const baseName = (file.name || "WI").replace(/\.[Pp][Dd][Ff]$/, "");
        autoDownload(data.docx_url, `${baseName}-WI.docx`);

        // אם תרצה גם להציג קישור נוסף:
        // statusEl.innerHTML = `✅ מוכן: <a href="${data.docx_url}" target="_blank" rel="noopener">הורדת קובץ Word</a>`;
      } else {
        setStatus("העיבוד הצליח אך לא התקבל קישור לקובץ.", true);
      }
    } catch (err) {
      setStatus("❌ " + (err?.message || "שגיאה לא ידועה"), true);
    } finally {
      setBusy(false);
    }
  });
})();
