const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/Shared.tsx', 'utf8');
content = content.replace(/<div className="group relative block w-full sm:w-auto \${className \|\| ""}`}">/g, '<div className="group relative block w-full sm:w-auto">');
fs.writeFileSync('src/components/dashboard/Shared.tsx', content);
