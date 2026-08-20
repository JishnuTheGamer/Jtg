import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { importWorld, getWorldInfo, analyzeWorld } from "../controllers/world.js";
import { requireAuth } from "../middleware/auth.js";
import { getServers, createServer, checkPort, getServer, deleteServer, startServer, stopServer, restartServer, changeServerVersion, migrateServerRuntime, getFiles, uploadFile, uploadChunk, completeUpload, deleteFile, renameFile, saveFileContent, sendCommand, getServerStats, updateOwner, updateIpAlias, getBackups, createBackup, downloadBackup, deleteBackup, restoreBackup, unzipFile, zipFiles, installPlugin, installMod, updateResources, updateSuspend , createFile, createDirectory, downloadFile, redownloadJar } from "../controllers/servers.js";
import multer from "multer";

const router = express.Router();

// Enforce strict 2GB limit per file upload with proper 413 error handling
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const upload = multer({
  dest: path.join(process.cwd(), ".data/temp/"),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1
  }
});

// Middleware to handle Multer upload errors gracefully
const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Upload rejected: File size exceeds the maximum allowed limit of 2GB."
      });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(500).json({ error: `File upload failed: ${err.message || err}` });
  }
  next();
};

router.use(requireAuth);

router.get("/", getServers);
router.get("/check-port", checkPort);
router.post("/", createServer);
router.get("/:id", getServer);
router.get("/:id/stats", getServerStats);
router.delete("/:id", deleteServer);
router.put("/:id/owner", updateOwner);
router.put("/:id/ipalias", updateIpAlias);

router.put("/:id/version", changeServerVersion);
router.put("/:id/migrate-runtime", migrateServerRuntime);
router.put("/:id/resources", updateResources);
router.put("/:id/suspend", updateSuspend);


router.post("/:id/start", startServer);
router.post("/:id/stop", stopServer);
router.post("/:id/restart", restartServer);
router.post("/:id/command", sendCommand);
router.post("/:id/redownload-jar", redownloadJar);
router.post("/:id/reinstall", redownloadJar);

// Simple file endpoints with upload limits & error handler
router.get("/:id/files", getFiles);
router.get("/:id/files/download", downloadFile);
router.post("/:id/files/upload", upload.single("file"), handleUploadError, uploadFile);
router.post("/:id/files/upload-chunk", upload.single("chunk"), handleUploadError, uploadChunk);
router.post("/:id/files/upload-complete", completeUpload);
router.post("/:id/files/rename", renameFile);
router.post("/:id/files/save", saveFileContent);
router.post("/:id/files/create", createFile);
router.post("/:id/files/mkdir", createDirectory);
router.post("/:id/files/unzip", unzipFile);
router.post("/:id/world/analyze", analyzeWorld);
router.post("/:id/world/import", importWorld);
router.get("/:id/world/info", getWorldInfo);
router.post("/:id/files/zip", zipFiles);
router.delete("/:id/files", deleteFile);

// Backup endpoints
router.get("/:id/backups", getBackups);
router.post("/:id/backups", createBackup);
router.get("/:id/backups/:filename", downloadBackup);
router.delete("/:id/backups/:filename", deleteBackup);
router.post("/:id/backups/:filename/restore", restoreBackup);


import {
  getPlayitAgentStatus,
  startPlayitAgent,
  stopPlayitAgent,
  resetPlayitAgent,
  runServerPlayitHealthCheck,
  getHealthRecords,
  addPlayitAudit,
  getPlayitAuditLogs,
  getTrackedPlayerCount
} from "../services/playitHealth.js";

// Playit Tunnel Endpoints
router.get("/:id/playit", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
    const servers = JSON.parse(serversJSON);
    const server = servers.find((s: any) => s.id === id);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    const agentInfo = await getPlayitAgentStatus(server);
    const healthRecords = await getHealthRecords();
    const serverHealth = healthRecords[id] || null;
    const playerCount = getTrackedPlayerCount(id);

    res.json({
      status: agentInfo.status,
      claimLink: agentInfo.claimLink,
      publicAddress: agentInfo.publicAddress || serverHealth?.playitPublicAddress || null,
      logs: agentInfo.logs,
      health: serverHealth,
      playerCount
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch Playit status", details: err.message });
  }
});

router.post("/:id/playit/start", async (req, res) => { 
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
    const servers = JSON.parse(serversJSON);
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });

    const result = await startPlayitAgent(server);
    if (!result.success) {
      return res.status(500).json({ error: "Failed to start Playit Tunnel", details: result.error });
    }

    await addPlayitAudit({
      serverId: id,
      serverName: server.name || id,
      action: "agent_start",
      trigger: "user_action",
      performedBy: user.username || user.email || "Admin",
      previousStatus: "agent_offline",
      newStatus: "recovering",
      playerCount: getTrackedPlayerCount(id),
      reason: "User manually started Playit agent.",
      success: true
    });

    // Schedule health check in 5 seconds
    setTimeout(() => {
      runServerPlayitHealthCheck(id, {
        isManualTrigger: true,
        triggerUser: user.username || user.email || "Admin"
      }).catch(console.error);
    }, 5000);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to start Playit Tunnel", details: err.message });
  }
});

router.post("/:id/playit/stop", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
    const servers = JSON.parse(serversJSON);
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });

    await stopPlayitAgent(server);

    await addPlayitAudit({
      serverId: id,
      serverName: server.name || id,
      action: "agent_stop",
      trigger: "user_action",
      performedBy: user.username || user.email || "Admin",
      previousStatus: "healthy",
      newStatus: "agent_offline",
      playerCount: getTrackedPlayerCount(id),
      reason: "User manually stopped Playit agent.",
      success: true
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to stop Playit agent", details: err.message });
  }
});

router.post("/:id/playit/reset", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
    const servers = JSON.parse(serversJSON);
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });

    await resetPlayitAgent(server);

    await addPlayitAudit({
      serverId: id,
      serverName: server.name || id,
      action: "agent_reset",
      trigger: "user_action",
      performedBy: user.username || user.email || "Admin",
      previousStatus: "unknown",
      newStatus: "recovering",
      playerCount: getTrackedPlayerCount(id),
      reason: "User reset Playit agent secret to generate a new tunnel/claim code.",
      success: true
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset Playit agent", details: err.message });
  }
});

router.post("/:id/playit/test", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const diagnostics = await runServerPlayitHealthCheck(id, {
      isManualTrigger: true,
      triggerUser: user.username || user.email || "Admin"
    });
    res.json(diagnostics);
  } catch (err: any) {
    res.status(500).json({ error: "Health check failed", details: err.message });
  }
});

router.post("/:id/playit/restart", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { force } = req.body || {};

  try {
    const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
    const servers = JSON.parse(serversJSON);
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });

    const playerCount = getTrackedPlayerCount(id);
    if (playerCount > 0 && !force) {
      return res.status(400).json({
        error: "Players are currently online",
        playerCount,
        requiresConfirmation: true,
        message: `There are ${playerCount} active players online. Restarting Playit may disconnect them.`
      });
    }

    await stopPlayitAgent(server);
    await startPlayitAgent(server);

    await addPlayitAudit({
      serverId: id,
      serverName: server.name || id,
      action: "manual_restart",
      trigger: "user_action",
      performedBy: user.username || user.email || "Admin",
      previousStatus: "healthy",
      newStatus: "recovering",
      playerCount,
      reason: force ? "Admin forced Playit restart despite online players." : "Admin restarted Playit agent.",
      success: true
    });

    setTimeout(() => {
      runServerPlayitHealthCheck(id, {
        isManualTrigger: true,
        triggerUser: user.username || user.email || "Admin"
      }).catch(console.error);
    }, 5000);

    res.json({ success: true, message: "Playit agent restart initiated." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to restart Playit agent", details: err.message });
  }
});

router.post("/:id/playit/force-recover", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const diagnostics = await runServerPlayitHealthCheck(id, {
      isManualTrigger: true,
      triggerUser: user.username || user.email || "Admin",
      allowForce: true
    });
    res.json({ success: true, diagnostics });
  } catch (err: any) {
    res.status(500).json({ error: "Force recovery failed", details: err.message });
  }
});

router.get("/:id/playit/diagnostics", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const diagnostics = await runServerPlayitHealthCheck(id, {
      isManualTrigger: true,
      triggerUser: user.username || user.email || "Admin"
    });
    res.json(diagnostics);
  } catch (err: any) {
    res.status(500).json({ error: "Diagnostics retrieval failed", details: err.message });
  }
});

router.get("/:id/playit/audit", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    const auditLogs = await getPlayitAuditLogs(id);
    res.json({ auditLogs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load audit logs", details: err.message });
  }
});

// Sub-users endpoints
router.get("/:id/subusers", async (req, res) => {
  try {
    const { id } = req.params;
    const { readJSON } = await import("../services/db.js");
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server) return res.status(404).json({ error: "Server not found" });

    const users = await readJSON("users.json") || [];
    res.json({
      subUsers: server.subUsers || [],
      availableUsers: users.map((u: any) => ({ id: u.id, username: u.username }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/subusers", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, permissions } = req.body;
    const { readJSON, writeJSON } = await import("../services/db.js");
    const servers = await readJSON("servers.json") || [];
    const serverIndex = servers.findIndex((s: any) => s.id === id);
    if (serverIndex === -1) return res.status(404).json({ error: "Server not found" });

    if (!servers[serverIndex].subUsers) servers[serverIndex].subUsers = [];
    const subUserIndex = servers[serverIndex].subUsers.findIndex((su: any) => su.userId === userId);
    
    if (subUserIndex !== -1) {
      servers[serverIndex].subUsers[subUserIndex].permissions = permissions;
    } else {
      servers[serverIndex].subUsers.push({ userId, permissions });
    }

    await writeJSON("servers.json", servers);
    res.json({ success: true, subUsers: servers[serverIndex].subUsers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/subusers/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { readJSON, writeJSON } = await import("../services/db.js");
    const servers = await readJSON("servers.json") || [];
    const serverIndex = servers.findIndex((s: any) => s.id === id);
    if (serverIndex === -1) return res.status(404).json({ error: "Server not found" });

    if (!servers[serverIndex].subUsers) servers[serverIndex].subUsers = [];
    servers[serverIndex].subUsers = servers[serverIndex].subUsers.filter((su: any) => su.userId !== userId);

    await writeJSON("servers.json", servers);
    res.json({ success: true, subUsers: servers[serverIndex].subUsers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { createSftpUser, resetSftpPassword, getSftpUser, deleteSftpUser } from "../services/sftp.js";

// SFTP endpoints
router.get("/:id/sftp", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getSftpUser(id);
    if (!user) return res.status(404).json({ error: "SFTP user not found" });
    
    // We don't send the password hash, but we might want to generate a new temporary 
    // or just say it's hidden. But the UI expects the password to be returned upon creation/reset.
    // So for GET, we don't have the plaintext password. We'll return a placeholder.
    res.json({
      host: req.headers.host?.split(":")[0] || "127.0.0.1",
      port: 6868,
      username: user.username,
      password: "(Hidden - Reset to reveal)"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/sftp/create", async (req, res) => {
  try {
    const { id } = req.params;
    const creds = await createSftpUser(id);
    res.json({
      host: req.headers.host?.split(":")[0] || "127.0.0.1",
      port: 6868,
      username: creds.username,
      password: creds.password
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/sftp/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const creds = await resetSftpPassword(id);
    res.json({
      host: req.headers.host?.split(":")[0] || "127.0.0.1",
      port: 6868,
      username: creds.username,
      password: creds.password
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/sftp", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSftpUser(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/plugins/install", installPlugin);
router.post("/:id/mods/install", installMod);
export default router;
