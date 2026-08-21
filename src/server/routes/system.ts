import express from "express";
import { getVersions } from "../services/docker.js";
import { requireAuth } from "../middleware/auth.js";
import os from "os";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);
import { readJSON, writeJSON } from "../services/db.js";
import bcrypt from "bcryptjs";

const router = express.Router();

router.use(requireAuth);

router.get("/versions", async (req, res) => {
  const type = (req.query.type as string) || "PAPER";
  const versions = await getVersions(type);
  res.json(versions);
});

// Deprecated endpoint for backward compatibility
router.get("/paper-versions", async (req, res) => {
  const versions = await getVersions("PAPER");
  res.json(versions);
});

import { getDocker, isSandbox, mockState } from "../services/docker.js";

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startCpus = os.cpus();
    setTimeout(() => {
      const endCpus = os.cpus();
      let totalIdle = 0, totalTick = 0;
      
      for (let i = 0, len = startCpus.length; i < len; i++) {
        const start = startCpus[i].times;
        const end = endCpus[i].times;
        
        const startTick = start.user + start.nice + start.sys + start.idle + start.irq;
        const endTick = end.user + end.nice + end.sys + end.idle + end.irq;
        
        const idle = end.idle - start.idle;
        const total = endTick - startTick;
        
        totalIdle += idle;
        totalTick += total;
      }
      
      const usage = 100 - ~~(100 * totalIdle / totalTick);
      resolve(usage);
    }, 100);
  });
}

router.get("/stats", async (req, res) => {
  let diskSpace = 0;
  try {
    const { stdout } = await execPromise("df -h /home");
    const lines = stdout.split("\n");
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/);
      if (parts.length >= 5) {
        diskSpace = parseInt(parts[4].replace("%", "")) || 0;
      }
    }
  } catch (err) {}
  
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  
  let cpuUsage = await getCpuUsage();
  
  let activeContainers = 0;
  let totalContainers = 0;
  
  try {
    if (isSandbox) {
       totalContainers = Object.keys(mockState).length;
       activeContainers = Object.values(mockState).filter(v => v).length;
    } else {
       const docker = await getDocker();
       const containers = await docker.listContainers({ all: true });
       totalContainers = containers.length;
       activeContainers = containers.filter(c => c.State === 'running').length;
    }
  } catch (err) {
     // fallback
  }
  
  res.json({
    cpuUsage: cpuUsage,
    totalMemory,
    freeMemory,
    ramUsage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    diskUsage: diskSpace,
    activeContainers,
    totalContainers
  });
});

router.get("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const users = await readJSON("users.json") || [];
  // never return passwords
  res.json(users.map((u: any) => ({ id: u.id, username: u.username, role: u.role || 'user', isGoogleUser: !!u.googleId, createdAt: u.createdAt })));
});

router.post("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });

  const targetRole = role.toLowerCase().trim();
  if (!["admin", "user"].includes(targetRole)) {
    return res.status(400).json({ error: "Invalid role. Role must be 'admin' or 'user'." });
  }

  // RBAC rule: Admins can ONLY create normal users ('user'). Only Owner can create admins.
  if (user.role === "admin" && targetRole !== "user") {
    return res.status(403).json({ error: "Admins can only create normal member accounts. Only the Owner can create Admins." });
  }

  const users = await readJSON("users.json") || [];
  if (users.find((u: any) => u.username?.toLowerCase() === username.toLowerCase().trim())) {
    return res.status(400).json({ error: "Username already taken" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUserId = Date.now().toString();
  users.push({
    id: newUserId,
    username: username.trim(),
    password: hashedPassword,
    role: targetRole,
    createdAt: new Date().toISOString()
  });

  await writeJSON("users.json", users);
  res.json({ success: true, id: newUserId, username: username.trim(), role: targetRole });
});

router.put("/users/:id/role", async (req, res) => {
  const user = (req as any).user;
  // RBAC rule: ONLY Owner can change user roles (e.g. Admin to Normal, or Normal to Admin). Admin cannot change roles.
  if (user.role !== "owner") {
    return res.status(403).json({ error: "Forbidden: Only the Owner can change user roles." });
  }

  const { role } = req.body;
  const targetRole = role?.toLowerCase()?.trim();
  if (!["admin", "user"].includes(targetRole)) {
    return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'user'." });
  }

  const users = await readJSON("users.json") || [];
  const targetIndex = users.findIndex((u: any) => u.id === req.params.id);
  if (targetIndex === -1) return res.status(404).json({ error: "User not found" });

  if (users[targetIndex].role === "owner" && targetIndex === 0) {
    return res.status(400).json({ error: "Cannot change the role of the primary Owner account." });
  }

  users[targetIndex].role = targetRole;
  users[targetIndex].updatedAt = new Date().toISOString();
  await writeJSON("users.json", users);

  res.json({ success: true, user: { id: users[targetIndex].id, username: users[targetIndex].username, role: targetRole } });
});

router.delete("/users/:id", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  
  let users = await readJSON("users.json") || [];
  const targetUser = users.find((u: any) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  if (targetUser.id === user.id) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  // RBAC rule: Admin CANNOT delete owner user.
  if (targetUser.role === "owner") {
    return res.status(403).json({ error: "Owner accounts cannot be deleted." });
  }

  // RBAC rule: Admin can ONLY delete normal users (members), NOT other admins.
  if (user.role === "admin" && targetUser.role === "admin") {
    return res.status(403).json({ error: "Admins cannot delete other Admin accounts." });
  }

  users = users.filter((u: any) => u.id !== req.params.id);
  await writeJSON("users.json", users);
  res.json({ success: true });
});


router.put("/users/:id/password", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  
  const users = await readJSON("users.json") || [];
  const targetIndex = users.findIndex((u: any) => u.id === req.params.id);
  if (targetIndex === -1) return res.status(404).json({ error: "User not found" });
  
  const targetUser = users[targetIndex];

  // RBAC rule: Admins cannot change owner password
  if (user.role === "admin" && targetUser.role === "owner") {
    return res.status(403).json({ error: "Admins cannot modify Owner credentials." });
  }

  // Admins cannot change other admin passwords
  if (user.role === "admin" && targetUser.role === "admin" && targetUser.id !== user.id) {
    return res.status(403).json({ error: "Admins cannot modify other Admin credentials." });
  }

  if (targetUser.id === "temp-admin") {
    return res.status(400).json({ error: "Cannot change password of default admin account." });
  }

  if (targetUser.googleId || !targetUser.password) {
    return res.status(400).json({ error: "Cannot change password for Google authenticated accounts." });
  }
  
  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.default.hash(newPassword, 10);
  users[targetIndex].password = hashedPassword;
  users[targetIndex].passwordVersion = (users[targetIndex].passwordVersion || 0) + 1;
  await writeJSON("users.json", users);
  res.json({ success: true });
});

router.put("/settings", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { 
    panelName, panelLogo, panelBackgroundImage, panelBackgroundBlur, 
    enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme,
    enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId,
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId, defaultRuntime,
    playitServiceMode, playitServiceName, healthCheckIntervalMinutes,
    restartDelaySeconds, maxRecoveryAttempts, allowRecoveryWhilePlayersOnline
  } = req.body;
  const settings = await readJSON("settings.json") || {};
  if (panelName !== undefined) {
    settings.panelName = panelName || "JTG Panel";
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const targetPaths = [
        path.join(process.cwd(), "index.html"),
        path.join(process.cwd(), "dist", "index.html")
      ];
      for (const p of targetPaths) {
        try {
          let html = await fs.readFile(p, "utf-8");
          html = html.replace(/<title>.*<\/title>/i, `<title>${settings.panelName}</title>`);
          await fs.writeFile(p, html, "utf-8");
        } catch (e) {
          // Ignore if file doesn't exist
        }
      }
    } catch (err) {
      console.error("Error updating html title:", err);
    }
  }
  if (panelLogo !== undefined) settings.panelLogo = panelLogo;
  if (panelBackgroundImage !== undefined) settings.panelBackgroundImage = panelBackgroundImage;
  if (panelBackgroundBlur !== undefined) settings.panelBackgroundBlur = panelBackgroundBlur;
  if (enablePlayit !== undefined) settings.enablePlayit = enablePlayit;
  if (enableTutorial !== undefined) settings.enableTutorial = enableTutorial;
  if (enableLoginAnimation !== undefined) settings.enableLoginAnimation = enableLoginAnimation;
  if (enableRegistration !== undefined) settings.enableRegistration = enableRegistration;
  if (theme !== undefined) settings.theme = theme;
  if (enableGoogleLogin !== undefined) settings.enableGoogleLogin = enableGoogleLogin;
  if (firebaseApiKey !== undefined) settings.firebaseApiKey = firebaseApiKey;
  if (firebaseAuthDomain !== undefined) settings.firebaseAuthDomain = firebaseAuthDomain;
  if (firebaseProjectId !== undefined) settings.firebaseProjectId = firebaseProjectId;
  if (firebaseStorageBucket !== undefined) settings.firebaseStorageBucket = firebaseStorageBucket;
  if (firebaseMessagingSenderId !== undefined) settings.firebaseMessagingSenderId = firebaseMessagingSenderId;
  if (firebaseAppId !== undefined) settings.firebaseAppId = firebaseAppId;

  if (defaultRuntime !== undefined) {
    settings.defaultRuntime = defaultRuntime;
  }

  let playitConfigChanged = false;
  if (playitServiceMode !== undefined) {
    settings.playitServiceMode = playitServiceMode;
    playitConfigChanged = true;
  }
  if (playitServiceName !== undefined) {
    settings.playitServiceName = String(playitServiceName).replace(/[^a-zA-Z0-9_-]/g, "");
    playitConfigChanged = true;
  }
  if (healthCheckIntervalMinutes !== undefined) {
    settings.healthCheckIntervalMinutes = Math.max(1, Math.min(60, Number(healthCheckIntervalMinutes) || 5));
    playitConfigChanged = true;
  }
  if (restartDelaySeconds !== undefined) {
    settings.restartDelaySeconds = Math.max(5, Math.min(120, Number(restartDelaySeconds) || 20));
  }
  if (maxRecoveryAttempts !== undefined) {
    settings.maxRecoveryAttempts = Math.max(1, Math.min(10, Number(maxRecoveryAttempts) || 3));
  }
  if (allowRecoveryWhilePlayersOnline !== undefined) {
    settings.allowRecoveryWhilePlayersOnline = allowRecoveryWhilePlayersOnline === true;
  }

  await writeJSON("settings.json", settings);

  if (playitConfigChanged) {
    try {
      const { reloadPlayitHealthMonitor } = await import("../services/playitHealth.js");
      await reloadPlayitHealthMonitor();
    } catch (err) {
      console.warn("Could not reload playit health monitor:", err);
    }
  }

  req.app.get("io")?.emit("settings_updated");
  res.json({ success: true, defaultRuntime: settings.defaultRuntime });
});

router.post("/update", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});

  // Broadcast to all clients to refresh in a few seconds
  const io = req.app.get("io");
  if (io) {
    io.emit("system_update_started");
  }

  res.json({ success: true, message: "Update process started" });

  const { exec } = await import("child_process");
  setTimeout(() => {
    exec("bash update.sh", (error, stdout, stderr) => {
      console.log(`Update stdout: ${stdout}`);
      console.error(`Update stderr: ${stderr}`);
    });
  }, 1000);
});





router.post("/client-error", (req, res) => {
  const { message, stack, componentStack, url, userAgent, timestamp } = req.body || {};
  console.warn(`[Client UI Error] ${timestamp || new Date().toISOString()} - ${message || 'Unknown error'} (${url || 'unknown'})`);
  if (stack) {
    console.warn(`[Client Stack] ${stack}`);
  }
  res.json({ received: true });
});

export default router;
