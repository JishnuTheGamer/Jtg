import Docker from "dockerode";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

import { panelEvents } from "../events.js"; // Import socket for logs
import { readJSON } from "./db.js";

const getSocketPath = () => {
  if (process.platform === 'win32') return '//./pipe/docker_engine';
  if (process.env.DOCKER_SOCKET_PATH && fs.existsSync(process.env.DOCKER_SOCKET_PATH)) {
    return process.env.DOCKER_SOCKET_PATH;
  }
  if (fs.existsSync('/var/run/docker.sock')) return '/var/run/docker.sock';
  if (fs.existsSync('/run/docker.sock')) return '/run/docker.sock';
  return '/var/run/docker.sock';
};

export const isDockerEnabled = process.env.ENABLE_DOCKER === "true";

export const isSandbox = !isDockerEnabled || (!fs.existsSync('/var/run/docker.sock') &&
  !fs.existsSync('/run/docker.sock') &&
  !(process.env.DOCKER_SOCKET_PATH && fs.existsSync(process.env.DOCKER_SOCKET_PATH)) &&
  process.platform !== 'win32');

export const isNodeSandbox = (nodeId?: string) => {
  if (!nodeId || nodeId === 'local') return isSandbox;
  return false;
};

export const defaultDocker = new Docker({ socketPath: getSocketPath() });

export const getDocker = async (nodeId?: string) => {
  if (!nodeId || nodeId === "local") return defaultDocker;
  const nodes = await readJSON("nodes.json") || [];
  const node = nodes.find((n: any) => n.id === nodeId);
  if (node) {
    let host = node.ip;
    let protocol: "http" | "https" | "ssh" = "http";
    let port = node.port;

    if (node.connectionMode === "tunnel") {
      // Tunnel mode: use URL exactly as provided, ignoring port
      try {
        if (!host.startsWith("http://") && !host.startsWith("https://")) {
           host = "https://" + host;
        }
        const url = new URL(host);
        protocol = (url.protocol.replace(':', '') === 'https' ? 'https' : 'http');
        host = url.hostname;
        port = url.port ? parseInt(url.port) : (protocol === "https" ? 443 : 80);
      } catch (e) {
        console.error("Invalid URL in Tunnel Mode node", host);
      }
    } else {
      // Direct mode: Host + Port
      if (!host.startsWith("http://") && !host.startsWith("https://") && port === 443) {
        protocol = "https";
      }

      if (host.startsWith("http://") || host.startsWith("https://")) {
        try {
          const url = new URL(host);
          protocol = (url.protocol.replace(':', '') === 'https' ? 'https' : 'http');
          host = url.hostname;
          if (url.port) port = parseInt(url.port);
          else port = protocol === "https" ? 443 : 80;
        } catch (e) {
          console.error("Invalid URL in node IP", host);
        }
      }
    }

    console.log(`[getDocker] Selected Node URL: ${protocol}://${host}:${port}`); console.log(`[getDocker] Configured IP was: ${node.ip}, connectionMode: ${node.connectionMode}`); const d = new Docker({
      protocol,
      host,
      port,
      headers: { 
        Authorization: "Bearer " + node.key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const originalDial = d.modem.dial;
    d.modem.dial = function(options: any, callback: any) {
      console.log("[Docker Request] " + options.method + " " + options.path);
      console.log("[Docker Outgoing URL] " + (d.modem as any).protocol + "://" + (d.modem as any).host + ":" + (d.modem as any).port + options.path);
      const originalCb = callback;
      const newCb = (err: any, data: any) => {
        if (err) {
          console.log("[Docker Response Error] Status:", err.statusCode, "Body:", err.reason || err.message);
        } else {
          console.log("[Docker Response Success] Body:", JSON.stringify(data));
        }
        return originalCb(err, data);
      };
      return originalDial.call(d.modem, options, newCb);
    };
    return d;
  }
  return defaultDocker;
};

// Mock state for sandbox demo
export const mockState: Record<string, boolean> = {};
export const mockStartedAt: Record<string, string> = {};

export const getVersions = async (type: string = "PAPER") => {
  const normalizedType = type.toUpperCase();
  if (normalizedType === "NODEJS" || normalizedType === "NODE") {
    return ["22", "20", "18"];
  }
  if (normalizedType === "PYTHON" || normalizedType === "PYTHON3") {
    return ["3.12", "3.11", "3.10", "3.9"];
  }
  if (normalizedType === "VELOCITY") {
    return ["latest", "3.3.0-SNAPSHOT"];
  }
  if (normalizedType === "BUNGEECORD" || normalizedType === "WATERFALL") {
    return ["latest"];
  }
  
  return [
    "latest", "1.21.11", "1.21.10", "1.21.9", "1.21.8", "1.21.7", "1.21.6", "1.21.5", "1.21.4", "1.21.3", "1.21.1", "1.21", 
    "1.20.6", "1.20.5", "1.20.4", "1.20.2", "1.20.1", "1.20", 
    "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", 
    "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.15.2", "1.15.1", "1.15", 
    "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14", "1.13.2", "1.13.1", "1.13", "1.12.2", "1.12.1", "1.12", "1.11.2", "1.10.2", 
    "1.9.4", "1.8.8", "1.7.10"
  ];
};

export const createServerContainer = async (serverData: any, nodeId?: string) => {
  const docker = await getDocker(nodeId || serverData.nodeId);
  if (isNodeSandbox(nodeId || serverData.nodeId)) {
    mockState[serverData.id] = false;
    return "mock-container-id-" + serverData.id;
  }

  const serverType = (serverData.type || "PAPER").toUpperCase();
  const isNode = ["NODEJS", "NODE"].includes(serverType);
  const isPython = ["PYTHON", "PYTHON3"].includes(serverType);
  const isGenericApp = isNode || isPython;
  const isProxy = ["VELOCITY", "BUNGEECORD", "WATERFALL"].includes(serverType);
  
  let shortImage = isProxy ? "itzg/bungeecord:latest" : "itzg/minecraft-server:latest";
  let fullImage = isProxy ? "docker.io/itzg/bungeecord:latest" : "docker.io/itzg/minecraft-server:latest";

  if (isNode) {
    const nodeVer = serverData.version || "20";
    shortImage = `node:${nodeVer}-alpine`;
    fullImage = `docker.io/library/node:${nodeVer}-alpine`;
  } else if (isPython) {
    const pyVer = serverData.version || "3.11";
    shortImage = `python:${pyVer}-slim`;
    fullImage = `docker.io/library/python:${pyVer}-slim`;
  }
  
  if (serverData.dockerImage) {
    shortImage = serverData.dockerImage;
    fullImage = serverData.dockerImage;
  }

  const findImageId = async (): Promise<string | null> => {
    try {
      const images = await docker.listImages();
      const matched = images.find(img => 
        img.RepoTags && img.RepoTags.some(tag => tag.includes(shortImage) || tag.includes(fullImage))
      );
      if (matched) return matched.Id;
    } catch(e) {
      console.warn("Failed to list images:", e);
    }
    return null;
  };

  const pullImageStream = async (imgTag: string) => {
    console.log(`Pulling image ${imgTag}...`);
    
    

    const engine = "docker";
    
    try {
      console.log(`Executing: ${engine} pull ${imgTag}`);
      const { stdout, stderr } = await execAsync(`${engine} pull ${imgTag}`);
      console.log(`${engine} pull stdout:`, stdout);
      if (stderr) console.warn(`${engine} pull stderr:`, stderr);
    } catch (cliErr) {
      console.warn(`CLI pull failed for ${imgTag}: ${cliErr}. Trying Docker API fallback...`);
      await new Promise((resolve, reject) => {
        docker.pull(imgTag, (err: any, stream: any) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err: any, output: any) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
      });
    }
  };

  const ensureImage = async (): Promise<string> => {
    let existingId = await findImageId();
    if (existingId) return existingId;

    try {
      await pullImageStream(shortImage);
      let idAfterShort = await findImageId();
      if (idAfterShort) return idAfterShort;
    } catch (e) {
      console.warn(`Failed to pull ${shortImage}...`, e);
    }

    console.warn(`Attempting fallback pull with ${fullImage}...`);
    await pullImageStream(fullImage);
    let idAfterFull = await findImageId();
    if (idAfterFull) return idAfterFull;

    return shortImage; // Fallback to string tag if we somehow couldn't find ID
  };

  const targetImage = await ensureImage();

  const isLocal = (!nodeId || nodeId === "local");
  const serverDir = path.join(process.cwd(), ".data", "servers", serverData.id);
  const hostDataDir = process.env.JTG_HOST_DATA_PATH || path.join(process.cwd(), ".data");
  const hostServerDir = path.join(hostDataDir, "servers", serverData.id);
  const containerBindPath = isLocal ? hostServerDir : `/opt/jtg-panel-node/servers/${serverData.id}`;
  await fs.ensureDir(serverDir);

  let envVars: string[] = [];
  if (isNode) {
    envVars = [
      `PORT=${serverData.port}`,
      `SERVER_PORT=${serverData.port}`,
      `NODE_ENV=production`,
      `MEMORY=${serverData.ram}G`
    ];
  } else if (isPython) {
    envVars = [
      `PORT=${serverData.port}`,
      `SERVER_PORT=${serverData.port}`,
      `PYTHONUNBUFFERED=1`,
      `MEMORY=${serverData.ram}G`
    ];
  } else {
    envVars = [
      `TYPE=${serverType}`,
      `VERSION=${serverData.version}`,
      `MEMORY=${serverData.ram}G`,
      `INIT_MEMORY=128M`,
      `SERVER_PORT=${serverData.port}`,
    ];

    if (!isProxy) {
      envVars.push(
        `EULA=TRUE`,
        `ENABLE_RCON=true`,
        `RCON_PASSWORD=admin`,
        `JVM_OPTS=-DPaper.IgnoreWorldDataVersion=true`,
        `JVM_DD_OPTS=Paper.IgnoreWorldDataVersion=true,paper.ignoreWorldDataVersion=true`
      );
    }
  }

  const buildContainerOptions = (img: string) => {
    let binds = [`${containerBindPath}:${isGenericApp ? '/app' : (isProxy ? '/server' : '/data')}`];
    let workingDir = isGenericApp ? "/app" : undefined;
    let cmd = undefined;

    if (isNode) {
      cmd = ["/bin/sh", "-c", serverData.startupCommand || "if [ -f package.json ]; then npm install --omit=dev && npm start; elif [ -f index.js ]; then node index.js; elif [ -f app.js ]; then node app.js; elif [ -f server.js ]; then node server.js; elif [ -f main.js ]; then node main.js; else echo 'Starting Node.js server...'; node index.js; fi"];
    } else if (isPython) {
      cmd = ["/bin/sh", "-c", serverData.startupCommand || "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; if [ -f main.py ]; then python3 -u main.py; elif [ -f app.py ]; then python3 -u app.py; elif [ -f bot.py ]; then python3 -u bot.py; elif [ -f index.py ]; then python3 -u index.py; elif [ -f server.py ]; then python3 -u server.py; else python3 -u main.py; fi"];
    }
    
    if (serverData.dockerImage && serverData.dockerImage.includes('pterodactyl')) {
      binds = [`${containerBindPath}:/home/container`];
      workingDir = "/home/container";
      if (serverData.startupCommand) {
        cmd = ["/bin/sh", "-c", serverData.startupCommand];
      }
    }
    
    return {
      Image: img,
      name: `jtg-server-${serverData.id}`,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      Env: envVars,
      WorkingDir: workingDir,
      Cmd: cmd,
      ExposedPorts: {
        [`${serverData.port}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${serverData.port}/tcp`]: [
            {
              HostPort: `${serverData.port}`
            }
          ]
        },
        Binds: binds
      }
    };
  };

  let container;
  try {
    container = await docker.createContainer(buildContainerOptions(targetImage));
  } catch (err: any) {
    const errStr = String(err?.message || err);
    if (err?.statusCode === 404 || errStr.includes("404") || errStr.includes("no such image")) {
      const altImage = targetImage === shortImage ? fullImage : shortImage;
      console.log(`404 image error with ${targetImage}. Attempting fallback with ${altImage}...`);
      try {
        await pullImageStream(altImage);
        container = await docker.createContainer(buildContainerOptions(altImage));
      } catch (fallbackErr) {
        console.log(`Pulling ${targetImage} directly and retrying...`);
        await pullImageStream(targetImage);
        container = await docker.createContainer(buildContainerOptions(targetImage));
      }
    } else {
      throw err;
    }
  }

  return container.id;
};

export const startContainer = async (containerId: string, nodeId?: string) => { console.log(`[startContainer] id=${containerId}, nodeId=${nodeId}`);
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = true;
    mockStartedAt[id] = new Date().toISOString();
    
    // In sandbox mode, mock the generation of server files that the docker container would normally do
    try {
      const servers = await readJSON("servers.json") || [];
      const server = servers.find((s: any) => s.id === id);
      if (server) {
        const serverDir = path.join(process.cwd(), ".data", "servers", id);
        await fs.ensureDir(serverDir);
        const type = (server.type || "PAPER").toUpperCase();
        
        if (["NODEJS", "NODE"].includes(type)) {
          const indexPath = path.join(serverDir, "index.js");
          const pkgPath = path.join(serverDir, "package.json");
          if (!fs.existsSync(indexPath)) {
            await fs.writeFile(indexPath, `// Node.js Application on JTG Panel\nconst http = require('http');\nconst port = process.env.PORT || process.env.SERVER_PORT || ${server.port || 3000};\n\nconsole.log('==============================================');\nconsole.log('🚀 Node.js Application Running on port ' + port);\nconsole.log('Node Version: ' + process.version);\nconsole.log('Upload your files in File Manager to customize!');\nconsole.log('==============================================');\n\nconst app = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'online', runtime: 'node.js', time: new Date().toISOString() }));\n});\n\napp.listen(port, '0.0.0.0', () => {\n  console.log(\`[Server] Listening on http://0.0.0.0:\${port}\`);\n});\n`);
          }
          if (!fs.existsSync(pkgPath)) {
            await fs.writeFile(pkgPath, JSON.stringify({
              name: (server.name || "node-app").toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
              version: "1.0.0",
              description: "Node.js app on JTG Panel",
              main: "index.js",
              scripts: { "start": "node index.js" }
            }, null, 2));
          }
          panelEvents.emit("log", id, `[Node.js] Starting node index.js on port ${server.port}...\r\n[Node.js] Node.js Application active\r\n`);
          return;
        } else if (["PYTHON", "PYTHON3"].includes(type)) {
          const mainPath = path.join(serverDir, "main.py");
          const reqPath = path.join(serverDir, "requirements.txt");
          if (!fs.existsSync(mainPath)) {
            await fs.writeFile(mainPath, `# Python Application on JTG Panel\nimport os\nimport sys\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\n\nport = int(os.environ.get("SERVER_PORT", os.environ.get("PORT", ${server.port || 8000})))\nprint("==============================================", flush=True)\nprint("🐍 Python Application Running", flush=True)\nprint(f"Python Version: {sys.version}", flush=True)\nprint(f"Listening Port: {port}", flush=True)\nprint("Upload your files in File Manager to customize!", flush=True)\nprint("==============================================", flush=True)\n\nclass RequestHandler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header('Content-type', 'application/json')\n        self.end_headers()\n        self.wfile.write(b'{"status": "online", "runtime": "python"}')\n\n    def log_message(self, format, *args):\n        print(f"[{self.log_date_time_string()}] {format % args}", flush=True)\n\nserver = HTTPServer(('0.0.0.0', port), RequestHandler)\nprint(f"[Server] Listening on http://0.0.0.0:{port}", flush=True)\ntry:\n    server.serve_forever()\nexcept KeyboardInterrupt:\n    print("\\nStopping server...", flush=True)\n    server.server_close()\n`);
          }
          if (!fs.existsSync(reqPath)) {
            await fs.writeFile(reqPath, "# Python dependencies\n");
          }
          panelEvents.emit("log", id, `[Python] Starting python3 -u main.py on port ${server.port}...\r\n[Python] Python Application active\r\n`);
          return;
        } else if (["VELOCITY", "BUNGEECORD", "WATERFALL"].includes(type)) {
          const configName = type === "VELOCITY" ? "velocity.toml" : "config.yml";
          const configPath = path.join(serverDir, configName);
          if (!fs.existsSync(configPath)) {
            await fs.writeFile(configPath, "# Autogenerated proxy config in sandbox mode\n# Port: " + server.port + "\n");
          }
        } else {
          const propsPath = path.join(serverDir, "server.properties");
          if (!fs.existsSync(propsPath)) {
            await fs.writeFile(propsPath, "server-port=" + server.port + "\nmotd=A Minecraft Server\n");
          }
        }
      }
    } catch(e) {}
    
    panelEvents.emit("log", id, `[System] Server started (Sandbox Mode).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.start();
};

export const stopContainer = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = false;
    delete mockStartedAt[id];
    panelEvents.emit("log", id, `[System] Server stopped (Sandbox Mode).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.stop();
};

export const killContainer = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = false;
    delete mockStartedAt[id];
    panelEvents.emit("log", id, `[System] Server forcefully killed (SIGKILL).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.kill();
  panelEvents.emit("log", containerId, `[System] Container forcefully killed.\r\n`);
};

export const restartContainer = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = true;
    mockStartedAt[id] = new Date().toISOString();
    panelEvents.emit("log", id, `[System] Server restarted (Sandbox Mode).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.restart();
  const info = await container.inspect();
  if (!info.State.Running) {
    let logs = "";
    try {
      const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 50 });
      logs = logsBuffer.toString('utf8');
    } catch (e) {}
    throw new Error(`Container exited immediately after restart. ExitCode: ${info.State.ExitCode}. Logs: ${logs.trim() || 'No logs'}`);
  }
};

export const deleteContainer = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    delete mockState[id];
    delete mockStartedAt[id];
    return;
  }
  const container = docker.getContainer(containerId);
  try {
    const info = await container.inspect();
    if (info.State.Running) {
      await container.stop();
    }
    await container.remove({ force: true });
  } catch (err) {
    console.error("Error deleting container", err);
  }
};

export const getContainerStatus = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    const isRunning = mockState[id] || false;
    return { State: { Running: isRunning, Status: isRunning ? "running" : "exited", StartedAt: isRunning ? (mockStartedAt[id] || new Date().toISOString()) : null } };
  }
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info;
  } catch (e) {
    return null;
  }
};

export const getContainerStats = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    const id = containerId.replace("mock-container-id-", "");
    if (!mockState[id]) return { cpu: 0, ram: 0, disk: 0 };
    
    // Stable pseudo-random mock stats based on time so it fluctuates realistically
    const timeSec = Math.floor(Date.now() / 5000);
    const floatPseudo = (Math.sin(timeSec + id.charCodeAt(0)) + 1) / 2; // 0 to 1
    
    return {
      cpu: floatPseudo * 10 + 2, // 2% to 12%
      ram: 600 + (floatPseudo * 50 - 25), // ~600 MB
      disk: 2.1
    };
  }
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    if (!info.State.Running) {
      return { cpu: 0, ram: 0, disk: 0 };
    }
    const statsResult = await container.stats({ stream: false });
    
    let cpuPercent = 0.0;
    try {
      const cpuDelta = statsResult.cpu_stats.cpu_usage.total_usage - statsResult.precpu_stats.cpu_usage.total_usage;
      const systemDelta = statsResult.cpu_stats.system_cpu_usage - statsResult.precpu_stats.system_cpu_usage;
      if (systemDelta > 0.0 && cpuDelta > 0.0) {
        const cpus = statsResult.cpu_stats.online_cpus || statsResult.cpu_stats.cpu_usage.percpu_usage?.length || 1;
        cpuPercent = (cpuDelta / systemDelta) * cpus * 100.0;
      }
    } catch(e) {}

    let ramMB = 0.0;
    try {
      const stats = statsResult.memory_stats.stats as any || {};
      const cache = stats.cache || stats.inactive_file || stats.total_inactive_file || 0;
      const usedMemory = statsResult.memory_stats.usage - cache;
      ramMB = usedMemory / 1024 / 1024;
    } catch(e) {}

    // Roughly calculate disk size from the volume directory if possible, or provide a default for now.
    return {
      cpu: cpuPercent,
      ram: ramMB,
      disk: 2.1
    };
  } catch (e) {
    return { cpu: 0, ram: 0, disk: 0 };
  }
};

export const getContainerLogs = async (containerId: string, nodeId?: string): Promise<string> => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) return "[System] Sandbox mode. No historical logs available.\r\n";
  try {
    const container = docker.getContainer(containerId);
    
    // Convert Buffer log output to string safely. dockerode returns interleaved multiplexed streams if tty is false,
    // but we use tty: true in createServerContainer, so it's a raw stream buffer.
    const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 100 });
    return logsBuffer.toString('utf8');
  } catch (e) {
    return "";
  }
};

const activeStreams: Record<string, NodeJS.ReadWriteStream> = {};

export const attachContainerSocket = async (containerId: string, serverId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isNodeSandbox(nodeId)) {
    return;
  }
  try {
    const container = docker.getContainer(containerId);
    if (!activeStreams[containerId]) {
      const stream = await container.attach({ stream: true, stdout: true, stderr: true, stdin: true });
      activeStreams[containerId] = stream;
      stream.on('data', (chunk: any) => {
        panelEvents.emit("log", serverId, chunk.toString());
      });
      stream.on('end', () => {
        delete activeStreams[containerId];
      });
    }
  } catch(e) {
    console.error("Attach error", e);
  }
};

export const sendContainerCommand = async (containerId: string, command: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);

  if (isNodeSandbox(nodeId)) {
    // Handled by client local echo
    return;
  }
  if (activeStreams[containerId]) {
    activeStreams[containerId].write(command + "\n");
  } else {
    try {
      const container = docker.getContainer(containerId);
      const stream = await container.attach({ stream: true, stdout: true, stderr: true, stdin: true });
      activeStreams[containerId] = stream;
      stream.write(command + "\n");
      stream.on('data', (chunk: any) => {
        // Will be broadcasted due to existing or new attach
      });
    } catch(e) {
       console.error("Command error", e);
    }
  }
};
