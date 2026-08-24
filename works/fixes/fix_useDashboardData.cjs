const fs = require('fs');
let content = fs.readFileSync('src/hooks/useDashboardData.ts', 'utf-8');
content = content.replace(
  'setServers(serversRes.value.data ?? []);',
  'setServers(Array.isArray(serversRes.value.data) ? serversRes.value.data : []);'
);
fs.writeFileSync('src/hooks/useDashboardData.ts', content);
console.log("Fixed useDashboardData.ts");
