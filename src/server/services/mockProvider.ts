import { GameServerRuntimeProvider } from "./runtimeProvider.js";
import { readJSON, writeJSON } from "./db.js";
import fs from "fs-extra";
import path from "path";

export class MockRuntimeProvider implements GameServerRuntimeProvider {
  async createServer(server: any): Promise<void> {}
  async deleteServer(serverId: string): Promise<void> {}
  async startServer(serverId: string): Promise<void> {
     // Mock starting server
     const servers = await readJSON("servers.json") || [];
     const sIndex = servers.findIndex((s: any) => s.id === serverId);
     if (sIndex > -1) {
       servers[sIndex].status = "running";
       await writeJSON("servers.json", servers);
     }
  }
  async stopServer(serverId: string): Promise<void> {
     const servers = await readJSON("servers.json") || [];
     const sIndex = servers.findIndex((s: any) => s.id === serverId);
     if (sIndex > -1) {
       servers[sIndex].status = "stopped";
       await writeJSON("servers.json", servers);
     }
  }
  async restartServer(serverId: string): Promise<void> {}
  async killServer(serverId: string): Promise<void> {}
  async reinstallServer(serverId: string): Promise<void> {}
  async getServerStatus(serverId: string): Promise<any> {
    const servers = await readJSON("servers.json") || [];
    const server = servers.find((s: any) => s.id === serverId);
    return { State: { Running: server?.status === "running", Status: server?.status || "stopped" } };
  }
  async getServerStats(serverId: string): Promise<any> { return { cpu: 0, ram: 0, disk: 0 }; }
  async getConsoleLogs(serverId: string): Promise<string> { return "Mock Console Logs"; }
  async subscribeToConsole(serverId: string, onData: (data: string) => void): Promise<() => void> { return () => {}; }
  async sendConsoleCommand(serverId: string, command: string): Promise<void> {}
  async listFiles(serverId: string, dir: string): Promise<any[]> { return []; }
  async uploadFile(serverId: string, dir: string, file: any): Promise<void> {}
  async downloadFile(serverId: string, filePath: string): Promise<any> { return null; }
  async extractArchive(serverId: string, archivePath: string, destDir: string): Promise<void> {}
  async createBackup(serverId: string): Promise<any> {}
  async restoreBackup(serverId: string, backupId: string): Promise<void> {}
  async importWorld(serverId: string, worldData: any): Promise<void> {}
  async exportWorld(serverId: string): Promise<any> {}
  async getNodeHealth(nodeId: string): Promise<any> { return { status: "online", mock: true }; }
  async getNodeAllocations(nodeId: string): Promise<any> { return []; }
}
