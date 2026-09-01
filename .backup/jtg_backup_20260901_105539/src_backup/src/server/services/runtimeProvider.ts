export interface GameServerRuntimeProvider {
  createServer(server: any): Promise<void>;
  deleteServer(serverId: string): Promise<void>;
  startServer(serverId: string): Promise<void>;
  stopServer(serverId: string): Promise<void>;
  restartServer(serverId: string): Promise<void>;
  killServer(serverId: string): Promise<void>;
  reinstallServer(serverId: string): Promise<void>;
  getServerStatus(serverId: string): Promise<any>;
  getServerStats(serverId: string): Promise<any>;
  getConsoleLogs(serverId: string): Promise<string>;
  subscribeToConsole(serverId: string, onData: (data: string) => void): Promise<() => void>;
  sendConsoleCommand(serverId: string, command: string): Promise<void>;
  listFiles(serverId: string, dir: string): Promise<any[]>;
  uploadFile(serverId: string, dir: string, file: any): Promise<void>;
  downloadFile(serverId: string, filePath: string): Promise<any>;
  extractArchive(serverId: string, archivePath: string, destDir: string): Promise<void>;
  createBackup(serverId: string): Promise<any>;
  restoreBackup(serverId: string, backupId: string): Promise<void>;
  importWorld(serverId: string, worldData: any): Promise<void>;
  exportWorld(serverId: string): Promise<any>;
  getNodeHealth(nodeId: string): Promise<any>;
  getNodeAllocations(nodeId: string): Promise<any>;
}
