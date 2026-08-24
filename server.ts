import "dotenv/config";
import { registerProcessErrorHandlers } from "./src/server/utils/processErrorHandler.js";
import { validateJwtSecretOnStartup, getJwtSecret } from "./src/server/utils/jwt.js";

// Validate JWT Secret configuration immediately on startup
validateJwtSecretOnStartup();

import express from "express";
import path from "path";
import cors, { CorsOptions } from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import fs from "fs-extra";
import jwt from "jsonwebtoken";
import { getCorsOriginValidator } from "./src/server/utils/cors.js";
import { getProjectRoot, getDistPath, getDataDir, getBackupsDir } from "./src/server/utils/pathUtils.js";

const app = express();
// Trust first proxy (CodeSandbox, Cloud Run, Nginx, Docker, Cloudflare)
app.set("trust proxy", 1);
const httpServer = createServer(app);

const corsOptions: CorsOptions = {
  origin: getCorsOriginValidator(),
  credentials: true
};

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: getCorsOriginValidator(),
    credentials: true
  }
});
app.set("io", io);

// Register centralized process error & graceful shutdown handlers
registerProcessErrorHandlers({ httpServer, socketIo: io });

// Initialize data folders safely across environments
const ROOT_DIR = getProjectRoot();
const DATA_DIR = getDataDir();
const SERVERS_DIR = path.join(DATA_DIR, "servers");
const BACKUPS_DIR = getBackupsDir();

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(SERVERS_DIR);
fs.ensureDirSync(BACKUPS_DIR);
fs.ensureDirSync(path.join(DATA_DIR, "temp"));

if (!fs.existsSync(path.join(DATA_DIR, "users.json"))) fs.writeFileSync(path.join(DATA_DIR, "users.json"), "[]");
if (!fs.existsSync(path.join(DATA_DIR, "servers.json"))) fs.writeFileSync(path.join(DATA_DIR, "servers.json"), "[]");
if (!fs.existsSync(path.join(DATA_DIR, "settings.json"))) fs.writeFileSync(path.join(DATA_DIR, "settings.json"), "{}");

import { attachServerRuntimeSocket, getServerRuntimeLogs } from "./src/server/services/runtime.js";
import { panelEvents } from "./src/server/events.js";

panelEvents.on("log", (serverId, data) => {
  io.to(`server_${serverId}`).emit("log", data);
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const verified = jwt.verify(token, getJwtSecret());
    (socket as any).user = verified;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinServer", async (serverId) => {
    socket.join(`server_${serverId}`);
    
    // Ensure logs are streamed if container is already running
    try {
      const serversJSON = await fs.readFile(path.join(DATA_DIR, "servers.json"), "utf8");
      const servers = JSON.parse(serversJSON);
      const server = Array.isArray(servers) ? servers.find((s: any) => s.id === serverId) : null;
      if (server) {
        const logs = await getServerRuntimeLogs(server);
        if (logs) {
          socket.emit("log", logs.trim() + "\n");
        }
        await attachServerRuntimeSocket(server, serverId);
      }
    } catch (e) {
      console.error(e);
    }
  });
  socket.on("leaveServer", (serverId) => {
    socket.leave(`server_${serverId}`);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enforce reasonable JSON & URL-encoded payload limits (50MB max for structured data)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors(corsOptions));

import apiRoutes from "./src/server/routes/api.js";
import { verifyBuildDirectory } from "./src/server/utils/buildVerification.js";
app.use("/api", apiRoutes);

import { initSFTPServer } from "./src/server/services/sftp.js";
import { startPlayitHealthMonitor } from "./src/server/services/playitHealth.js";

async function startServer() {
  await initSFTPServer();
  await startPlayitHealthMonitor();

  const isProduction = process.env.NODE_ENV === "production" || process.argv[1]?.includes('server.cjs');

  if (!isProduction) {
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: {
        middlewareMode: true,
        allowedHosts: true,
        cors: true
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const appRoot = getProjectRoot();
    const distPath = getDistPath();
    const indexPath = path.resolve(distPath, "index.html");
    const assetsPath = path.resolve(distPath, "assets");

    // Startup Production Build Integrity Check
    const buildCheck = verifyBuildDirectory(distPath);
    const isCodeSandbox = Boolean(process.env.CODESANDBOX || process.env.SANDBOX_URL || process.env.CSB);

    console.log(`\n\x1b[36m[JTG Frontend Diagnostics]\x1b[0m`);
    console.log(`  Environment: ${isCodeSandbox ? 'codesandbox' : (process.env.NODE_ENV || 'production')}`);
    console.log(`  CWD: ${process.cwd()}`);
    console.log(`  Resolved app root: ${appRoot}`);
    console.log(`  Resolved dist path: ${distPath}`);
    console.log(`  Index exists: ${fs.existsSync(indexPath)}`);
    console.log(`  Assets directory exists: ${fs.existsSync(assetsPath)}`);
    console.log(`  Referenced JS assets: ${buildCheck.referencedJs?.join(', ') || 'none'}`);
    console.log(`  Referenced CSS assets: ${buildCheck.referencedCss?.join(', ') || 'none'}`);
    console.log(`  Missing assets: ${buildCheck.errors.length > 0 ? buildCheck.errors.join('; ') : 'none'}`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Vite base path: ${process.env.VITE_BASE_PATH || '/'}\n`);

    if (!buildCheck.valid) {
      console.error("\x1b[31m\x1b[1m[CRITICAL BUILD ERROR] Production build assets are corrupted or missing:\x1b[0m");
      buildCheck.errors.forEach(err => console.error(`  - \x1b[31m${err}\x1b[0m`));
      console.error("\x1b[33m[!] Please run 'bash update.sh' or 'npm run build' to regenerate production assets.\x1b[0m\n");

      // Serve maintenance / diagnostic page rather than a silent blank white screen
      app.use((req, res) => {
        if (req.path.startsWith("/api/")) {
          return res.status(503).json({
            error: "Service Temporarily Unavailable",
            message: "Production build assets are incomplete or corrupted. Please run npm run build.",
            details: buildCheck.errors
          });
        }
        res.status(503).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>JTG Panel - Maintenance Required</title>
            <style>
              body { background: #0d1117; color: #e6edf3; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
              .card { background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 32px; max-width: 600px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
              h1 { color: #f85149; margin-top: 0; font-size: 20px; display: flex; align-items: center; gap: 8px; }
              p { color: #8b949e; line-height: 1.6; font-size: 14px; }
              .code-box { background: #090c10; border: 1px solid #21262d; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; color: #ff7b72; overflow-x: auto; margin: 16px 0; }
              .solution { background: #1f242c; border-left: 4px solid #238636; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #7ee787; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>⚠️ Build Verification Failed</h1>
              <p>The panel's compiled frontend bundle was not found or is missing referenced files. To prevent a blank white screen, access is paused while you rebuild.</p>
              <div class="code-box">${buildCheck.errors.map(e => `• ${e}`).join('<br>')}</div>
              <p style="color: #c9d1d9; font-weight: 600; margin-bottom: 6px;">How to resolve on your server:</p>
              <div class="solution">bash update.sh<br># or: npm run build && npx pm2 restart jtg-panel</div>
            </div>
          </body>
          </html>
        `);
      });
    } else {
      console.log(`\x1b[32m[✓] Production static assets verified (${buildCheck.assetCount} asset files loaded).\x1b[0m`);

      // 1. Safe /assets serving with fallthrough: false so missing assets return 404 rather than HTML
      app.use("/assets", express.static(assetsPath, {
        fallthrough: false,
        immutable: true,
        maxAge: "1y",
        setHeaders: (res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        }
      }));

      // 2. Safe root dist static serving (favicon, manifest, robots, etc.)
      app.use(express.static(distPath, {
        index: false,
        fallthrough: true,
        maxAge: "1h",
        setHeaders: (res, filePath) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          }
        }
      }));

      // 3. Safe SPA navigation fallback
      app.get("*", (req, res, next) => {
        const acceptsHtml = Boolean(req.accepts("html"));
        const hasExtension = path.extname(req.path) !== "";

        if (
          req.method !== "GET" ||
          !acceptsHtml ||
          hasExtension ||
          req.path.startsWith("/api/") ||
          req.path.startsWith("/assets/")
        ) {
          return next();
        }

        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.sendFile(indexPath);
      });

      // 4. Proper 404 handler for missing assets / unhandled paths
      app.use((req, res) => {
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({ error: "Not Found", path: req.path });
        }
        res.status(404).type("text/plain").send("Not Found");
      });
    }

    // Express Error Handler for CORS or other middleware exceptions
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (err) {
        const isCorsError = Boolean(err.message && err.message.includes("CORS"));
        const status = err.status || (isCorsError ? 403 : 500);
        console.error(`[Server Error] ${req.method} ${req.path} (${status}):`, err.message || err);
        
        if (req.path.startsWith("/api/")) {
          return res.status(status).json({ 
            error: isCorsError ? "Forbidden by CORS security policy" : (err.message || "Internal Server Error"),
            status 
          });
        }
        return res.status(status).type("text/plain").send(
          isCorsError ? `Forbidden: ${err.message}` : `Internal Server Error: ${err.message || "An unexpected error occurred"}`
        );
      }
      next();
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`JTG Panel running on port ${PORT}`);
  });
}




// Only start server if not imported as a module in tests
const isMain = 
  (typeof require !== 'undefined' && require.main === module) || 
  (process.argv.some(arg => arg.includes('server.ts') || arg.includes('server.cjs'))) ||
  (process.env.pm_id !== undefined);

if (isMain) {
  startServer();
}

