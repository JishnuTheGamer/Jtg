const fs = require('fs');

let routes = fs.readFileSync('src/server/routes/servers.ts', 'utf8');

if (!routes.includes('installPlugin')) {
  routes = routes.replace(
    'unzipFile, zipFiles } from "../controllers/servers.js";',
    'unzipFile, zipFiles, installPlugin } from "../controllers/servers.js";'
  );
  routes += '\nrouter.post("/:id/plugins/install", installPlugin);\n';
  fs.writeFileSync('src/server/routes/servers.ts', routes);
}
