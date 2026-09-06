import { Router } from "express";
import { readJSON, writeJSON } from "../services/db.js";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";
import axios from "axios";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const wingsNodes = (await readJSON("wings_nodes.json")) || [];
    const customNodes = (await readJSON("nodes.json")) || [];
    
    const localNode = {
      id: "local",
      name: "Built-in Node (Local)",
      ip: "127.0.0.1",
      hostname: "localhost",
      apiPort: 3000,
      memory: 0,
      disk: 0,
      cpu: 0,
      isLocal: true,
      status: "online"
    };

    const safeWings = wingsNodes.map((n: any) => ({ ...n, token: undefined, key: undefined, ip: n.hostname || n.ip }));
    const safeCustom = customNodes.map((n: any) => ({ ...n, key: undefined }));

    res.json([localNode, ...safeCustom, ...safeWings]);
  } catch (err) {
    console.error("Error loading nodes:", err);
    res.status(500).json({ error: "Failed to load nodes" });
  }
});

router.post("/", async (req, res) => {
  const user = (req as any).user;
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  
  try {
    const nodes = (await readJSON("wings_nodes.json")) || [];
    const newNode = {
      id: uuidv4(),
      name: String(req.body.name || "Wings Node").trim(),
      hostname: String(req.body.hostname || req.body.ip || "").trim(),
      ip: String(req.body.hostname || req.body.ip || "").trim(),
      apiUrl: String(req.body.apiUrl || "").trim(),
      port: Number(req.body.apiPort || req.body.port || 8080),
      apiPort: Number(req.body.apiPort || req.body.port || 8080),
      key: req.body.token || req.body.key || "",
      token: req.body.token || req.body.key || "",
      protocol: req.body.ssl ? "https" : "http",
      connectionMode: "direct",
      memory: Number(req.body.memory) || 0,
      disk: Number(req.body.disk) || 0,
      cpu: Number(req.body.cpu) || 0,
      location: req.body.location || "Default",
      createdAt: new Date().toISOString()
    };
    nodes.push(newNode);
    await writeJSON("wings_nodes.json", nodes);
    res.json({ success: true, node: { ...newNode, token: undefined } });
  } catch (err) {
    console.error("Error creating node:", err);
    res.status(500).json({ error: "Failed to save node" });
  }
});

router.get("/:id/health", async (req, res) => {
  const nodes = (await readJSON("wings_nodes.json")) || [];
  const node = nodes.find((item: any) => item.id === req.params.id);
  if (!node) return res.status(404).json({ error: "Node not found" });
  try {
    const baseUrl = node.apiUrl || `${node.protocol || "http"}://${node.hostname || node.ip}:${node.apiPort || node.port || 8080}`;
    await axios.get(`${baseUrl.replace(/\/$/, "")}/api/servers`, { headers: { Authorization: `Bearer ${node.token || node.key}` }, timeout: 5000 });
    res.json({ status: "healthy", message: "Wings node online" });
  } catch (error: any) {
    res.status(502).json({ status: "offline", error: error.response?.data?.message || error.message || "Wings node unavailable" });
  }
});

router.delete("/:id", async (req, res) => {
  const user = (req as any).user;
  if (!user || (user.role !== "admin" && user.role !== "owner")) return res.status(403).json({ error: "Forbidden" });
  const nodes = (await readJSON("wings_nodes.json")) || [];
  const nextNodes = nodes.filter((node: any) => node.id !== req.params.id);
  if (nextNodes.length === nodes.length) return res.status(404).json({ error: "Node not found" });
  await writeJSON("wings_nodes.json", nextNodes);
  res.json({ success: true });
});

export default router;
