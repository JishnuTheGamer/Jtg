const fs = require('fs');
let text = fs.readFileSync("src/server/controllers/servers.ts", "utf8");

text = text.replace(/limitDisk: server.disk \|\| 10,/g, 'limitDisk: server.disk ? server.disk * 1024 : 10240,');

fs.writeFileSync("src/server/controllers/servers.ts", text);
