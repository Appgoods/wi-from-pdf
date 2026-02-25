(function () {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("pdfFile");
  const detailSel = document.getElementById("detail");
  const statusEl = document.getElementById("status");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!fileInput.files.length) {
      alert("בחר/י קובץ PDF");
      return;
    }

    statusEl.textContent = "מעלה ומעבד...";

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("detail_level", detailSel.value);

    try {
      // בשלב זה אין בק־אנד — נחזיר הודעת דמו ולא נקרוס
      await new Promise((r) => setTimeout(r, 700));
      statusEl.innerHTML = "✅ דמו: הפרונט תקין. חיבור ל‑API יתוסף בשלב הבא.";
    } catch (err) {
      statusEl.textContent = "❌ שגיאה: " + (err?.message || "לא ידוע");
    }
  });
})();
