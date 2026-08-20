// Global error handlers to prevent panel crashes
process.on("uncaughtException", (err) => {
  console.error("[Global Error] Uncaught Exception:", err.message);
  // Do not exit, keep panel running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Global Error] Unhandled Rejection at:", promise, "reason:", reason);
  // Do not exit, keep panel running
});

import "dotenv/config";
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

const app = express();
app.set("trust proxy", true);
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

// Initialize data folders
const DATA_DIR = path.join(process.cwd(), ".data");
const SERVERS_DIR = path.join(DATA_DIR, "servers");
const BACKUPS_DIR = path.join(process.cwd(), "backups");

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
      if (server && server.containerId) {
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
app.use("/api", apiRoutes);

import { initSFTPServer } from "./src/server/services/sftp.js";
import { startPlayitHealthMonitor } from "./src/server/services/playitHealth.js";

async function startServer() {
  await initSFTPServer();
  await startPlayitHealthMonitor();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: ["gtk.qzz.io"] },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`JTG Panel running on port ${PORT}`);
  });
}




// Only start server if not imported as a module in tests
const isMain = 
  (typeof require !== 'undefined' && require.main === module) || 
  (process.argv[1] && process.argv[1].includes('server.ts')) ||
  (process.argv[1] && process.argv[1].includes('server.cjs'));

console.log("IS MAIN:", isMain, "TEST_ENV:", process.env.TEST_ENV);
if (true) {
  startServer();
}


process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  fs.writeFileSync('crash.log', String(err.stack));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  fs.writeFileSync('crash.log', String(reason));
});
