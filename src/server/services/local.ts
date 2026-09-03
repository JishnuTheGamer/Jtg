import fs from "fs-extra";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import { downloadJar } from "./jarDownloader.js";
import { panelEvents } from "../events.js";

const execAsync = promisify(exec);
const processes = new Map<string, ChildProcess>();
const localStartedAt = new Map<string, string>();
const activeStreams = new Set<string>();

export const resolveJavaBinary = async (): Promise<string | null> => {
  if (process.env.JAVA_BIN && await fs.pathExists(process.env.JAVA_BIN)) {
    return process.env.JAVA_BIN;
  }
  const candidates = [
    "java",
    "/usr/bin/java",
    "/usr/local/bin/java",
    "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
    "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
    "/usr/lib/jvm/java-11-openjdk-amd64/bin/java",
    "/usr/lib/jvm/default-java/bin/java",
    "/opt/java/openjdk/bin/java"
  ];
  for (const cand of candidates) {
    if (cand === "java") {
      try {
        await execAsync("which java");
        return "java";
      } catch (e) {}
    } else if (await fs.pathExists(cand)) {
      return cand;
    }
  }
  return null;
};

export const createLocalServer = async (serverData: any) => {
  const serverPath = path.join(process.cwd(), ".data", "servers", serverData.id);
  await fs.ensureDir(serverPath);

  const type = (serverData.type || "paper").toLowerCase();

  if (type === "nodejs" || type === "node") {
    const indexPath = path.join(serverPath, "index.js");
    const pkgPath = path.join(serverPath, "package.json");
    if (!await fs.pathExists(indexPath)) {
      await fs.writeFile(indexPath, `// Node.js Application on JTG Panel\nconst http = require('http');\nconst port = process.env.PORT || process.env.SERVER_PORT || ${serverData.port || 3000};\n\nconsole.log('==============================================');\nconsole.log('🚀 Node.js Application Running on port ' + port);\nconsole.log('Node Version: ' + process.version);\nconsole.log('Upload your files in File Manager to customize!');\nconsole.log('==============================================');\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'online', runtime: 'node.js', time: new Date().toISOString() }));\n});\n\nserver.listen(port, '0.0.0.0', () => {\n  console.log(\`[Server] Listening on http://0.0.0.0:\${port}\`);\n});\n`);
    }
    if (!await fs.pathExists(pkgPath)) {
      await fs.writeFile(pkgPath, JSON.stringify({
        name: (serverData.name || "node-app").toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        version: "1.0.0",
        description: "Node.js application hosted on JTG Panel",
        main: "index.js",
        scripts: { "start": "node index.js" }
      }, null, 2));
    }
    return `local-${serverData.id}`;
  } else if (type === "python" || type === "python3") {
    const mainPath = path.join(serverPath, "main.py");
    const reqPath = path.join(serverPath, "requirements.txt");
    if (!await fs.pathExists(mainPath)) {
      await fs.writeFile(mainPath, `# Python Application on JTG Panel\nimport os\nimport sys\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\n\nport = int(os.environ.get("SERVER_PORT", os.environ.get("PORT", ${serverData.port || 8000})))\nprint("==============================================", flush=True)\nprint("🐍 Python Application Running", flush=True)\nprint(f"Python Version: {sys.version}", flush=True)\nprint(f"Listening Port: {port}", flush=True)\nprint("Upload your files in File Manager to customize!", flush=True)\nprint("==============================================", flush=True)\n\nclass RequestHandler(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header('Content-type', 'application/json')\n        self.end_headers()\n        self.wfile.write(b'{"status": "online", "runtime": "python"}')\n\n    def log_message(self, format, *args):\n        print(f"[{self.log_date_time_string()}] {format % args}", flush=True)\n\nserver = HTTPServer(('0.0.0.0', port), RequestHandler)\nprint(f"[Server] Listening on http://0.0.0.0:{port}", flush=True)\ntry:\n    server.serve_forever()\nexcept KeyboardInterrupt:\n    print("\\nStopping server...", flush=True)\n    server.server_close()\n`);
    }
    if (!await fs.pathExists(reqPath)) {
      await fs.writeFile(reqPath, "# Add python dependencies here\n");
    }
    return `local-${serverData.id}`;
  } else if (type === "velocity") {
    const configPath = path.join(serverPath, "velocity.toml");
    if (!await fs.pathExists(configPath)) {
      await fs.writeFile(configPath, `bind = "0.0.0.0:${serverData.port || 25577}"\nmotd = "&#09add3A Velocity Server"\n`);
    }
  } else if (type === "bungeecord" || type === "waterfall") {
    const configPath = path.join(serverPath, "config.yml");
    if (!await fs.pathExists(configPath)) {
      await fs.writeFile(configPath, `listeners:\n- query_port: ${serverData.port || 25577}\n  host: 0.0.0.0:${serverData.port || 25577}\n  max_players: 1000\n`);
    }
  } else {
    // Standard Minecraft server
    const eulaPath = path.join(serverPath, "eula.txt");
    await fs.writeFile(eulaPath, "eula=true\n");

    const propsPath = path.join(serverPath, "server.properties");
    if (!await fs.pathExists(propsPath)) {
      await fs.writeFile(propsPath, `server-port=${serverData.port || 25565}\n`);
    }
  }

  const jarPath = path.join(serverPath, "server.jar");
  let needDownload = false;
  if (!await fs.pathExists(jarPath)) {
    needDownload = true;
  } else {
    const stat = await fs.stat(jarPath);
    if (stat.size < 500 * 1024) {
      needDownload = true;
    }
  }

  if (needDownload) {
    try {
      await downloadJar(type, serverData.version || "latest", jarPath);
    } catch (e: any) {
      console.warn(`[Local Server] Deferred JAR download: ${e.message}`);
    }
  }

  return `local-${serverData.id}`;
};


export const startLocalServer = async (id: string, serverData: any) => {
  const serverPath = path.join(process.cwd(), ".data", "servers", id);
  await fs.ensureDir(serverPath);
  const type = (serverData.type || "paper").toLowerCase();

  const logPath = path.join(serverPath, "panel.log");
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const emitLog = (msg: string) => {
    panelEvents.emit("log", id, msg);
  };

  const logMessage = (msg: string) => {
    const formatted = `[Panel] ${msg}\n`;
    if (logStream.writable) {
      logStream.write(formatted);
    }
    emitLog(formatted);
  };

  let child: any;

  if (type === "nodejs" || type === "node") {
    let entry = "index.js";
    for (const testFile of ["index.js", "app.js", "server.js", "main.js", "bot.js"]) {
      if (await fs.pathExists(path.join(serverPath, testFile))) {
        entry = testFile;
        break;
      }
    }
    child = spawn("node", [entry], {
      cwd: serverPath,
      env: {
        ...process.env,
        PORT: String(serverData.port || 3000),
        SERVER_PORT: String(serverData.port || 3000),
        NODE_ENV: "production"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
  } else if (type === "python" || type === "python3") {
    let entry = "main.py";
    for (const testFile of ["main.py", "app.py", "bot.py", "index.py", "server.py"]) {
      if (await fs.pathExists(path.join(serverPath, testFile))) {
        entry = testFile;
        break;
      }
    }
    child = spawn("python3", ["-u", entry], {
      cwd: serverPath,
      env: {
        ...process.env,
        PORT: String(serverData.port || 8000),
        SERVER_PORT: String(serverData.port || 8000),
        PYTHONUNBUFFERED: "1"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
  } else {
    const jarPath = path.join(serverPath, "server.jar");

    let needDownload = false;
    if (!await fs.pathExists(jarPath)) {
      needDownload = true;
    } else {
      const stat = await fs.stat(jarPath);
      if (stat.size < 500 * 1024) {
        needDownload = true;
      }
    }

    if (needDownload) {
      logMessage(`Server JAR missing or incomplete. Downloading ${type} (${serverData.version || "latest"})...`);
      try {
        await downloadJar(type, serverData.version || "latest", jarPath);
        logMessage("Server JAR downloaded successfully.");
      } catch (dlErr: any) {
        logMessage(`Failed to download JAR: ${dlErr.message}`);
        throw new Error(`Failed to download server.jar: ${dlErr.message}`);
      }
    }

    // Ensure EULA is accepted
    const eulaPath = path.join(serverPath, "eula.txt");
    await fs.writeFile(eulaPath, "eula=true\n");

    const memory = serverData.ram || 1;
    const javaBin = await resolveJavaBinary();
    if (!javaBin) {
      const errMessage = "Java (JDK/JRE) was not found on this system. Please install Java 21 (e.g. 'sudo apt update && sudo apt install -y openjdk-21-jre-headless') or select Docker runtime.";
      logMessage(errMessage);
      throw new Error(errMessage);
    }

    if (serverData.startupCommand && serverData.startupCommand.trim()) {
      const parts = serverData.startupCommand.trim().split(/\s+/);
      const bin = parts[0];
      const args = parts.slice(1);
      child = spawn(bin, args, {
        cwd: serverPath,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } else {
      child = spawn(javaBin, [`-Xms${memory}G`, `-Xmx${memory}G`, "-Djline.terminal=jline.UnsupportedTerminal", "-jar", "server.jar", "nogui", "--nojline"], {
        cwd: serverPath,
        stdio: ["pipe", "pipe", "pipe"]
      });
    }
  }

  processes.set(id, child);

  child.on("spawn", () => {
    localStartedAt.set(id, new Date().toISOString());
    logMessage(`Server process started with PID ${child.pid} for ${serverData.name || id} (${type})`);
  });

  child.on("error", (err: Error) => {
    localStartedAt.delete(id);
    logMessage(`Failed to start server process: ${err.message}`);
    if (err.message.includes("ENOENT")) {
        logMessage("---- RUNTIME NOTICE ----");
        logMessage(`Required executable or binary is missing or not in PATH for runtime (${type})!`);
        logMessage("If running Minecraft with the Node.js / Local Process runtime on a Linux VPS, ensure OpenJDK 21 is installed:");
        logMessage("  sudo apt update && sudo apt install -y openjdk-21-jre-headless");
        logMessage("Alternatively, you can switch to the Docker Container runtime in Settings.");
        logMessage("------------------------");
    }
  });

  child.on("close", (code: number | null) => {
    logMessage(`Server process exited with code ${code}`);
    processes.delete(id);
    localStartedAt.delete(id);
    activeStreams.delete(id);
  });

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (logStream.writable) logStream.write(text);
    emitLog(text);
  });

  child.stderr?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (logStream.writable) logStream.write(text);
    emitLog(text);
  });

  // Verify process does not immediately crash on startup
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const errorHandler = (err: Error) => {
      if (!settled) {
        settled = true;
        processes.delete(id);
        localStartedAt.delete(id);
        reject(new Error(`Server failed to start: ${err.message}`));
      }
    };
    const exitHandler = (code: number | null) => {
      if (!settled && code !== 0 && code !== null) {
        settled = true;
        processes.delete(id);
        localStartedAt.delete(id);
        reject(new Error(`Server process exited immediately with code ${code}`));
      }
    };
    child.once("error", errorHandler);
    child.once("close", exitHandler);

    setTimeout(() => {
      if (!settled) {
        settled = true;
        child.removeListener("error", errorHandler);
        child.removeListener("close", exitHandler);
        resolve();
      }
    }, 450);
  });
};


export const stopLocalServer = async (id: string): Promise<boolean> => {
  localStartedAt.delete(id);
  const child = processes.get(id);
  if (!child) return true;

  if (child.stdin && child.stdin.writable) {
    try {
      child.stdin.write("stop\nend\nexit\n");
    } catch (e) {}
  }
  try {
    child.kill("SIGTERM");
  } catch (e) {}

  const start = Date.now();
  while (processes.has(id) && Date.now() - start < 4000) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (processes.has(id)) {
    try {
      child.kill("SIGKILL");
    } catch (e) {}
    processes.delete(id);
  }

  activeStreams.delete(id);
  return true;
};

export const killLocalServer = async (id: string): Promise<void> => {
  localStartedAt.delete(id);
  const child = processes.get(id);
  if (child) {
    try {
      child.kill("SIGKILL");
    } catch (e) {}
    processes.delete(id);
    activeStreams.delete(id);
    panelEvents.emit("log", id, `[Panel] Process forcefully killed (SIGKILL).\n`);
  }
};

export const restartLocalServer = async (id: string, serverData: any): Promise<void> => {
  await stopLocalServer(id);
  if (processes.has(id)) {
    throw new Error("Failed to stop previous process before restarting.");
  }
  await startLocalServer(id, serverData);
  const status = await getLocalServerStatus(id);
  if (!status.State.Running) {
    throw new Error("Server process failed to start during restart.");
  }
};

export const deleteLocalServer = async (id: string) => {
  await stopLocalServer(id);
  localStartedAt.delete(id);
  const serverPath = path.join(process.cwd(), ".data", "servers", id);
  await fs.remove(serverPath);
};

export const getLocalServerStatus = async (id: string) => {
  const isRunning = processes.has(id);
  return {
    State: {
      Running: isRunning,
      Status: isRunning ? "running" : "exited",
      StartedAt: isRunning ? localStartedAt.get(id) || null : null
    }
  };
};

export const getLocalServerStats = async (id: string) => {
  const child = processes.get(id);
  if (!child || !child.pid || !processes.has(id)) {
    return { cpu: 0, ram: 0, disk: 0 };
  }

  let cpu = 0;
  let ram = 0;
  let disk = 0;

  try {
    const { stdout } = await execAsync(`ps -p ${child.pid} -o %cpu,rss`);
    const lines = stdout.trim().split("\n");
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/);
      cpu = parseFloat(parts[0]) || 0;
      const rssKb = parseInt(parts[1]) || 0;
      ram = Math.round((rssKb / 1024) * 10) / 10;
    }
  } catch (e) {}

  try {
    const serverPath = path.join(process.cwd(), ".data", "servers", id);
    const { stdout } = await execAsync(`du -sm "${serverPath}"`);
    const parts = stdout.trim().split(/\s+/);
    const diskMB = parseInt(parts[0]) || 0;
    disk = Math.round((diskMB / 1024) * 100) / 100;
  } catch (e) {
    disk = 0.05;
  }

  return {
    cpu,
    ram,
    disk
  };
};

export const getLocalServerLogs = async (id: string) => {
  const logPath = path.join(process.cwd(), ".data", "servers", id, "panel.log");
  if (await fs.pathExists(logPath)) {
    const logs = await fs.readFile(logPath, "utf8");
    return logs.split("\n").slice(-100).join("\n");
  }
  return "";
};

export const attachLocalServerSocket = (id: string, serverId: string) => {
  // handled natively by startLocalServer now to capture all output reliably
};

export const sendLocalServerCommand = async (id: string, command: string) => {
  const child = processes.get(id);
  if (child && child.stdin) {
    child.stdin.write(command + "\n");
  }
};

export const getLocalProcessInfo = (id: string) => {
  const child = processes.get(id);
  const serverPath = path.join(process.cwd(), ".data", "servers", id);
  if (child) {
    return {
      pid: child.pid,
      jarPath: path.join(serverPath, "server.jar"),
      logPath: path.join(serverPath, "panel.log")
    };
  }
  return null;
};
