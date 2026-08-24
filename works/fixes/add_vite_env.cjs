const fs = require('fs');
fs.writeFileSync('src/vite-env.d.ts', '/// <reference types="vite/client" />\n');
console.log('Added vite-env.d.ts');
