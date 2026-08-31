import { Router } from "express";
import { readJSON, writeJSON } from "../services/db.js";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth.js";

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
      memory: 8192,
      disk: 50000,
      isLocal: true,
      status: "online"
    };

    const safeWings = wingsNodes.map((n: any) => ({ ...n, token: undefined, ip: n.hostname || n.ip }));
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
      ...req.body,
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
  res.json({ status: "healthy", message: "Node online" });
});

export default router;
