const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/server/services/sftp.ts');
let code = fs.readFileSync(p, 'utf8');

if (!code.includes('process.on("SIGTERM"')) {
  code = code.replace(
    'server.listen(SFTP_PORT, "0.0.0.0", () => {',
    'server.listen(SFTP_PORT, "0.0.0.0", () => { // replaced\n'
  );
  code = code.replace(
    'console.log(`SFTP server listening on port ${SFTP_PORT}`);\n  });',
    'console.log(`SFTP server listening on port ${SFTP_PORT}`);\n  });\n\n  process.on("SIGTERM", () => server.close());\n  process.on("SIGINT", () => server.close());'
  );
  fs.writeFileSync(p, code);
  console.log("SFTP graceful shutdown added");
}
