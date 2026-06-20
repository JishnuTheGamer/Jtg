import { Request, Response } from "express";
import { readJSON, writeJSON } from "../services/db.js";
import { createServerContainer, startContainer, stopContainer, restartContainer, deleteContainer, getContainerStatus, sendContainerCommand, attachContainerSocket, getContainerStats } from "../services/docker.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import path from "path";

export const getServers = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  
  // Filter for normal users
  const userServers = user.role === "admin" ? servers : servers.filter((s: any) => s.owner === user.id);

  // Update statuses
  const updatedServers = await Promise.all(userServers.map(async (server: any) => {
    if (server.containerId) {
      const status = await getContainerStatus(server.containerId);
      server.status = status?.State?.Running ? "online" : "offline";
    }
    return server;
  }));

  res.json(updatedServers);
};

export const getServer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const status = await getContainerStatus(server.containerId);
  server.status = status?.State?.Running ? "online" : "offline";
  res.json(server);
};

export const getServerStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === id);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (user.role !== "admin" && server.owner !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (server.containerId) {
    const stats = await getContainerStats(server.containerId);
    res.json({
      ...stats,
      limitRam: server.ram ? server.ram * 1024 : 1024,
      limitCpu: server.cpu || 100,
      limitDisk: server.disk || 10
    });
  } else {
    res.json({ cpu: 0, ram: 0, disk: 0, limitRam: server.ram ? server.ram * 1024 : 1024, limitCpu: server.cpu || 100, limitDisk: server.disk || 10 });
  }
};

export const createServer = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create servers" });
  }

  const { name, ram, port, version, theme, cpu, disk } = req.body;
  if (!name || !ram || !port || !version || !cpu || !disk) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const id = uuidv4();
  const serverData = {
    id,
    name,
    owner: user.id, // Or whoever admin assigned, default to admin
    ram,
    cpu,
    disk,
    port,
    version,
    theme: theme || "default",
    status: "installing",
    createdAt: new Date().toISOString(),
    containerId: null,
  };

  const servers = await readJSON("servers.json") || [];
  servers.push(serverData);
  await writeJSON("servers.json", servers);

  try {
    const containerId = await createServerContainer(serverData);
    serverData.containerId = containerId;
    serverData.status = "offline";
    await writeJSON("servers.json", Object.assign(servers, servers.map((s:any)=>s.id===id?serverData:s)));
    res.json(serverData);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    let servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (user.role !== "admin" && server.owner !== user.id) {
      return res.status(403).json({ error: "Only admins or owners can delete servers" });
    }

    if (server.containerId) {
      await deleteContainer(server.containerId);
    }
    
    servers = servers.filter((s: any) => s.id !== id);
    await writeJSON("servers.json", servers);
    
    // Remove files
    const serverDir = path.join(process.cwd(), "data", "servers", id);
    try {
      await fs.remove(serverDir);
    } catch (e) {
      console.error("Failed to remove server directory", e);
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const startServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server || !server.containerId) {
      return res.status(404).json({ error: "Not found" });
    }
    await startContainer(server.containerId);
    await attachContainerSocket(server.containerId, server.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Start server error:", err);
    res.status(500).json({ error: err.message || "Failed to start server" });
  }
};

export const stopServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server || !server.containerId) {
      return res.status(404).json({ error: "Not found" });
    }
    await stopContainer(server.containerId);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Stop server error:", err);
    res.status(500).json({ error: err.message || "Failed to stop server" });
  }
};

export const restartServer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server || !server.containerId) {
      return res.status(404).json({ error: "Not found" });
    }
    await restartContainer(server.containerId);
    await attachContainerSocket(server.containerId, server.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Restart server error:", err);
    res.status(500).json({ error: err.message || "Failed to restart server" });
  }
};

export const sendCommand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === id);
    if (!server || !server.containerId) {
      return res.status(404).json({ error: "Not found" });
    }
    await sendContainerCommand(server.containerId, command);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Command error:", err);
    res.status(500).json({ error: err.message || "Failed to send command" });
  }
};

// File manager basics
export const getFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const dirPath = req.query.path ? String(req.query.path) : "/";
  const targetPath = path.join(process.cwd(), "data", "servers", id, dirPath);
  
  if (!targetPath.startsWith(path.join(process.cwd(), "data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    const stats = await fs.stat(targetPath).catch(() => null);
    if (!stats) {
      // Return empty if not found
      return res.json([]);
    }
    if (stats.isFile()) {
       const content = await fs.readFile(targetPath, "utf-8");
       return res.json({ isFile: true, content });
    }
    const files = await fs.readdir(targetPath, { withFileTypes: true });
    res.json(files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      size: f.isDirectory() ? 0 : fs.statSync(path.join(targetPath, f.name)).size
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const dirPath = req.body.path || "/";
  const targetPath = path.join(process.cwd(), "data", "servers", id, dirPath);
  
  if (req.file) {
    await fs.ensureDir(targetPath);
    await fs.move(req.file.path, path.join(targetPath, req.file.originalname), { overwrite: true });
  }
  res.json({ success: true });
};

export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const filePath = req.body.path;
  const targetPath = path.join(process.cwd(), "data", "servers", id, filePath);
  
  if (!targetPath.startsWith(path.join(process.cwd(), "data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.remove(targetPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const renameFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { oldPath, newPath } = req.body;

  const targetOldPath = path.join(process.cwd(), "data", "servers", id, oldPath);
  const targetNewPath = path.join(process.cwd(), "data", "servers", id, newPath);

  if (!targetOldPath.startsWith(path.join(process.cwd(), "data", "servers", id)) ||
      !targetNewPath.startsWith(path.join(process.cwd(), "data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.rename(targetOldPath, targetNewPath);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export const saveFileContent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filePath, content } = req.body;

  const targetPath = path.join(process.cwd(), "data", "servers", id, filePath);

  if (!targetPath.startsWith(path.join(process.cwd(), "data", "servers", id))) {
    return res.status(403).json({ error: "Invalid path" });
  }

  try {
    await fs.writeFile(targetPath, content, "utf-8");
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}