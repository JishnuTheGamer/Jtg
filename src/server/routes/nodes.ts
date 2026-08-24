import express from "express";
import crypto from "crypto";
import { readJSON, writeJSON } from "../services/db.js";
import { requireAdmin } from "../middleware/auth.js";
import { getDocker } from "../services/docker.js";

const router = express.Router();
const NODES_FILE = "nodes.json";

// Initialize nodes file
const initNodes = async () => {
  let nodes = await readJSON(NODES_FILE);
  if (!nodes) {
    nodes = [
      {
        id: "local",
        name: "Local Node",
        ip: "127.0.0.1",
        port: 6767,
        key: "local",
        isLocal: true,
        status: "online",
        createdAt: new Date().toISOString()
      }
    ];
    await writeJSON(NODES_FILE, nodes);
  }
};
initNodes();

router.use(requireAdmin);

router.get("/", async (req, res) => {
  let nodes = await readJSON(NODES_FILE) || [];
  
  // Test connection to each node
  nodes = await Promise.all(nodes.map(async (node: any) => {
    if (node.isLocal) {
      node.status = "online";
      return node;
    }
    
    try {
      const docker = await getDocker(node.id);
      await docker.ping();
      node.status = "online";
    } catch (e: any) {
      console.error(`Ping failed for node ${node.id}:`, e.message || e);
      node.status = "offline";
    }
    return node;
  }));
  
  res.json(nodes);
});

router.post("/", async (req, res) => {
  const { name, ip, port, key } = req.body;

  if (!name || !ip || !key) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const nodes = await readJSON(NODES_FILE) || [];
  
  const newNode = {
    id: crypto.randomBytes(8).toString("hex"),
    name,
    ip,
    port: port ? Number(port) : 6768,
    key,
    isLocal: false,
    status: "connecting",
    createdAt: new Date().toISOString()
  };

  nodes.push(newNode);
  await writeJSON(NODES_FILE, nodes);
  res.json(newNode);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (id === "local") return res.status(400).json({ error: "Cannot delete local node" });
  
  const nodes = await readJSON(NODES_FILE) || [];
  const filtered = nodes.filter((n: any) => n.id !== id);
  await writeJSON(NODES_FILE, filtered);
  res.json({ success: true });
});

export default router;
