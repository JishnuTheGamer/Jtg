import express from "express";
import { getVersions } from "../services/docker.js";
import { requireAuth } from "../middleware/auth.js";
import os from "os";
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

router.get("/stats", (req, res) => {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  
  res.json({
    cpuUsage: Math.round(os.loadavg()[0] * 100) / 100, // rough approx
    totalMemory,
    freeMemory,
    ramUsage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    diskUsage: 0, // Mocked for now
  });
});

router.get("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin") return res.status(403).json({ error: "Forbidden"});
  const users = await readJSON("users.json") || [];
  // never return passwords
  res.json(users.map((u: any) => ({ id: u.id, username: u.username, role: u.role || 'admin', createdAt: u.createdAt })));
});

router.post("/users", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin") return res.status(403).json({ error: "Forbidden"});
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });

  const users = await readJSON("users.json") || [];
  if (users.find((u: any) => u.username === username)) return res.status(400).json({ error: "Username taken" });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({
    id: Date.now().toString(),
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString()
  });

  await writeJSON("users.json", users);
  res.json({ success: true });
});

router.delete("/users/:id", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin") return res.status(403).json({ error: "Forbidden"});
  
  let users = await readJSON("users.json") || [];
  users = users.filter((u: any) => u.id !== req.params.id);
  await writeJSON("users.json", users);
  res.json({ success: true });
});

router.put("/settings", async (req, res) => {
  const user = (req as any).user;
  if(user.role !== "admin") return res.status(403).json({ error: "Forbidden"});
  const { panelName } = req.body;
  const settings = await readJSON("settings.json") || {};
  settings.panelName = panelName || "JTG Panel";
  await writeJSON("settings.json", settings);
  res.json({ success: true });
});

export default router;
