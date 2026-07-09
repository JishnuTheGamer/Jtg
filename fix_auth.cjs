const fs = require('fs');
let content = fs.readFileSync('src/server/controllers/auth.ts', 'utf8');
content = content.replace(/users\[userIndex\].passwordVersion = \(users\[userIndex\].passwordVersion \|\| 0\) \+ 1;\n  users\[userIndex\].passwordVersion = \(users\[userIndex\].passwordVersion \|\| 0\) \+ 1;/g, 'users[userIndex].passwordVersion = (users[userIndex].passwordVersion || 0) + 1;');
fs.writeFileSync('src/server/controllers/auth.ts', content);
