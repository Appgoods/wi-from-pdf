(function () {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("pdfFile");
  const detailSel = document.getElementById("detail");
  const statusEl = document.getElementById("status");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // בדיקת קלט בסיסית
    if (!fileInput.files.length) {
      alert("בחר קובץ PDF");
      return;
    }
    const file = fileInput.files[0];
    if (file.type !== "application/pdf") {
      alert("נא לבחור קובץ PDF תקין");
      return;
    }

    statusEl.textContent = "מעלה ומעבד...";

    // בניית גוף הבקשה
    const formData = new FormData();
    formData.append("file", file);
    formData.append("detail_level", detailSel.value);

    try {
      // *** שורה חשובה: מסלול יחסי! ***
      // Netlify ינתב /api/* ל־Render לפי netlify.toml
      const res = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // ניסיון לקרוא גוף שגיאה (אם יש)
        let msg = `שגיאה בעיבוד בצד השרת (HTTP ${res.status})`;
        try {
          const problem = await res.json();
          if (problem?.detail) msg += `: ${problem.detail}`;
        } catch (_) { /* ignore */ }
        throw new Error(msg);
      }

      const data = await res.json();

      if (data?.docx_url) {
        // מציג קישור להורדה
        statusEl.innerHTML = `✅ מוכן: ${data.docx_url}הורדת קובץ Word</a>`;

        // --- אופציונלי: פתיחה/הורדה אוטומטית ---
        // window.open(data.docx_url, "_blank");
        // const a = document.createElement("a");
        // a.href = data.docx_url;
        // a.download = "WI-output.docx";
        // document.body.appendChild(a);
        // a.click();
        // a.remove();
      } else {
        statusEl.textContent = "העיבוד הצליח אך לא התקבל קישור לקובץ.";
      }
    } catch (err) {
      statusEl.textContent = "❌ שגיאה: " + (err?.message || "לא ידוע");
    }
  });
})();
