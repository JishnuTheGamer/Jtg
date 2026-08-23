import { Request, Response } from "express";
import { readJSON, writeJSON } from "../services/db.js";
import {
  createServerRuntime,
  startServerRuntime,
  stopServerRuntime,
  restartServerRuntime,
  deleteServerRuntime,
  getServerRuntimeStatus,
  getServerRuntimeStats,
  getServerRuntimeLogs,
  sendServerRuntimeCommand,
  attachServerRuntimeSocket
} from "../services/runtime.js";
import { getLocalProcessInfo } from "../services/local.js";
import { getTrackedOnlinePlayers } from "../services/playitHealth.js";
import { createSftpUser, deleteSftpUser } from "../services/sftp.js";
import { downloadJar } from "../services/jarDownloader.js";
import { getJavaVersionForMinecraft, getDataVersionForMinecraft, getWorldDataVersion } from "../services/minecraft.js";
import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
import { ZipArchive } from "archiver";
import extract from "extract-zip";
import { extractArchive } from "../utils/extract.js";
import { getServerDiskUsageGB } from "../services/metrics.js";
import { ServerResourceStats, ServerMetricSource, ServerMemoryStats, ServerCpuStats, ServerDiskStats } from "../../types/stats.js";
import {
  secureDirectoryPermissions,
  secureFilePermissions,
  secureExecutablePermissions,
  secureChmod
} from "../utils/permissions.js";

export const getServers = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  
  // Filter for normal users
  const userServers = user.role === "admin" || user.role === "owner" ? servers : servers.filter((s: any) => s.owner === user.id);

  // Update statuses
  const updatedServers = await Promise.all(userServers.map(async (server: any) => {
    if (server.containerId) {
      const status = await getServerRuntimeStatus(server);
      const isRunning = !!status?.State?.Running;
      server.status = isRunning ? "online" : "offline";
      server.startedAt = isRunning ? (status?.State?.StartedAt || server.startedAt || new Date().toISOString()) : null;
      if (server.runtimeType === 'local') {
          const info = getLocalProcessInfo(server.id);
          if (info) {
              server.pid = info.pid;
              server.jarPath = info.jarPath;
              server.logPath = info.logPath;
          }
      }
    }
    return server;
  }));

  res.json(updatedServers);
};

export const getServer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const status = await getServerRuntimeStatus(server);
  const isRunning = !!status?.State?.Running;
  server.status = isRunning ? "online" : "offline";
  server.startedAt = isRunning ? (status?.State?.StartedAt || server.startedAt || new Date().toISOString()) : null;
  if (server.runtimeType === 'local') {
      const info = getLocalProcessInfo(server.id);
      if (info) {
          server.pid = info.pid;
          server.jarPath = info.jarPath;
          server.logPath = info.logPath;
      }
  }
  res.json(server);
};

export const getServerPlayers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = (await readJSON("servers.json")) || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const players = getTrackedOnlinePlayers(id) || [];
  res.json(players.map((name) => ({ name, joinedAt: null })));
};

export const getServerStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = (await readJSON("servers.json")) || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const status = await getServerRuntimeStatus(server);
  const isRunning = !!status?.State?.Running;
  const startedAt = isRunning ? (status?.State?.StartedAt || server.startedAt || null) : null;
  let uptimeSeconds = 0;
  if (isRunning && startedAt) {
    const startedMs = new Date(startedAt).getTime();
    if (!isNaN(startedMs) && startedMs > 0) {
      uptimeSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    }
  }

  const diskUsageGB = await getServerDiskUsageGB(server.id);
  const diskUsedBytes = Math.round(diskUsageGB * 1024 * 1024 * 1024);
  const ramGB = typeof server.ram === "number" && server.ram > 0 ? server.ram : 2;
  const configuredLimitBytes = Math.round(ramGB * 1024 * 1024 * 1024);
  const configuredLimitMB = Math.round(ramGB * 1024);
  const configuredDiskLimitGB = typeof server.disk === "number" && server.disk > 0 ? server.disk : 10;
  const configuredDiskLimitBytes = Math.round(configuredDiskLimitGB * 1024 * 1024 * 1024);
  const configuredCpuLimit = typeof server.cpu === "number" && server.cpu > 0 ? server.cpu : 100;

  const collectedAt = new Date().toISOString();
  let runtimeStats: any = null;
  if (isRunning && (server.containerId || server.runtimeType === "local")) {
    try {
      runtimeStats = await getServerRuntimeStats(server);
    } catch {}
  }

  const defaultSource: ServerMetricSource =
    server.runtimeType === "local"
      ? (server.type === "nodejs" || server.type === "node" || server.type === "python" ? "local-process" : "local-java-process")
      : "docker-container";

  const source: ServerMetricSource = isRunning ? (runtimeStats?.source || defaultSource) : "unavailable";

  const memStats: ServerMemoryStats = runtimeStats?.memory || {
    usedBytes: isRunning ? Math.round((runtimeStats?.ram || 0) * 1024 * 1024) : 0,
    limitBytes: configuredLimitBytes,
    cacheBytes: 0,
    rawUsageBytes: isRunning ? Math.round((runtimeStats?.ram || 0) * 1024 * 1024) : 0,
    overLimit: false,
    includesHostMemory: false
  };

  // Enforce configured server limit on memory stats
  memStats.limitBytes = configuredLimitBytes;
  memStats.overLimit = memStats.usedBytes > configuredLimitBytes;
  memStats.includesHostMemory = false;

  const cpuPercent = isRunning ? (typeof runtimeStats?.cpu === "number" ? runtimeStats.cpu : 0) : 0;
  const cpuStats: ServerCpuStats = {
    percent: cpuPercent,
    includesHostCpu: false
  };

  const diskStats: ServerDiskStats = {
    usedBytes: diskUsedBytes,
    limitBytes: configuredDiskLimitBytes
  };

  const networkStats = runtimeStats?.network || {
    rxBytes: 0,
    txBytes: 0
  };

  const responseData: ServerResourceStats = {
    serverId: server.id,
    status: isRunning ? "running" : "offline",
    source,
    collectedAt,
    memory: memStats,
    cpuStats,
    diskStats,
    network: networkStats,

    // Backward-compatible flat properties:
    cpu: cpuPercent,
    ram: Math.round(memStats.usedBytes / (1024 * 1024)),
    disk: diskUsageGB,
    isRunning,
    startedAt,
    uptimeSeconds,
    limitRam: configuredLimitMB,
    limitCpu: configuredCpuLimit,
    limitDisk: configuredDiskLimitGB
  };

  res.json(responseData);
};

export const checkPort = async (req: Request, res: Response) => {
  const { port } = req.query;
  if (!port) return res.status(400).json({ error: "Port is required" });
  
  const servers = await readJSON("servers.json") || [];
  const inUse = servers.some((s: any) => s.port == port);
  
  res.json({ inUse });
};

// Resource-scoped locks to prevent race conditions on server creation per-port and per-user
const activePortLocks = new Set<number>();
const activeUserLocks = new Set<string>();

export const createServer = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") {
    return res.status(403).json({ error: "Only admins can create servers" });
  }
  const { name, ram, port, version, theme, cpu, disk, owner, ownerId, ipAlias, type, nodeId, runtimeType, javaVersion, dockerImage, serverJar, startupCommand } = req.body;
  if (!name || !ram || !port) {
    res.status(400).json({ error: "Missing required fields (name, ram, port)" });
    return;
  }

  const numericPort = parseInt(String(port), 10);
  if (isNaN(numericPort) || numericPort < 1 || numericPort > 65535) {
    return res.status(400).json({ error: "Invalid port number. Port must be between 1 and 65535." });
  }

  if (activePortLocks.has(numericPort)) {
    return res.status(409).json({ error: `Server creation for port ${numericPort} is currently in progress. Please try again in a few seconds.` });
  }

  if (activeUserLocks.has(user.id)) {
    return res.status(409).json({ error: "You already have a server creation in progress. Please wait for it to complete." });
  }

  activePortLocks.add(numericPort);
  activeUserLocks.add(user.id);

  try {
    const settings = await readJSON("settings.json") || {};
    const isDev = process.env.NODE_ENV === "development" || 
                  process.env.PORT === "30000" || 
                  process.env.PANEL_DEV_MODE === "true" ||
                  process.env.DEV_MODE === "true";
    const defaultRuntime = settings.defaultRuntime || process.env.DEFAULT_RUNTIME || "docker";
    const finalRuntimeType = (isDev && runtimeType) ? runtimeType : defaultRuntime;

    const id = crypto.randomUUID();
    const finalType = type || "PAPER";
    const finalVersion = version || "latest";
    const resolvedJavaVersion = javaVersion || (
      ["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(finalType.toUpperCase()) ? "" : getJavaVersionForMinecraft(finalVersion, finalType)
    );

    // Enforce owner assignment: only admins can assign to another user, otherwise defaults strictly to user.id
    const isAdmin = user.role === "admin" || user.role === "owner";
    const assignedOwner = isAdmin ? (owner || ownerId || user.id) : user.id;

    const serverData = {
      id,
      name,
      owner: assignedOwner,
      ram,
      cpu: cpu || 100,
      disk: disk || 10,
      port: numericPort,
      ipAlias: ipAlias || "",
      runtimeType: finalRuntimeType,
      nodeId: nodeId || "local",
      type: finalType,
      version: finalVersion,
      javaVersion: resolvedJavaVersion,
      dockerImage: dockerImage || "",
      serverJar: serverJar || "server.jar",
      startupCommand: startupCommand || "",
      theme: theme || "default",
      status: "installing",
      createdAt: new Date().toISOString(),
      containerId: null as string | null,
    };

    const servers = await readJSON("servers.json") || [];
    
    if (servers.find((s: any) => s.port == numericPort)) {
      res.status(400).json({ error: "Port is already in use by another server." });
      return;
    }

    servers.push(serverData);
    await writeJSON("servers.json", servers);

    // Pre-seed files for Node.js and Python applications
    try {
      const serverDir = path.join(process.cwd(), ".data", "servers", id);
      await fs.ensureDir(serverDir);
      const upperType = (type || "PAPER").toUpperCase();
      if (upperType === "NODEJS" || upperType === "NODE") {
        const indexPath = path.join(serverDir, "index.js");
        const pkgPath = path.join(serverDir, "package.json");
        if (!fs.existsSync(indexPath)) {
          await fs.writeFile(indexPath, `// Node.js Application on JTG Panel\nconst http = require('http');\nconst port = process.env.PORT || process.env.SERVER_PORT || ${numericPort};\n\nconsole.log('==============================================');\nconsole.log('🚀 Node.js Application Running on port ' + port);\nconsole.log('Node Version: ' + process.version);\nconsole.log('Upload your files in File Manager to customize!');\nconsole.log('==============================================');\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({\n    status: 'online',\n    runtime: 'node.js',\n    time: new Date().toISOString()\n  }));\n});\n\nserver.listen(port, '0.0.0.0', () => {\n  console.log(\`[Server] Listening on http://0.0.0.0:\${port}\`);\n});\n`);
        }
        if (!fs.existsSync(pkgPath)) {
          await fs.writeFile(pkgPath, JSON.stringify({
            name: name.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || "node-app",
            version: "1.0.0",
            description: "Node.js application hosted on JTG Panel",
            main: "index.js",
            scripts: {
              "start": "node index.js"
            },
            dependencies: {}
          }, null, 2));
        }
      } else if (upperType === "PYTHON" || upperType === "PYTHON3") {
        const mainPath = path.join(serverDir, "main.py");
        const reqPath = path.join(serverDir, "requirements.txt");
        if (!fs.existsSync(mainPath)) {
          await fs.writeFile(mainPath, `# Python Application on JTG Panel\nimport os\nimport sys\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\n\nport = int(os.environ.get("SERVER_PORT", os.environ.get("PORT", ${numericPort})))\n\nprint("==============================================", flush=True)\nprint("🐍 Python Application Running", flush=True)\nprint(f"Python Version: {sys.version}", flush=True)\nprint(f"Listening Port: {port}", flush=True)\nprint("Upload your files in File Manager to customize!", flush=True)\nprint("==============================================", flush=True)\n\nclass RequestHandler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header('Content-type', 'application/json')\n        self.end_headers()\n        self.wfile.write(b'{"status": "online", "runtime": "python"}')\n\n    def log_message(self, format, *args):\n        print(f"[{self.log_date_time_string()}] {format % args}", flush=True)\n\nserver = HTTPServer(('0.0.0.0', port), RequestHandler)\nprint(f"[Server] Listening on http://0.0.0.0:{port}", flush=True)\n\ntry:\n    server.serve_forever()\nexcept KeyboardInterrupt:\n    print("\\nStopping server...", flush=True)\n    server.server_close()\n`);
        }
        if (!fs.existsSync(reqPath)) {
          await fs.writeFile(reqPath, "# Add python dependencies here\n");
        }
      } else {
        // Minecraft / Proxy servers
        const eulaPath = path.join(serverDir, "eula.txt");
        if (!fs.existsSync(eulaPath)) {
          await fs.writeFile(eulaPath, "eula=true\n");
        }
        const propsPath = path.join(serverDir, "server.properties");
        if (!fs.existsSync(propsPath)) {
          await fs.writeFile(propsPath, `server-port=${numericPort}\nmotd=${name || "A Minecraft Server"}\n`);
        }
        const jarPath = path.join(serverDir, "server.jar");
        if (!fs.existsSync(jarPath)) {
          console.log(`[createServer] Initiating JAR download for ${type || "PAPER"} (${version || "latest"})...`);
          downloadJar(type || "PAPER", version || "latest", jarPath).catch(err => {
            console.warn("[createServer] Initial JAR download notice:", err?.message || err);
          });
        }
        await secureDirectoryPermissions(serverDir);
      }
    } catch (seedErr) {
      console.warn("Failed to pre-seed starter files:", seedErr);
    }

    try {
      const containerId = await createServerRuntime(serverData);
      serverData.containerId = containerId;
      serverData.status = "offline";
      await writeJSON("servers.json", Object.assign(servers, servers.map((s:any)=>s.id===id?serverData:s)));
      await createSftpUser(id).catch(e => console.error("SFTP user creation failed:", e));
      res.json(serverData);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  } finally {
    activePortLocks.delete(numericPort);
    activeUserLocks.delete(user.id);
  }
};

export const updateOwner = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") {
    return res.status(403).json({ error: "Only admins can update owner" });
  }

  const { id } = req.params;
  const { owner } = req.body;

  if (!owner) return res.status(400).json({ error: "Owner required" });

  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);

  if (!server) return res.status(404).json({ error: "Server not found" });

  server.owner = owner;
  await writeJSON("servers.json", servers);
  
  res.json({ success: true });
};

export const updateIpAlias = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { ipAlias } = req.body;

  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);

  if (!server) return res.status(404).json({ error: "Server not found" });

  if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  server.ipAlias = ipAlias;
  await writeJSON("servers.json", servers);
  
  res.json({ success: true });
};

export const deleteServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    let servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (user.role !== "admin" && user.role !== "owner") {
      return res.status(403).json({ error: "Only admins can delete servers" });
    }

    if (server.containerId) {
      await deleteServerRuntime(server);
    }
    
    servers = servers.filter((s: any) => s.id !== id);
    await writeJSON("servers.json", servers);
    
    // Remove files
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    try {
      await fs.remove(serverDir);
    } catch (e) {
      console.error("Failed to remove server directory", e);
    }
    
    await deleteSftpUser(id).catch(e => console.error("SFTP user deletion failed:", e));
    
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const startServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Not found" });
    }

    if (!server.containerId) {
      server.containerId = await createServerRuntime(server);
      await writeJSON("servers.json", servers);
    }

    if (server.suspended) {
      return res.status(403).json({ error: "Server is suspended" });
    }
    
    // PRE-FLIGHT CHECKS
    try {
      const serverDir = path.join(process.cwd(), ".data", "servers", server.id);
      await fs.ensureDir(serverDir);
      await secureDirectoryPermissions(serverDir);
      
      const targetType = (server.type || "PAPER").toUpperCase();
      const isGeneric = ["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(targetType);
      
      if (!isGeneric) {
        const jarPath = path.join(serverDir, "server.jar");
        if (!fs.existsSync(jarPath)) {
          const { panelEvents } = await import("../events.js");
          panelEvents.emit("log", id, `[JTG System] Pre-flight: server.jar not found. Downloading ${server.type} (${server.version || "latest"})...\r\n`);
          try {
            await downloadJar(server.type, server.version || "latest", jarPath);
            panelEvents.emit("log", id, `[JTG System] server.jar downloaded successfully.\r\n`);
          } catch (dlErr: any) {
            panelEvents.emit("log", id, `[JTG System] Notice: Automatic JAR download error: ${dlErr?.message || dlErr}\r\n`);
          }
        }
        const eulaPath = path.join(serverDir, "eula.txt");
        if (!fs.existsSync(eulaPath)) {
          await fs.writeFile(eulaPath, "eula=true\n");
        }
        const propsPath = path.join(serverDir, "server.properties");
        if (!fs.existsSync(propsPath)) {
          await fs.writeFile(propsPath, `server-port=${server.port}\nmotd=${server.name || "A Minecraft Server"}\n`);
        }
        await secureFilePermissions(eulaPath);
        await secureFilePermissions(propsPath);
        if (fs.existsSync(jarPath)) {
          await secureExecutablePermissions(jarPath);
        }
      }
      
      // 1. Check for stale session locks and remove them if server is stopped
      const lockFiles = [
        path.join(serverDir, "world", "session.lock"),
        path.join(serverDir, "world_nether", "session.lock"),
        path.join(serverDir, "world_the_end", "session.lock")
      ];
      for (const lockFile of lockFiles) {
        if (fs.existsSync(lockFile)) {
          try {
            await fs.remove(lockFile);
          } catch (e) {
            return res.status(500).json({ error: `Startup Diagnostic Failed: Permission denied when removing stale ${lockFile}` });
          }
        }
      }
      
      // 2. Check permissions on world folder and verify DataVersion compatibility
      const worldPath = path.join(serverDir, "world");
      if (fs.existsSync(worldPath)) {
        try {
          await fs.access(worldPath, fs.constants.R_OK | fs.constants.W_OK);
        } catch (e) {
          return res.status(500).json({ error: "Startup Diagnostic Failed: Permission denied on world folder." });
        }

        const targetType = (server.type || "PAPER").toUpperCase();
        const isMinecraft = !["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(targetType);
        if (isMinecraft) {
          const worldDataVersion = await getWorldDataVersion(serverDir);
          if (worldDataVersion) {
            const serverDataVersion = getDataVersionForMinecraft(server.version || "latest");
            if (worldDataVersion > serverDataVersion) {
              if (server.ignoreWorldDataVersion !== true) {
                return res.status(400).json({
                  error: `Startup blocked: World version mismatch detected. The world DataVersion (${worldDataVersion}) is newer than the server software version (${server.version || "latest"}, DataVersion ${serverDataVersion}). Starting the server may corrupt chunk and entity data. To force start, please create a backup of your world and enable 'Bypass World DataVersion Safety Check' in Server Settings.`
                });
              } else {
                console.warn(`[SAFETY AUDIT] Starting server '${server.name}' (${server.id}) with Paper.IgnoreWorldDataVersion=true bypass. Enabled by admin: '${server.ignoreWorldDataVersionAdmin || "admin"}'`);
              }
            }
          }
        }
      }
    } catch (preflightErr) {
      console.error(preflightErr);
    }


    try {
      const io = req.app.get("io");
      if (io) io.to(`server_${id}`).emit("clear_logs");
      
      await startServerRuntime(server);
      server.status = "online";
      server.startedAt = new Date().toISOString();
      await writeJSON("servers.json", servers);
    } catch (startErr: any) {
      if (startErr.statusCode === 404 || (startErr.message && startErr.message.toLowerCase().includes("no such container"))) {
        console.log(`Container missing for server ${server.id}. Recreating...`);
        server.containerId = await createServerRuntime(server);
        await startServerRuntime(server);
        server.status = "online";
        server.startedAt = new Date().toISOString();
        await writeJSON("servers.json", servers);
      } else {
        throw startErr;
      }
    }
    await attachServerRuntimeSocket(server, server.id);
    res.json({ success: true, startedAt: server.startedAt });
  } catch (err: any) {
    console.error("Start server error:", err);
    res.status(500).json({ error: err.message || "Failed to start server" });
  }
};

export const stopServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    try {
      await stopServerRuntime(server);
    } catch (stopErr: any) {
      if (stopErr.statusCode === 404 || (stopErr.message && stopErr.message.toLowerCase().includes("no such container"))) {
        console.log(`Container already missing for server ${server.id}. Assuming stopped.`);
      } else {
        console.warn(`Stop error for ${server.id}, marking offline:`, stopErr.message || stopErr);
      }
    }
    server.status = "offline";
    server.startedAt = null;
    await writeJSON("servers.json", servers);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Stop server error:", err);
    res.status(500).json({ error: err.message || "Failed to stop server" });
  }
};

export const restartServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    try {
      const io = req.app.get("io");
      if (io) io.to(`server_${id}`).emit("clear_logs");

      await restartServerRuntime(server);
      server.status = "online";
      server.startedAt = new Date().toISOString();
      await writeJSON("servers.json", servers);
    } catch (startErr: any) {
      if (server.runtimeType !== "local" && (startErr.statusCode === 404 || (startErr.message && startErr.message.toLowerCase().includes("no such container")))) {
        console.log(`Container missing for server ${server.id}. Recreating...`);
        server.containerId = await createServerRuntime(server);
        await startServerRuntime(server);
        server.status = "online";
        server.startedAt = new Date().toISOString();
        await writeJSON("servers.json", servers);
      } else {
        throw startErr;
      }
    }
    await attachServerRuntimeSocket(server, server.id);
    res.json({ success: true, startedAt: server.startedAt });
  } catch (err: any) {
    console.error("Restart server error:", err);
    res.status(500).json({ error: err.message || "Failed to restart server" });
  }
};

export const sendCommand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    await sendServerRuntimeCommand(server, command);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Command error:", err);
    res.status(500).json({ error: err.message || "Failed to send command" });
  }
};

export const getServerLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    const logs = await getServerRuntimeLogs(server);
    res.json({ logs: logs || "" });
  } catch (err: any) {
    console.error("Logs fetch error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch logs", logs: "" });
  }
};

export const changeServerVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version, type, javaVersion, dockerImage, startupCommand, serverJar, ignoreWorldDataVersion } = req.body;
    const user = (req as any).user;
    
    let servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const newVersion = version || server.version;
    if (!newVersion) return res.status(400).json({ error: "Version is required" });

    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can change version or runtime" });
    }

    if (ignoreWorldDataVersion !== undefined) {
      if (ignoreWorldDataVersion === true) {
        if (user.role !== "admin" && user.role !== "owner") {
          return res.status(403).json({ error: "Only administrators can enable the Paper.IgnoreWorldDataVersion safety bypass." });
        }
        server.ignoreWorldDataVersion = true;
        server.ignoreWorldDataVersionAdmin = user.username || user.id;
        console.warn(`[SAFETY AUDIT] User '${user.username || user.id}' enabled Paper.IgnoreWorldDataVersion safety bypass on server '${server.name}' (${server.id})`);
      } else {
        server.ignoreWorldDataVersion = false;
        delete server.ignoreWorldDataVersionAdmin;
      }
    }

    const status = await getServerRuntimeStatus(server).catch(() => null);
    if (status?.State?.Running || server.status === "running") {
      return res.status(400).json({ error: "Server must be stopped before changing runtime or version. Please stop the server first." });
    }

    if (server.containerId) {
      // Delete old container
      await deleteServerRuntime(server).catch(() => {});
    }
    
    const typeChanged = type && type !== server.type;
    const versionChanged = version && version !== server.version;

    // 1. Create an automatic pre-version-change backup snapshot to protect world and config data
    if (typeChanged || versionChanged) {
      try {
        const serverDir = path.join(process.cwd(), ".data", "servers", id);
        const backupsDir = path.join(process.cwd(), ".data", "backups", id);
        await fs.ensureDir(backupsDir);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFileName = `auto_backup_pre_version_${(server.version || "prev").replace(/[^a-zA-Z0-9.-]/g, "_")}_${timestamp}.zip`;
        const backupFilePath = path.join(backupsDir, backupFileName);

        const output = fs.createWriteStream(backupFilePath);
        const archive = new ZipArchive({ zlib: { level: 6 } });

        archive.pipe(output);
        archive.glob("**/*", {
          cwd: serverDir,
          ignore: ["**/*.tmp*", "**/*.log", "logs/**", "cache/**", ".cache/**"]
        });
        await archive.finalize();
        console.log(`[changeServerVersion] Created safety backup before version change: ${backupFileName}`);
      } catch (backupErr) {
        console.warn("[changeServerVersion] Safety backup creation notice:", backupErr);
      }
    }

    // 2. Automatically delete obsolete/incompatible config files to avoid issues when switching versions/types
    if (typeChanged || versionChanged) {
      const serverDir = path.join(process.cwd(), ".data", "servers", id);
      const filesToDelete = [
        "paper-global.yml", "paper-world-defaults.yml", "paper.yml",
        "config/paper-global.yml", "config/paper-world-defaults.yml",
        "world/data/random_sequences.dat"
      ];
      
      for (const file of filesToDelete) {
        const filePath = path.join(serverDir, file);
        try {
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
        } catch (e) {
          console.error(`Failed to delete ${file}`, e);
        }
      }
    }
    
    server.version = newVersion;
    if (type) {
      server.type = type;
    }
    if (javaVersion !== undefined && javaVersion !== "" && javaVersion !== "auto") {
      server.javaVersion = javaVersion;
    } else {
      server.javaVersion = getJavaVersionForMinecraft(server.version, server.type);
    }

    if (dockerImage !== undefined) {
      server.dockerImage = dockerImage;
    }
    if (server.dockerImage && server.dockerImage.includes("itzg/minecraft-server")) {
      const neededTag = `java${server.javaVersion || "25"}`;
      if (!server.dockerImage.includes(neededTag)) {
        server.dockerImage = `itzg/minecraft-server:${neededTag}`;
      }
    }
    if (startupCommand !== undefined) {
      server.startupCommand = startupCommand;
    }
    if (serverJar !== undefined) {
      server.serverJar = serverJar;
    }

    // 3. Auto-download new version JAR if it's a Minecraft / proxy server and type or version changed
    const targetType = (server.type || "PAPER").toUpperCase();
    const isGeneric = ["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(targetType);
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    await fs.ensureDir(serverDir);
    await secureDirectoryPermissions(serverDir);

    if (!isGeneric && (typeChanged || versionChanged)) {
      const jarPath = path.join(serverDir, server.serverJar || "server.jar");
      const { panelEvents } = await import("../events.js");
      panelEvents.emit("log", id, `[JTG System] Updating server software to ${server.type} (${server.version})...\r\n`);
      panelEvents.emit("log", id, `[JTG System] Downloading ${server.type} server JAR...\r\n`);
      try {
        await downloadJar(server.type, server.version, jarPath);
        await secureExecutablePermissions(jarPath);
        panelEvents.emit("log", id, `[JTG System] Server JAR downloaded and verified successfully.\r\n`);
      } catch (dlErr: any) {
        panelEvents.emit("log", id, `[JTG System] Warning: Automated JAR download returned: ${dlErr.message}\r\n`);
        console.warn("[changeServerVersion] Failed to download new jar:", dlErr);
      }

      // Ensure eula.txt and server.properties exist
      const eulaPath = path.join(serverDir, "eula.txt");
      if (!fs.existsSync(eulaPath)) {
        await fs.writeFile(eulaPath, "eula=true\n");
      }
      const propsPath = path.join(serverDir, "server.properties");
      if (!fs.existsSync(propsPath)) {
        await fs.writeFile(propsPath, `server-port=${server.port}\nmotd=${server.name || "A Minecraft Server"}\n`);
      }
      await secureFilePermissions(eulaPath);
      await secureFilePermissions(propsPath);
    }

    // 4. Recreate runtime/container with new version and java environment
    const newContainerId = await createServerRuntime(server);
    server.containerId = newContainerId;
    
    await writeJSON("servers.json", servers);
    
    res.json({ 
      success: true, 
      version: server.version, 
      type: server.type,
      javaVersion: server.javaVersion,
      dockerImage: server.dockerImage,
      startupCommand: server.startupCommand,
      serverJar: server.serverJar,
      ignoreWorldDataVersion: server.ignoreWorldDataVersion
    });
  } catch (err: any) {
    console.error("Change version error", err);
    res.status(500).json({ error: err.message });
  }
};

// File manager basics
export const getFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const dirPath = req.query.path ? String(req.query.path) : "/";
  const targetPath = path.join(process.cwd(), ".data", "servers", id, dirPath);
  
  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    const stats = await fs.stat(targetPath).catch(() => null);
    if (!stats) {
      // Return empty if not found
      return res.json([]);
    }
    if (stats.isFile()) {
       const content = await fs.readFile(targetPath, "utf-8");
       return res.json({ isFile: true, content });
    }
    const files = await fs.readdir(targetPath, { withFileTypes: true });
    const items = await Promise.all(
      files.map(async (f) => {
        let size = 0;
        try {
          if (!f.isDirectory()) {
            const s = await fs.stat(path.join(targetPath, f.name));
            size = s.size;
          }
        } catch {}
        return {
          name: f.name,
          isDirectory: f.isDirectory(),
          size
        };
      })
    );
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const uploadChunk = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { uploadId, chunkIndex, fileName, path: dirPath } = req.body;
  
  if (!req.file || !uploadId || chunkIndex === undefined || !fileName) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const targetPath = path.join(process.cwd(), ".data", "servers", id, dirPath || "/");
  const partFilePath = path.join(targetPath, fileName + '.part');

  if (!partFilePath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.ensureDir(targetPath);
    
    // If it's the first chunk, ensure we start fresh
    if (String(chunkIndex) === "0") {
      if (fs.existsSync(partFilePath)) {
        await fs.remove(partFilePath);
      }
    }

    // Read the uploaded chunk and append it
    const chunkData = await fs.readFile(req.file.path);
    await fs.appendFile(partFilePath, chunkData);
    
    // Cleanup multer temp file
    await fs.remove(req.file.path).catch(() => {});
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const redownloadJar = async (req: Request, res: Response) => {
  const { id } = req.params;
  const servers = (await readJSON("servers.json")) || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });

  const targetType = (server.type || "PAPER").toUpperCase();
  const isGeneric = ["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(targetType);
  if (isGeneric) {
    return res.status(400).json({ error: "Reinstall JAR is only applicable for Minecraft and Proxy servers" });
  }

  const status = await getServerRuntimeStatus(server).catch(() => null);
  if (status?.State?.Running || server.status === "running") {
    return res.status(400).json({ error: "Server must be stopped before re-downloading or updating the server JAR. Please stop the server first." });
  }

  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  await fs.ensureDir(serverDir);
  await secureDirectoryPermissions(serverDir);
  const jarPath = path.join(serverDir, "server.jar");

  try {
    const { panelEvents } = await import("../events.js");
    panelEvents.emit("log", id, `[JTG System] Downloading ${server.type} (${server.version || "latest"}) server JAR...\r\n`);
    await downloadJar(server.type, server.version || "latest", jarPath);
    await secureExecutablePermissions(jarPath);
    
    const eulaPath = path.join(serverDir, "eula.txt");
    if (!fs.existsSync(eulaPath)) {
      await fs.writeFile(eulaPath, "eula=true\n");
    }
    const propsPath = path.join(serverDir, "server.properties");
    if (!fs.existsSync(propsPath)) {
      await fs.writeFile(propsPath, `server-port=${server.port}\nmotd=${server.name || "A Minecraft Server"}\n`);
    }
    await secureFilePermissions(eulaPath);
    await secureFilePermissions(propsPath);

    // If server is on Docker and not currently running, refresh the container
    if (server.runtimeType !== "local" && server.containerId) {
      try {
        const status = await getServerRuntimeStatus(server);
        if (!status?.State?.Running) {
          panelEvents.emit("log", id, `[JTG System] Refreshing Docker container environment...\r\n`);
          await deleteServerRuntime(server);
          server.containerId = await createServerRuntime(server);
          await writeJSON("servers.json", servers);
        }
      } catch (containerErr) {
        console.warn("[redownloadJar] Container refresh notice:", containerErr);
      }
    }

    panelEvents.emit("log", id, `[JTG System] Server JAR successfully installed and configured!\r\n`);
    res.json({ success: true, message: "Server JAR downloaded and configured successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to download JAR" });
  }
};


export const completeUpload = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { uploadId, fileName, path: dirPath, totalChunks } = req.body;
  if (!uploadId || !fileName || !totalChunks) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const targetPath = path.join(process.cwd(), ".data", "servers", id, dirPath || "/");
  const finalFilePath = path.join(targetPath, fileName);
  const partFilePath = path.join(targetPath, fileName + '.part');
  
  if (!finalFilePath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    if (fs.existsSync(partFilePath)) {
      await fs.move(partFilePath, finalFilePath, { overwrite: true });
    } else {
      // In case totalChunks was 0 or something weird, but usually part file must exist.
      throw new Error("Part file missing");
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  let dirPath = req.body.path || "/";
  
  // If dirPath matches or ends with the uploaded file name, normalize to parent directory
  if (req.file) {
    if (dirPath === req.file.originalname || dirPath === `/${req.file.originalname}` || dirPath === `\\${req.file.originalname}`) {
      dirPath = "/";
    } else if (dirPath.endsWith(req.file.originalname)) {
      dirPath = path.dirname(dirPath);
    }
  }

  const serverBase = path.join(process.cwd(), ".data", "servers", id);
  const targetPath = path.join(serverBase, dirPath);
  
  if (!targetPath.startsWith(serverBase)) {
    return res.status(403).json({ error: "Invalid path" });
  }

  if (req.file) {
    await fs.ensureDir(targetPath);
    const destFile = path.join(targetPath, req.file.originalname);
    await fs.move(req.file.path, destFile, { overwrite: true });
  }
  res.json({ success: true });
};

export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const filePaths = req.body.paths || (req.body.path ? [req.body.path] : []);
  
  try {
    for (const filePath of filePaths) {
      const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);
      
      if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
        return res.status(403).json({ error: "Invalid path" });
      }
      
      await fs.remove(targetPath);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const zipFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dirPath, fileNames, outputName } = req.body;
  
  const baseDir = path.join(process.cwd(), ".data", "servers", id, dirPath || "/");
  const outZipPath = path.join(baseDir, outputName || "archive.zip");

  if (!baseDir.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    const output = fs.createWriteStream(outZipPath);
    // Use fast compression (level: 1) for rapid responsiveness and avoiding Cloudflare HTTP timeouts
    const archive = new ZipArchive({ zlib: { level: 1 } });

    output.on("close", async () => {
      await secureFilePermissions(outZipPath);
      if (!res.headersSent) res.json({ success: true, filename: outputName || "archive.zip" });
    });

    archive.on("error", (err: any) => {
      console.error("Archive error:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    archive.pipe(output);

    for (const name of fileNames) {
      const filePath = path.join(baseDir, name);
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) continue;
      if (stat.isDirectory()) {
        archive.directory(filePath, name);
      } else {
        archive.file(filePath, { name });
      }
    }

    await archive.finalize();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};

export const renameFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { oldPath, newPath } = req.body;

  const targetOldPath = path.join(process.cwd(), ".data", "servers", id, oldPath);
  const targetNewPath = path.join(process.cwd(), ".data", "servers", id, newPath);

  if (!targetOldPath.startsWith(path.join(process.cwd(), ".data", "servers", id)) ||
      !targetNewPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.rename(targetOldPath, targetNewPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export const downloadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  let rawPaths: string[] = [];
  if (req.query.paths) {
    rawPaths = Array.isArray(req.query.paths) ? (req.query.paths as string[]) : String(req.query.paths).split(",");
  } else if (req.query.path) {
    rawPaths = [String(req.query.path)];
  }

  if (rawPaths.length === 0) {
    return res.status(400).json({ error: "No path specified" });
  }

  const serverBaseDir = path.join(process.cwd(), ".data", "servers", id);

  try {
    if (rawPaths.length === 1) {
      const singlePath = rawPaths[0];
      const targetPath = path.join(serverBaseDir, singlePath);

      if (!targetPath.startsWith(serverBaseDir)) {
        return res.status(403).json({ error: "Invalid path" });
      }

      const stat = await fs.stat(targetPath).catch(() => null);
      if (!stat) {
        return res.status(404).json({ error: "File not found" });
      }
      if (!stat.isDirectory()) {
        return res.download(targetPath, path.basename(targetPath));
      }
    }

    // Multiple items OR a single directory -> stream as ZIP (level: 1 for instant streaming without timeout)
    const zipName = rawPaths.length === 1 
      ? `${path.basename(rawPaths[0]) || "folder"}.zip`
      : `download-${Date.now()}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = new ZipArchive({ zlib: { level: 1 } });
    archive.on("error", (err: any) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
    archive.pipe(res);

    for (const relPath of rawPaths) {
      const targetPath = path.join(serverBaseDir, relPath);
      if (!targetPath.startsWith(serverBaseDir)) continue;
      const itemName = path.basename(targetPath);
      const stat = await fs.stat(targetPath).catch(() => null);
      if (!stat) continue;

      if (stat.isDirectory()) {
        archive.directory(targetPath, itemName);
      } else {
        archive.file(targetPath, { name: itemName });
      }
    }

    await archive.finalize();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};

export const unzipFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { path: filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: "Archive file path is required" });
  }

  const serverBaseDir = path.join(process.cwd(), ".data", "servers", id);
  let targetPath = path.join(serverBaseDir, filePath);
  
  if (!targetPath.startsWith(serverBaseDir)) {
    return res.status(403).json({ error: "Invalid path: Access outside server directory is forbidden" });
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }

  try {
    const stat = await fs.stat(targetPath);
    
    // If targetPath is a directory (e.g. a folder named 'Stad 2_0.zip')
    if (stat.isDirectory()) {
      const baseName = path.basename(targetPath);
      const nestedFilePath = path.join(targetPath, baseName);
      
      // Check if there is an actual archive file inside this folder with the same name
      if (fs.existsSync(nestedFilePath) && (await fs.stat(nestedFilePath)).isFile()) {
        targetPath = nestedFilePath;
      } else {
        // Look for any archive file inside this directory
        const filesInside = await fs.readdir(targetPath);
        const archiveInside = filesInside.find(f => /\.(zip|tar|gz|tgz|jar|rar|7z)$/i.test(f));
        if (archiveInside) {
          targetPath = path.join(targetPath, archiveInside);
        } else {
          return res.status(400).json({ error: `'${filePath}' is a folder directory, not an archive file.` });
        }
      }
    }

    const destDir = path.dirname(targetPath);
    const result = await extractArchive(targetPath, destDir);
    res.json({ success: true, method: result.method });
  } catch (e: any) {
    console.error("Extraction error:", e);
    res.status(500).json({ error: e.message || "Failed to extract archive file" });
  }
};


export const createFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);
  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }
  try {
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, "", "utf-8");
    await secureFilePermissions(targetPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const createDirectory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath } = req.body;
  const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);
  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }
  try {
    await fs.mkdir(targetPath, { recursive: true });
    await secureDirectoryPermissions(targetPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const saveFileContent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath, content } = req.body;

  const targetPath = path.join(process.cwd(), ".data", "servers", id, filePath);

  if (!targetPath.startsWith(path.join(process.cwd(), ".data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, content, "utf-8");
    await secureFilePermissions(targetPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export const getBackups = async (req: Request, res: Response) => {
  const { id } = req.params;
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  await fs.ensureDir(backupsDir);

  try {
    const files = await fs.readdir(backupsDir);
    const backups = [];
    for (const file of files) {
      if (file.endsWith(".zip")) {
        const stats = await fs.stat(path.join(backupsDir, file));
        backups.push({
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
        });
      }
    }
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(backups);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const createBackup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { includeCache } = req.body || {};
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  await fs.ensureDir(backupsDir);
  await secureDirectoryPermissions(backupsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.zip`;
  const backupPath = path.join(backupsDir, filename);

  try {
    const serverExists = await fs.pathExists(serverDir);
    if (!serverExists) {
       await fs.ensureDir(serverDir);
    }

    const output = fs.createWriteStream(backupPath);
    // Fast compression level 1 for quick processing
    const archive = new ZipArchive({ zlib: { level: 1 } });

    output.on("close", async () => {
      await secureFilePermissions(backupPath);
      if (!res.headersSent) res.json({ success: true, filename });
    });

    archive.on("error", (err: any) => {
      console.error("Archive error:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    archive.pipe(output);

    // If includeCache is false (default for optimal backups), exclude ephemeral server cache folders
    const ignoreList = includeCache ? [] : ["cache/**", ".cache/**", "versions/**", ".fabric/**", ".quilt/**"];
    archive.glob("**/*", {
      cwd: serverDir,
      dot: true,
      ignore: ignoreList
    });

    await archive.finalize();
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
};

export const downloadBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  const backupPath = path.join(backupsDir, filename);

  // basic path traversal prevention
  if (!backupPath.startsWith(backupsDir)) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    const exists = await fs.pathExists(backupPath);
    if (!exists) {
      return res.status(404).json({ error: "Backup not found" });
    }

    const stat = await fs.stat(backupPath);
    const safeFilename = path.basename(filename).replace(/["\r\n]/g, "");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    res.setHeader("Content-Length", stat.size.toString());
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    const stream = fs.createReadStream(backupPath);
    stream.on("error", (streamErr) => {
      console.error("Backup stream error:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to read backup file stream" });
      }
    });
    stream.pipe(res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to download backup" });
    }
  }
};

export const deleteBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const backupPath = path.join(process.cwd(), ".data", "backups", id, filename);

  if (!backupPath.startsWith(path.join(process.cwd(), ".data", "backups", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.remove(backupPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
export const installPlugin = async (req: Request, res: Response) => {

  const { id } = req.params;
  const serversJSON = await readJSON("servers.json");
  const server = serversJSON?.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  const pluginCompatibleTypes = ["PAPER", "SPIGOT", "BUKKIT", "PURPUR", "WATERFALL", "BUNGEECORD", "VELOCITY"];
  if (!pluginCompatibleTypes.includes((server.type || "").toUpperCase())) {
     return res.status(400).json({ error: `Cannot install Bukkit/Spigot plugins on a ${server.type} server. This software does not support Bukkit plugins.` });
  }
  const { source, pluginId, pluginName } = req.body;
  
  // Allow direct downloadUrl fallback for backward compatibility
  if (req.body.downloadUrl) {
     try {
        const serverDir = path.join(process.cwd(), ".data", "servers", id);
        const pluginsDir = path.join(serverDir, "plugins");
        await fs.ensureDir(pluginsDir);
        const filePath = path.join(pluginsDir, req.body.filename);
        if (req.body.downloadUrl === 'dummy') {
          await fs.writeFile(filePath, '');
        } else {
          const axios = (await import("axios")).default;
          const response = await axios({ url: req.body.downloadUrl, method: 'GET', responseType: 'stream' });
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);
          await new Promise<void>((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
        }
        return res.json({ success: true, message: "Plugin installed successfully" });
     } catch(e) {
        return res.status(500).json({ error: "Failed to install plugin" });
     }
  }

  if (!source || !pluginId || !pluginName) {
    return res.status(400).json({ error: "Missing source, pluginId, or pluginName" });
  }

  try {
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const pluginsDir = path.join(serverDir, "plugins");
    await fs.ensureDir(pluginsDir);
    let downloadUrl = null;
    let filename = `${pluginName.replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const axios = (await import("axios")).default;

    const commonHeaders = {
      'User-Agent': 'JTGPanel/3.1.0 (https://github.com/jishnu; support@jtgpanel.net)'
    };

    // Helper: search Modrinth by plugin name
    const resolveModrinthByName = async (pName: string) => {
      try {
        const mrSearch = await axios.get(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(pName)}&facets=[["project_type:plugin"]]&limit=3`, {
          headers: commonHeaders,
          timeout: 7000
        });
        if (mrSearch.data?.hits?.length > 0) {
          for (const hit of mrSearch.data.hits) {
            const verRes = await axios.get(`https://api.modrinth.com/v2/project/${hit.project_id}/version`, {
              headers: commonHeaders,
              timeout: 7000
            });
            if (verRes.data && verRes.data.length > 0) {
              const file = verRes.data[0].files?.find((f: any) => f.primary) || verRes.data[0].files?.[0];
              if (file && file.url) {
                return { url: file.url, filename: file.filename || `${hit.title || pName}.jar` };
              }
            }
          }
        }
      } catch (e) {}
      return null;
    };

    // Helper: search Hangar by plugin name
    const resolveHangarByName = async (pName: string) => {
      try {
        const hSearch = await axios.get(`https://hangar.papermc.io/api/v1/projects?q=${encodeURIComponent(pName)}&limit=3`, {
          headers: commonHeaders,
          timeout: 7000
        });
        if (hSearch.data?.result?.length > 0) {
          for (const proj of hSearch.data.result) {
            const verRes = await axios.get(`https://hangar.papermc.io/api/v1/projects/${proj.namespace.owner}/${proj.namespace.slug}/versions`, {
              headers: commonHeaders,
              timeout: 7000
            });
            if (verRes.data?.result?.length > 0) {
              const version = verRes.data.result[0];
              const download = version.downloads.PAPER || version.downloads.SPIGOT || version.downloads.VELOCITY || version.downloads.WATERFALL || Object.values(version.downloads)[0];
              if (download && (download as any).downloadUrl) {
                return {
                  url: (download as any).downloadUrl,
                  filename: (download as any).fileInfo?.name || `${proj.name || pName}.jar`
                };
              }
            }
          }
        }
      } catch (e) {}
      return null;
    };

    // Helper: resolve external URL from various services (Hangar, GitHub, Modrinth, Jenkins, Direct JAR, etc.)
    const resolveExternalPluginUrl = async (extUrl: string, pName: string): Promise<{ url: string; filename: string } | null> => {
      if (!extUrl) return null;

      // 1. Direct JAR URL
      if (/\.jar(\?.*)?$/i.test(extUrl)) {
        const cleanName = extUrl.split('/').pop()?.split('?')[0] || `${pName}.jar`;
        return { url: extUrl, filename: cleanName };
      }

      // 2. Hangar PaperMC link (e.g. https://hangar.papermc.io/ViaVersion/ViaBackwards/versions)
      if (extUrl.includes('hangar.papermc.io')) {
        const match = extUrl.match(/hangar\.papermc\.io\/([^\/]+)\/([^\/?#]+)/);
        if (match) {
          const owner = match[1];
          const slug = match[2];
          try {
            const verRes = await axios.get(`https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions`, {
              headers: commonHeaders,
              timeout: 8000
            });
            if (verRes.data?.result?.length > 0) {
              const version = verRes.data.result[0];
              const download = version.downloads.PAPER || version.downloads.SPIGOT || version.downloads.VELOCITY || version.downloads.WATERFALL || Object.values(version.downloads)[0];
              if (download && (download as any).downloadUrl) {
                return {
                  url: (download as any).downloadUrl,
                  filename: (download as any).fileInfo?.name || `${slug}.jar`
                };
              }
              if (download && (download as any).externalUrl) {
                const subRes = await resolveExternalPluginUrl((download as any).externalUrl, pName);
                if (subRes) return subRes;
              }
            }
          } catch (e: any) {
            console.error('Hangar external resolve error:', e.message);
          }
        }
      }

      // 3. GitHub Releases
      if (extUrl.includes('github.com')) {
        let apiUrl = null;
        const tagMatch = extUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/releases\/tag\/([^\/?#]+)/);
        const latestMatch = extUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/releases\/latest/);
        const releasesMatch = extUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/releases/);
        const repoMatch = extUrl.match(/github\.com\/([^\/]+)\/([^\/?#]+)/);

        if (tagMatch) {
          apiUrl = `https://api.github.com/repos/${tagMatch[1]}/${tagMatch[2]}/releases/tags/${tagMatch[3]}`;
        } else if (latestMatch) {
          apiUrl = `https://api.github.com/repos/${latestMatch[1]}/${latestMatch[2]}/releases/latest`;
        } else if (releasesMatch) {
          apiUrl = `https://api.github.com/repos/${releasesMatch[1]}/${releasesMatch[2]}/releases`;
        } else if (repoMatch && repoMatch[2] !== 'releases') {
          apiUrl = `https://api.github.com/repos/${repoMatch[1]}/${repoMatch[2]}/releases/latest`;
        }

        if (apiUrl) {
          try {
            const ghRes = await axios.get(apiUrl, {
              headers: { ...commonHeaders, 'Accept': 'application/vnd.github.v3+json' },
              timeout: 8000
            });
            let assets = null;
            if (Array.isArray(ghRes.data) && ghRes.data.length > 0) {
              assets = ghRes.data[0].assets;
            } else if (ghRes.data && ghRes.data.assets) {
              assets = ghRes.data.assets;
            }

            if (assets && assets.length > 0) {
              const jarAsset = assets.find((a: any) => a.name?.endsWith('.jar') && !a.name?.includes('-sources') && !a.name?.includes('-javadoc') && !a.name?.includes('-dev')) 
                            || assets.find((a: any) => a.name?.endsWith('.jar'));
              if (jarAsset) {
                return { url: jarAsset.browser_download_url, filename: jarAsset.name };
              }
            }
          } catch (e: any) {
            console.error('GitHub API resolve error:', e.message);
          }
        }
      }

      // 4. Modrinth Link
      if (extUrl.includes('modrinth.com')) {
        const modrinthMatch = extUrl.match(/modrinth\.com\/(?:plugin|mod|project)\/([^\/?#]+)/);
        if (modrinthMatch) {
          const slug = modrinthMatch[1];
          try {
            const verRes = await axios.get(`https://api.modrinth.com/v2/project/${slug}/version`, {
              headers: commonHeaders,
              timeout: 8000
            });
            if (verRes.data && verRes.data.length > 0) {
              const file = verRes.data[0].files?.find((f: any) => f.primary) || verRes.data[0].files?.[0];
              if (file && file.url) {
                return { url: file.url, filename: file.filename || `${slug}.jar` };
              }
            }
          } catch (e) {}
        }
      }

      // 5. Jenkins / CI server
      if (extUrl.includes('/job/') || extUrl.includes('ci.') || extUrl.includes('jenkins')) {
        try {
          let clean = extUrl.replace(/\/+$/, '');
          if (!clean.includes('/lastSuccessfulBuild') && !clean.includes('/lastBuild')) {
            clean = clean + '/lastSuccessfulBuild';
          }
          const res = await axios.get(`${clean}/api/json`, { headers: commonHeaders, timeout: 6000 });
          if (res.data && res.data.artifacts && res.data.artifacts.length > 0) {
            const jarArt = res.data.artifacts.find((a: any) => a.fileName?.endsWith('.jar') && !a.fileName?.includes('-sources') && !a.fileName?.includes('-javadoc')) 
                        || res.data.artifacts.find((a: any) => a.fileName?.endsWith('.jar'));
            if (jarArt) {
              return { url: `${clean}/artifact/${jarArt.relativePath}`, filename: jarArt.fileName };
            }
          }
        } catch (e) {}
      }

      // 6. Cross-platform fallback search on Modrinth by pluginName
      const mrFallback = await resolveModrinthByName(pName);
      if (mrFallback) return mrFallback;

      // 7. Cross-platform fallback search on Hangar by pluginName
      const hFallback = await resolveHangarByName(pName);
      if (hFallback) return hFallback;

      return null;
    };

    if (source === 'modrinth') {
      try {
        const verRes = await axios.get(`https://api.modrinth.com/v2/project/${pluginId}/version`, {
          headers: commonHeaders,
          timeout: 8000
        });
        if (verRes.data && verRes.data.length > 0) {
          const file = verRes.data[0].files?.find((f: any) => f.primary) || verRes.data[0].files?.[0];
          if (file && file.url) {
            downloadUrl = file.url;
            filename = file.filename || filename;
          }
        }
      } catch (e) {
        console.error('Modrinth fetch failed, attempting fallback search:', e);
      }

      if (!downloadUrl) {
        const fb = await resolveModrinthByName(pluginName) || await resolveHangarByName(pluginName);
        if (fb) {
          downloadUrl = fb.url;
          filename = fb.filename;
        }
      }
    } else if (source === 'spigot') {
      try {
        const apiRes = await axios.get(`https://api.spiget.org/v2/resources/${pluginId}`, {
          headers: commonHeaders,
          timeout: 8000
        });
        if (apiRes.data && apiRes.data.file) {
          if (apiRes.data.file.type === 'external' && apiRes.data.file.externalUrl) {
            const extUrl = apiRes.data.file.externalUrl;
            const resolved = await resolveExternalPluginUrl(extUrl, pluginName);
            if (resolved) {
              downloadUrl = resolved.url;
              filename = resolved.filename;
            } else {
              // Try fallback direct download or search
              const fb = await resolveModrinthByName(pluginName) || await resolveHangarByName(pluginName);
              if (fb) {
                downloadUrl = fb.url;
                filename = fb.filename;
              } else {
                downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
              }
            }
          } else {
            downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
          }
        } else {
          downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
        }
      } catch (e: any) {
        console.error('Spiget resource query error, trying fallback search:', e.message);
        const fb = await resolveModrinthByName(pluginName) || await resolveHangarByName(pluginName);
        if (fb) {
          downloadUrl = fb.url;
          filename = fb.filename;
        } else {
          downloadUrl = `https://api.spiget.org/v2/resources/${pluginId}/download`;
        }
      }
    } else if (source === 'hangar') {
      const [owner, slug] = pluginId.split('/');
      try {
        const verRes = await axios.get(`https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions`, {
          headers: commonHeaders,
          timeout: 8000
        });
        if (verRes.data && verRes.data.result && verRes.data.result.length > 0) {
          const version = verRes.data.result[0];
          const download = version.downloads.PAPER || version.downloads.SPIGOT || version.downloads.VELOCITY || version.downloads.WATERFALL || Object.values(version.downloads)[0];
          if (download && (download as any).downloadUrl) {
            downloadUrl = (download as any).downloadUrl;
            if ((download as any).fileInfo && (download as any).fileInfo.name) {
              filename = (download as any).fileInfo.name;
            }
          } else if (download && (download as any).externalUrl) {
            const extUrl = (download as any).externalUrl;
            const resolved = await resolveExternalPluginUrl(extUrl, pluginName);
            if (resolved) {
              downloadUrl = resolved.url;
              filename = resolved.filename;
            }
          }
        }
      } catch (e: any) {
        console.error('Hangar fetch error, trying fallback search:', e.message);
      }

      if (!downloadUrl) {
        const fb = await resolveHangarByName(pluginName) || await resolveModrinthByName(pluginName);
        if (fb) {
          downloadUrl = fb.url;
          filename = fb.filename;
        }
      }
    }

    if (!downloadUrl) {
      let extUrl = "";
      if (source === 'spigot') extUrl = `https://www.spigotmc.org/resources/${pluginId}`;
      else if (source === 'modrinth') extUrl = `https://modrinth.com/project/${pluginId}`;
      else if (source === 'hangar') extUrl = `https://hangar.papermc.io/${pluginId}`;
      return res.status(404).json({ error: `Download URL not found for ${pluginName}. Please download manually.`, externalLink: extUrl });
    }

    const filePath = path.join(pluginsDir, filename);
    await fs.ensureDir(pluginsDir);
    await secureDirectoryPermissions(pluginsDir);

    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 30000,
      headers: commonHeaders
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Ensure permissions
    await secureFilePermissions(filePath);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || stat.size === 0) {
      await fs.remove(filePath).catch(() => {});
      return res.status(502).json({ error: "Downloaded plugin file was empty. Please try another source or upload the JAR manually." });
    }

    res.json({ success: true, message: `${pluginName} installed successfully into plugins folder!` });
  } catch (error: any) {
    console.error("Plugin installation failed:", error.message);
    res.status(500).json({ error: "Plugin installation failed: " + (error.response?.data?.message || error.message) });
  }
};

export const installMod = async (req: Request, res: Response) => {

  const { id } = req.params;
  const serversJSON = await readJSON("servers.json");
  const server = serversJSON?.find((s: any) => s.id === id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  
  const modCompatibleTypes = ["FABRIC", "FORGE", "NEOFORGE", "QUILT"];
  if (!modCompatibleTypes.includes((server.type || "").toUpperCase())) {
     return res.status(400).json({ error: `Cannot install Fabric/Forge mods on a ${server.type} server. This software does not support Fabric/Forge mods.` });
  }
  const { pluginId, pluginName } = req.body; 

  if (!pluginId || !pluginName) {
    return res.status(400).json({ error: "Missing pluginId or pluginName" });
  }

  try {
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    const modsDir = path.join(serverDir, "mods");
    await fs.ensureDir(modsDir);
    
    let downloadUrl = null;
    let filename = `${pluginName.replace(/[^a-zA-Z0-9]/g, '_')}.jar`;
    const axios = (await import("axios")).default;

    const verRes = await axios.get(`https://api.modrinth.com/v2/project/${pluginId}/version`);
    if (verRes.data && verRes.data.length > 0) {
      const file = verRes.data[0].files.find((f: any) => f.primary) || verRes.data[0].files[0];
      if (file) {
          downloadUrl = file.url;
          filename = file.filename || filename;
      }
    }

    if (!downloadUrl) {
      return res.status(404).json({ error: "Could not find a valid download URL for this mod." });
    }

    const filePath = path.join(modsDir, filename);
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
      headers: {
         'User-Agent': 'React-Minecraft-Panel/1.0'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({ success: true, message: "Mod installed successfully" });
  } catch (error: any) {
    console.error("Mod installation failed:", error.message);
    res.status(500).json({ error: "Mod installation failed: " + error.message });
  }
};

export const updateResources = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ram, cpu, disk } = req.body;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if ((req as any).user.role !== "admin" && (req as any).user.role !== "owner") return res.status(403).json({ error: "Unauthorized" });

    server.ram = Number(ram);
    server.cpu = Number(cpu);
    server.disk = Number(disk);

    // Stop and recreate container if running or existing
    if (server.containerId) {
       try {
         const status = await getServerRuntimeStatus(server);
         if (status?.State?.Running) {
            await stopServerRuntime(server);
         }
         await deleteServerRuntime(server);
       } catch(e) {
         console.warn("Failed to delete old runtime on resource update:", e);
       }
       try {
         server.containerId = await createServerRuntime(server);
       } catch(e) {
         console.warn("Failed to recreate runtime on resource update:", e);
       }
    }

    await writeJSON("servers.json", servers);
    res.json(server);
  } catch (error) {
    console.error("Resource update error:", error);
    res.status(500).json({ error: "Failed to update resources" });
  }
};

export const updateSuspend = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { suspendDuration } = req.body; // permanent, 1_month, 2_months, 24_hours, 1_week, or null
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if ((req as any).user.role !== "admin" && (req as any).user.role !== "owner") return res.status(403).json({ error: "Unauthorized" });

    server.suspended = suspendDuration !== null;
    server.suspendDuration = suspendDuration;
    await writeJSON("servers.json", servers);

    if (server.suspended && server.containerId) {
       try {
         await stopServerRuntime(server);
       } catch(e) {}
    }

    res.json(server);
  } catch (error) {
    res.status(500).json({ error: "Failed to suspend server" });
  }
};






export const updateRuntime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { version, type, javaVersion, dockerImage, serverJar, startupCommand } = req.body;
    const user = (req as any).user;

    let servers = await readJSON("servers.json") || [];
    const serverIndex = servers.findIndex((s: any) => s.id === id);
    if (serverIndex === -1) return res.status(404).json({ error: "Server not found" });
    const server = servers[serverIndex];

    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can change runtime settings" });
    }

    if (server.containerId) {
      const status = await getServerRuntimeStatus(server);
      if (status?.State?.Running) {
        return res.status(400).json({ error: "Server must be stopped before changing runtime. Please stop the server first." });
      }
    }
    
    // We must do a full backup before changing this if requested, but for now we just save it.
    // The instructions say "When an administrator changes the Minecraft version: 1. Stop the server safely... 3. Create a complete backup."
    // Let's call the internal backup logic.
    const backupDir = path.join(process.cwd(), ".data", "backups", id);
    await fs.ensureDir(backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `pre_runtime_update_${timestamp}.zip`);
    const serverDir = path.join(process.cwd(), ".data", "servers", id);
    

    if (await fs.pathExists(serverDir)) {
      const output = fs.createWriteStream(backupFile);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.pipe(output);
      archive.directory(serverDir, false);
      
      const serversJSON = await readJSON("servers.json");
      archive.append(JSON.stringify(serversJSON.find((s: any) => s.id === id), null, 2), { name: "server_config_snapshot.json" });
      
      await archive.finalize();
    }


    server.version = version || server.version;
    server.type = type || server.type;
    if (javaVersion !== undefined && javaVersion !== "" && javaVersion !== "auto") {
      server.javaVersion = javaVersion;
    } else {
      server.javaVersion = getJavaVersionForMinecraft(server.version, server.type);
    }
    server.dockerImage = dockerImage || server.dockerImage;
    if (server.dockerImage && server.dockerImage.includes("itzg/minecraft-server")) {
      const neededTag = `java${server.javaVersion || "25"}`;
      if (!server.dockerImage.includes(neededTag)) {
        server.dockerImage = `itzg/minecraft-server:${neededTag}`;
      }
    }
    server.serverJar = serverJar || server.serverJar;
    server.startupCommand = startupCommand || server.startupCommand;

    servers[serverIndex] = server;
    
    if (server.containerId) {
       await deleteServerRuntime(server);
    }
    
    const newContainerId = await createServerRuntime(server);
    server.containerId = newContainerId;
    servers[serverIndex] = server;

    await writeJSON("servers.json", servers);

    res.json({ success: true, server });
  } catch (err: any) {
    console.error("Update runtime error", err);
    res.status(500).json({ error: err.message });
  }
};

export const migrateServerRuntime = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetRuntime } = req.body;
  const user = (req as any).user;

  try {
    if (!targetRuntime || (targetRuntime !== "docker" && targetRuntime !== "local")) {
      return res.status(400).json({ error: "Invalid target runtime. Must be 'docker' or 'local'." });
    }

    const servers = await readJSON("servers.json") || [];
    const serverIndex = servers.findIndex((s: any) => s.id === id);
    if (serverIndex === -1) {
      return res.status(404).json({ error: "Server not found" });
    }

    const server = servers[serverIndex];
    if (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can migrate runtime" });
    }

    // Check if server is running
    if (server.containerId) {
      const status = await getServerRuntimeStatus(server);
      if (status?.State?.Running) {
        return res.status(400).json({ error: "Server must be stopped before migrating runtime. Please stop the server first." });
      }
      // Clean up old runtime instance (container or local process state)
      await deleteServerRuntime(server);
    }

    // Update runtime type
    server.runtimeType = targetRuntime;

    // Create the new runtime container/process metadata
    const newContainerId = await createServerRuntime(server);
    server.containerId = newContainerId;
    servers[serverIndex] = server;

    await writeJSON("servers.json", servers);
    res.json({ success: true, server, runtimeType: targetRuntime });
  } catch (err: any) {
    console.error("Migrate runtime error:", err);
    res.status(500).json({ error: err.message || "Failed to migrate server runtime" });
  }
};



export const restoreBackup = async (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const backupsDir = path.join(process.cwd(), ".data", "backups", id);
  const backupPath = path.join(backupsDir, filename);

  try {
    if (!(await fs.pathExists(backupPath))) {
      return res.status(404).json({ error: "Backup not found" });
    }

    const status = await getServerRuntimeStatus({ id } as any);
    if (status?.State?.Running) {
      return res.status(400).json({ error: "Please stop the server before restoring a backup." });
    }

    // Clean current directory except some critical things if needed, but for full restore, we empty it
    await fs.emptyDir(serverDir);

    const extract = require("extract-zip");
    await extract(backupPath, { dir: serverDir });
    
    // Check if there was a server_config_snapshot.json and apply it
    const configSnapshot = path.join(serverDir, "server_config_snapshot.json");
    if (fs.existsSync(configSnapshot)) {
        const oldConfig = await readJSON(configSnapshot);
        const servers = await readJSON("servers.json");
        const idx = servers.findIndex((s: any) => s.id === id);
        if (idx !== -1) {
            servers[idx] = { ...servers[idx], ...oldConfig };
            await writeJSON("servers.json", servers);
        }
        await fs.remove(configSnapshot);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
