import axios from "axios";
import { GameServerRuntimeProvider } from "./runtimeProvider.js";
import { readJSON, writeJSON } from "./db.js";
import { panelEvents } from "../events.js";
import fs from "fs-extra";
import path from "path";

async function getWingsNode(nodeId: string) {
  const nodes = await readJSON("wings_nodes.json") || [];
  return nodes.find((n: any) => n.id === nodeId);
}

function getWingsClient(node: any) {
  let url = node.apiUrl;
  if (!url) {
    const protocol = node.ssl ? "https" : "http";
    url = `${protocol}://${node.hostname}:${node.apiPort || 8080}`;
  }
  return axios.create({
    baseURL: url,
    headers: {
      "Authorization": `Bearer ${node.token}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  });
}

export class WingsRuntimeProvider implements GameServerRuntimeProvider {
  async getNodeHealth(nodeId: string) {
    const node = await getWingsNode(nodeId);
    if (!node) throw new Error("Node not found");
    const client = getWingsClient(node);
    try {
      const res = await client.get("/api/system");
      return res.data;
    } catch (err: any) {
      throw new Error(`Wings Health Check Failed: ${err.message}`);
    }
  }

  async getNodeAllocations(nodeId: string) {
     return [];
  }

  async createServer(server: any): Promise<void> {
    const node = await getWingsNode(server.nodeId);
    if (!node) throw new Error("Node not found");
    const client = getWingsClient(node);

    let javaVersion = "java_17";
    if (server.version && server.version.startsWith("1.20.") && parseInt(server.version.split(".")[2] || "0") >= 5) {
       javaVersion = "java_21";
    } else if (server.version && server.version.startsWith("1.21")) {
       javaVersion = "java_21";
    }

    const image = server.dockerImage || `ghcr.io/pterodactyl/yolks:${javaVersion}`;

    const payload = {
      uuid: server.id,
      meta: {
        name: server.name || "Minecraft Server",
        description: "JTG Managed Server"
      },
      suspended: false,
      environment: {
        SERVER_JARFILE: server.jarFile || "server.jar"
      },
      invocation: server.startupCommand || "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
      skip_egg_scripts: true,
      build: {
        memory: server.memory || 1024,
        swap: 0,
        io: 500,
        cpu: server.cpu || 100,
        disk: server.disk || 10240,
        threads: null
      },
      container: {
        image: image
      },
      allocations: {
        default: {
          ip: server.ip || "0.0.0.0",
          port: server.port || 25565
        },
        mappings: {
          [server.ip || "0.0.0.0"]: [server.port || 25565]
        }
      }
    };

    await client.post("/api/servers", payload);
  }

  async deleteServer(serverId: string): Promise<void> {
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === serverId);
    if (!server || !server.nodeId) return;
    const node = await getWingsNode(server.nodeId);
    if (!node) return;
    const client = getWingsClient(node);
    await client.delete(`/api/servers/${serverId}`);
  }

  async startServer(serverId: string): Promise<void> {
    await this.sendPowerAction(serverId, "start");
  }

  async stopServer(serverId: string): Promise<void> {
    await this.sendPowerAction(serverId, "stop");
  }

  async restartServer(serverId: string): Promise<void> {
    await this.sendPowerAction(serverId, "restart");
  }

  async killServer(serverId: string): Promise<void> {
    await this.sendPowerAction(serverId, "kill");
  }
  
  async reinstallServer(serverId: string): Promise<void> {
    // wings doesn't directly support reinstall via power action, usually panel recreates it
  }

  private async sendPowerAction(serverId: string, action: string) {
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === serverId);
    if (!server || !server.nodeId) throw new Error("Server not found");
    const node = await getWingsNode(server.nodeId);
    if (!node) throw new Error("Node not found");
    const client = getWingsClient(node);
    await client.post(`/api/servers/${serverId}/power`, { action });
  }

  async getServerStatus(serverId: string): Promise<any> {
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === serverId);
    if (!server || !server.nodeId) return { State: { Running: false, Status: "exited" } };
    const node = await getWingsNode(server.nodeId);
    if (!node) return { State: { Running: false, Status: "exited" } };
    try {
      const client = getWingsClient(node);
      const res = await client.get(`/api/servers/${serverId}`);
      // parse wings state to match our expected format for now
      return { State: { Running: res.data.state !== "offline", Status: res.data.state } };
    } catch (e) {
      return { State: { Running: false, Status: "exited" } };
    }
  }

  async getServerStats(serverId: string): Promise<any> {
     // we'd normally connect to the wings websocket or use the system endpoint if one exists for single server
     return { cpu: 0, ram: 0, disk: 0 };
  }

  async getConsoleLogs(serverId: string): Promise<string> {
    return "[Wings] Logs not implemented via HTTP, usually WS.";
  }

  async subscribeToConsole(serverId: string, onData: (data: string) => void): Promise<() => void> {
    // We need to implement Wings Websocket connection
    return () => {};
  }

  async sendConsoleCommand(serverId: string, command: string): Promise<void> {
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === serverId);
    if (!server || !server.nodeId) return;
    const node = await getWingsNode(server.nodeId);
    if (!node) return;
    const client = getWingsClient(node);
    await client.post(`/api/servers/${serverId}/commands`, { command });
  }

  async listFiles(serverId: string, dir: string): Promise<any[]> { return []; }
  async uploadFile(serverId: string, dir: string, file: any): Promise<void> {}
  async downloadFile(serverId: string, filePath: string): Promise<any> { return null; }
  async extractArchive(serverId: string, archivePath: string, destDir: string): Promise<void> {}
  async createBackup(serverId: string): Promise<any> {}
  async restoreBackup(serverId: string, backupId: string): Promise<void> {}
  async importWorld(serverId: string, worldData: any): Promise<void> {}
  async exportWorld(serverId: string): Promise<any> {}
}
