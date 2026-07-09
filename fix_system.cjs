const fs = require('fs');
let content = fs.readFileSync('src/server/routes/system.ts', 'utf8');
content = content.replace(/users\[targetIndex\].passwordVersion = \(users\[targetIndex\].passwordVersion \|\| 0\) \+ 1;\n  users\[targetIndex\].passwordVersion = \(users\[targetIndex\].passwordVersion \|\| 0\) \+ 1;/g, 'users[targetIndex].passwordVersion = (users[targetIndex].passwordVersion || 0) + 1;');
fs.writeFileSync('src/server/routes/system.ts', content);
