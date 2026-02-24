[build]
  # הדפסות לפני/אחרי build כדי לחשוף את השגיאה והפלט שנוצר
  command = "echo '--- BEFORE BUILD ---' && pwd && node -v && npm -v && ls -la && npm ci && echo '--- RUN BUILD ---' && npm run build && echo '--- AFTER BUILD ---' && ls -la && echo '--- CHECK build ---' && (ls -la build || true) && echo '--- CHECK dist ---' && (ls -la dist || true)"
  publish = "build"   # זמני; נעדכן ל-dist אם נראה שהפלט הוא dist

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
