(function () {
  // אלמנטים מה‑DOM
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("pdfFile");
  const detailSel = document.getElementById("detail");
  const statusEl = document.getElementById("status");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!form) return;

  // פונקציה קטנה לעדכון סטטוס
  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#b00020" : "#0a2540";
  }

  // השבתה/הפעלה של הכפתור בזמן עבודה
  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.style.opacity = busy ? 0.7 : 1;
    submitBtn.style.cursor = busy ? "not-allowed" : "pointer";
  }

  // בדיקות לקובץ לפני שליחה
  function validateFile(file) {
    if (!file) {
      alert("בחר קובץ PDF");
      return false;
    }
    // חלק מהדפדפנים מסמנים application/octet-stream; נאפשר גם אותו
    const okTypes = ["application/pdf", "application/octet-stream"];
    if (!okTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("נא לבחור קובץ עם סיומת .pdf");
      return false;
    }
    // מגבלת גודל דוגמה: 20MB
    const MAX = 20 * 1024 * 1024;
    if (file.size > MAX) {
      alert("גודל קובץ מרבי: 20MB");
      return false;
    }
    return true;
  }

  // הורדה אוטומטית של קובץ (מופעלת אחרי קבלת docx_url)
  function autoDownload(url, suggestedName = "WI-output.docx") {
    // אפשר להחליף לפתיחה בטאב:
    // window.open(url, "_blank");
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName; // הדפדפן יכול להתעלם אם השרת קובע header filename
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = fileInput?.files?.[0];
    if (!validateFile(file)) return;

    // בניית ה‑FormData לשליחה ל‑API
    const formData = new FormData();
    formData.append("file", file);
    formData.append("detail_level", detailSel?.value ?? "2");

    setBusy(true);
    setStatus("מעלה ומעבד...");

    try {
      // קריאה יחסית: /api/process-pdf — Netlify ינתב ל‑Render לפי netlify.toml
      const res = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // ננסה לקרוא הודעת שגיאה מפורטת מה‑API
        let msg = `שגיאה בעיבוד בצד השרת (HTTP ${res.status})`;
        try {
          const problem = await res.json();
          if (problem?.detail) msg += `: ${problem.detail}`;
        } catch (_) { /* מתעלמים אם אין JSON */ }
        throw new Error(msg);
      }

      const data = await res.json();

      if (data?.docx_url) {
        // הודעת הצלחה קצרה + התחלת הורדה אוטומטית
        setStatus("מוכן – מתחיל הורדה אוטומטית ✅");
        // שם מוצע לפי קובץ המקור (לא חובה)
        const baseName = (file.name || "WI").replace(/\.[Pp][Dd][Ff]$/, "");
        autoDownload(data.docx_url, `${baseName}-WI.docx`);

        // אם אתה רוצה גם להציג קישור בנוסף להורדה:
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
