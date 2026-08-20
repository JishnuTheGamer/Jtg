const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('process.on("uncaughtException"')) {
  code = `// Global error handlers to prevent panel crashes
process.on("uncaughtException", (err) => {
  console.error("[Global Error] Uncaught Exception:", err.message);
  // Do not exit, keep panel running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Global Error] Unhandled Rejection at:", promise, "reason:", reason);
  // Do not exit, keep panel running
});

` + code;
  fs.writeFileSync('server.ts', code);
}
