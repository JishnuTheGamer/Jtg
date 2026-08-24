const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
content = content.replace(
  'if (realServers) {',
  'if (realServers && Array.isArray(realServers)) {'
);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log("Fixed realServers check");
