const fs = require('fs');

const file = "src/server/controllers/servers.ts";
let text = fs.readFileSync(file, 'utf8');

// Replace .startsWith with a safe check that includes the path separator or an exact match
// Specifically targeting the known patterns.

text = text.replace(
  /(![a-zA-Z0-9_]+)\.startsWith\(path\.join\(process\.cwd\(\), "\.data", "servers", id\)\)/g, 
  "( $1.startsWith(path.join(process.cwd(), '.data', 'servers', id) + path.sep) && $1.substring(1) !== path.join(process.cwd(), '.data', 'servers', id) )"
);

text = text.replace(
  /(![a-zA-Z0-9_]+)\.startsWith\(path\.join\(process\.cwd\(\), "\.data", "backups", id\)\)/g, 
  "( $1.startsWith(path.join(process.cwd(), '.data', 'backups', id) + path.sep) && $1.substring(1) !== path.join(process.cwd(), '.data', 'backups', id) )"
);

text = text.replace(
  /(![a-zA-Z0-9_]+)\.startsWith\(serverBaseDir\)/g, 
  "( $1.startsWith(serverBaseDir + path.sep) && $1.substring(1) !== serverBaseDir )"
);

fs.writeFileSync(file, text);
console.log("Path security patched.");
