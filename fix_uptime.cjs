const fs = require('fs');

const path = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /uptime: isNaN\(Number\(s\.uptime\)\) \? '-' : `\$\{Math\.floor\(Number\(s\.uptime\) \/ 3600\)\}h \$\{Math\.floor\(\(Number\(s\.uptime\) % 3600\) \/ 60\)\}m`/g,
  "uptime: isNaN(Number((s as any).uptime)) ? '-' : `${Math.floor(Number((s as any).uptime) / 3600)}h ${Math.floor((Number((s as any).uptime) % 3600) / 60)}m`"
);

fs.writeFileSync(path, code);
console.log('Fixed uptime');
