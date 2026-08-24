const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');
console.log(code.includes('import.meta.env'));
