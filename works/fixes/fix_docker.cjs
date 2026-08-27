const fs = require('fs');

const dockerPath = "src/server/services/docker.ts";
let dockerText = fs.readFileSync(dockerPath, 'utf8');

dockerText = dockerText.replace('import { io } from "../../../server.js"; // Import socket for logs', 'let ioInstance: any = null;\nexport const setDockerIO = (io: any) => { ioInstance = io; };');

dockerText = dockerText.replace(/io\.to\(/g, 'ioInstance?.to(');

fs.writeFileSync(dockerPath, dockerText);
console.log("Fixed docker.ts");

const serverPath = "server.ts";
let serverText = fs.readFileSync(serverPath, 'utf8');

serverText = serverText.replace(
  'import { attachContainerSocket, getContainerLogs } from "./src/server/services/docker.js";',
  'import { attachContainerSocket, getContainerLogs, setDockerIO } from "./src/server/services/docker.js";'
);

serverText = serverText.replace(
  'app.set("io", io);',
  'app.set("io", io);\nsetDockerIO(io);'
);

fs.writeFileSync(serverPath, serverText);
console.log("Fixed server.ts");

