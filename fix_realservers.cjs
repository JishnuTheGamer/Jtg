const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
content = content.replace(
  'realServers.filter',
  '(Array.isArray(realServers) ? realServers : []).filter'
);
content = content.replace(
  'realServers.length',
  '(Array.isArray(realServers) ? realServers : []).length'
);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log("Fixed realServers");
