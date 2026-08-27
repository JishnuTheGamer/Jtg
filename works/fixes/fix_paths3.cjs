const fs = require('fs');

const file = "src/server/controllers/servers.ts";
let text = fs.readFileSync(file, 'utf8');

text = text.replace(/&& !([a-zA-Z0-9_]+)\.substring\(1\) !==/g, '&& $1 !==');

fs.writeFileSync(file, text);
console.log("Fixed JS syntax in servers.ts.");
