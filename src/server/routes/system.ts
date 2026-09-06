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
  let diskUsage = 0;
  let diskTotal = 0;
  let diskUsed = 0;
  try {
    const { stdout } = await execPromise("df -k /");
    const lines = stdout.trim().split("\n");
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/);
      if (parts.length >= 6) {
        diskTotal = parseInt(parts[1]) * 1024; // KB to bytes
        diskUsed = parseInt(parts[2]) * 1024; // KB to bytes
        diskUsage = parseInt(parts[4].replace("%", "")) || 0;
      }
    }
  } catch (err) {}

  let netIn = 0;
  let netOut = 0;
  try {
    const fs = await import("fs/promises");
    const netDev = await fs.readFile("/proc/net/dev", "utf-8");
    const lines = netDev.trim().split("\n").slice(2);
    for (const line of lines) {
      const [iface, data] = line.split(":");
      if (!iface || !data || iface.trim() === "lo") continue;
      const parts = data.trim().split(/\s+/);
      if (parts.length >= 9) {
        netIn += parseInt(parts[0]) || 0;
        netOut += parseInt(parts[8]) || 0;
      }
    }
  } catch (err) {}

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const uptime = os.uptime();
  const cores = os.cpus().length;

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
    cores,
    uptime,
    netIn,
    netOut,
    totalMemory,
    freeMemory,
    ramUsage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    diskTotal,
    diskUsed,
    diskUsage,
    activeContainers,
    totalContainers
  });
});

router.get("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const users = await readJSON("users.json") || [];
  // never return passwords
  res.json(users.map((u: any) => ({ id: u.id, username: u.username, role: u.role || 'admin', isGoogleUser: !!u.googleId, createdAt: u.createdAt })));
});

router.post("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { username, password, role } = req.body;
  
  if (role === "owner") return res.status(403).json({ error: "Cannot create owner from panel" });
  if (user.role === "admin" && role === "admin") return res.status(403).json({ error: "Admin cannot create Admin" });
  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });

  const users = await readJSON("users.json") || [];
  if (users.find((u: any) => u.username === username)) return res.status(400).json({ error: "Username taken" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUserId = Date.now().toString();
  users.push({
    id: newUserId,
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString()
  });

  await writeJSON("users.json", users);
  res.json({ success: true, id: newUserId, username, role });
});

router.delete("/users/:id", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
    
  let users = await readJSON("users.json") || [];
  const targetUser = users.find((u: any) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: "User not found" });
  if (targetUser.role === "owner") return res.status(403).json({ error: "Cannot delete owner" });
  if (user.role === "admin" && targetUser.role === "admin") return res.status(403).json({ error: "Admin cannot delete Admin" });
  users = users.filter((u: any) => u.id !== req.params.id);
  await writeJSON("users.json", users);
  res.json({ success: true });
});



router.put("/users/:id/role", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin" && user.role !== "owner") return res.status(403).json({ error: "Forbidden"});
  const { newRole } = req.body;
  
  if (!newRole || !["admin", "user"].includes(newRole)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const users = await readJSON("users.json") || [];
  const targetIndex = users.findIndex((u: any) => u.id === req.params.id);
  if (targetIndex === -1) return res.status(404).json({ error: "User not found" });

  if (users[targetIndex].role === "owner") return res.status(403).json({ error: "Cannot modify owner" });
  if (user.role === "admin") return res.status(403).json({ error: "Admin cannot change roles" });

  users[targetIndex].role = newRole;
  await writeJSON("users.json", users);
  res.json({ success: true, role: newRole });
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
  if (users[targetIndex].role === "owner") return res.status(403).json({ error: "Cannot modify owner" });
  if (user.role === "admin" && users[targetIndex].role === "admin") return res.status(403).json({ error: "Admin cannot modify Admin" });
  if (targetIndex === -1) return res.status(404).json({ error: "User not found" });
  
  if (users[targetIndex].id === "temp-admin") {
    return res.status(400).json({ error: "Cannot change password of default admin account." });
  }

  if (users[targetIndex].googleId || !users[targetIndex].password) {
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
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId, defaultRuntime 
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
    if (process.env.PORT !== "3000") {
      return res.status(403).json({ error: "Runtime switching is only allowed in the Developer Panel (Port 3000)"});
    }
    settings.defaultRuntime = defaultRuntime;
  }

  await writeJSON("settings.json", settings);
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
    exec("NON_INTERACTIVE=true bash update.sh", (error, stdout, stderr) => {
      console.log(`Update stdout: ${stdout}`);
      console.error(`Update stderr: ${stderr}`);
    });
  }, 1000);
});





export default router;
