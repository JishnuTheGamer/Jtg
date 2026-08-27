const fs = require('fs');

const file = "src/server/controllers/servers.ts";
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  /size: f\.isDirectory\(\) \? 0 : fs\.statSync\(path\.join\(targetPath, f\.name\)\)\.size/g,
  `size: f.isDirectory() ? 0 : fs.statSync(path.join(targetPath, f.name)).size,
      mtime: fs.statSync(path.join(targetPath, f.name)).mtime`
);

fs.writeFileSync(file, text);
console.log("Added mtime to getFiles.");
