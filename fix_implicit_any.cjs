const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
content = content.replace(/statsHistory\.map\(s =>/g, 'statsHistory.map((s: any) =>');
fs.writeFileSync('src/pages/Dashboard.tsx', content);
