import express from "express";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { getServers, createServer, getServer, deleteServer, startServer, stopServer, restartServer, changeServerVersion, getFiles, uploadFile, deleteFile, renameFile, saveFileContent, sendCommand, getServerStats, updateOwner, updateIpAlias, getBackups, createBackup, downloadBackup, deleteBackup, unzipFile, zipFiles, installPlugin, installMod } from "../controllers/servers.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), ".data/temp/") });

router.use(requireAuth);

router.get("/", getServers);
router.post("/", createServer);
router.get("/:id", getServer);
router.get("/:id/stats", getServerStats);
router.delete("/:id", deleteServer);
router.put("/:id/owner", updateOwner);
router.put("/:id/ipalias", updateIpAlias);

router.put("/:id/version", changeServerVersion);

router.post("/:id/start", startServer);
router.post("/:id/stop", stopServer);
router.post("/:id/restart", restartServer);
router.post("/:id/command", sendCommand);

// Simple file endpoints
router.get("/:id/files", getFiles);
router.post("/:id/files/upload", upload.single("file"), uploadFile);
router.post("/:id/files/rename", renameFile);
router.post("/:id/files/save", saveFileContent);
router.post("/:id/files/unzip", unzipFile);
router.post("/:id/files/zip", zipFiles);
router.delete("/:id/files", deleteFile);

// Backup endpoints
router.get("/:id/backups", getBackups);
router.post("/:id/backups", createBackup);
router.get("/:id/backups/:filename", downloadBackup);
router.delete("/:id/backups/:filename", deleteBackup);


router.get("/:id/playit", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  const serverName = server ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : id;
  const pm2Name = `playit_${serverName}`;
  
  const { exec } = await import("child_process"); console.log("running exec..."); 
  
  exec("npx pm2 jlist", (err, stdout) => {
    let status = "stopped";
    try {
      const jsonStart = stdout.indexOf('[');
      const jsonEnd = stdout.lastIndexOf(']');
      const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? stdout.substring(jsonStart, jsonEnd + 1) : stdout;
      const pm2List = JSON.parse(jsonStr);
      const playitProcess = pm2List.find((p: any) => p.name === pm2Name);
      if (playitProcess && playitProcess.pm2_env && playitProcess.pm2_env.status === "online") {
        status = "running";
      }
    } catch (e) {}

    if (status === "running") {
      exec(`npx pm2 logs ${pm2Name} --nostream --lines 100`, (err, logStdout, logStderr) => {
        const logs = (logStdout || "").replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b./g, "");
        const claimLinkMatches = logs.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9]+/g);
        res.json({
          status,
          claimLink: claimLinkMatches ? claimLinkMatches[claimLinkMatches.length - 1] : null,
          logs: logs.split('\n').slice(-50).join('\n')
        });
      });
    } else {
      res.json({ status: "stopped", claimLink: null, logs: "" });
    }
  });
});

router.post("/:id/playit/start", async (req, res) => { 
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  const serverName = server ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : id;
  const pm2Name = `playit_${serverName}`;
  
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const playitBin = path.join(serverDir, `playit_${serverName}`);
  const secretPath = path.join(serverDir, "playit.toml");
  
  const { exec } = await import("child_process");
  
  const setupCmd = `mkdir -p "${serverDir}"; if [ ! -f "${playitBin}" ]; then wget -qO "${playitBin}" "https://github.com/playit-cloud/playit-agent/releases/download/v0.15.26/playit-linux-amd64" && chmod +x "${playitBin}"; fi`;
  
  exec(`npx pm2 delete ${pm2Name} || true; npx pm2 flush ${pm2Name} || true; ${setupCmd} && npx pm2 start "${playitBin}" --name ${pm2Name} -- -s --secret_path "${secretPath}" && npx pm2 save`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: "Failed to start Playit Tunnel", details: stderr });
    }
    res.json({ success: true });
  });
});

router.post("/:id/playit/stop", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  const serverName = server ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : id;
  const pm2Name = `playit_${serverName}`;
  
  const { exec } = await import("child_process");
  
  exec(`npx pm2 delete ${pm2Name} && npx pm2 save`, (err, stdout, stderr) => {
    res.json({ success: true });
  });
});

router.post("/:id/playit/reset", async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const serversJSON = await (await import("fs/promises")).readFile(path.join(process.cwd(), ".data", "servers.json"), "utf8");
  const servers = JSON.parse(serversJSON);
  const server = servers.find((s: any) => s.id === id);
  const serverName = server ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : id;
  const pm2Name = `playit_${serverName}`;
  const serverDir = path.join(process.cwd(), ".data", "servers", id);
  const secretPath = path.join(serverDir, "playit.toml");

  const { exec } = await import("child_process");

  exec(`npx pm2 delete ${pm2Name} || true; npx pm2 flush ${pm2Name} || true; rm -f "${secretPath}" && npx pm2 save`, (err, stdout, stderr) => {
    res.json({ success: true });
  });
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

router.post("/:id/plugins/install", installPlugin);
router.post("/:id/mods/install", installMod);
export default router;
