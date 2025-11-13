const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

const serveStatic = (req, res, filePath) => {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Log requests for debugging
  console.log(`${method} ${pathname}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint: Get data.json
  if (pathname === "/api/data" && method === "GET") {
    if (!fs.existsSync(DATA_FILE)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "data.json not found" }));
      return;
    }
    serveStatic(req, res, DATA_FILE);
    return;
  }

  // API endpoint: Save data.json
  if (pathname === "/api/save" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "تم حفظ البيانات بنجاح" }));
        console.log("✅ تم حفظ data.json");
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: error.message }));
        console.error("❌ خطأ في الحفظ:", error.message);
      }
    });
    return;
  }

  // Handle /admin route (redirect to admin.html)
  if (pathname === "/admin" || pathname === "/admin/") {
    res.writeHead(301, { Location: "/admin.html" });
    res.end();
    return;
  }

  // Serve static files
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(__dirname, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveStatic(req, res, filePath);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ المنفذ ${PORT} مستخدم بالفعل. جرب منفذ آخر أو أغلق البرنامج الذي يستخدمه.`);
  } else {
    console.error("❌ خطأ في الخادم:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n✅ الخادم يعمل بنجاح!`);
  console.log(`📍 العنوان: http://localhost:${PORT}`);
  console.log(`\n📄 الصفحات المتاحة:`);
  console.log(`   - عرض السعر: http://localhost:${PORT}/index.html`);
  console.log(`   - صفحة الإدارة: http://localhost:${PORT}/admin.html`);
  console.log(`\n⏹️  لإيقاف الخادم: اضغط Ctrl+C\n`);
});

