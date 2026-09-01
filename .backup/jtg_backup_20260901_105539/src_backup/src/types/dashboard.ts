export type ServerStatus = "online" | "offline" | "starting" | "error" | (string & {});

export interface ServerSummary {
  id: string;
  name: string;
  status: ServerStatus;
  createdAt: string;
  software?: string;
  version?: string;
  port?: number;
  ipAlias?: string;
  suspended?: boolean;
  owner?: string;
  memory?: number;
  cpu?: number;
  disk?: number;
}

export interface SystemStats {
  cpuUsage: number;
  cores?: number;
  ramUsage: number;
  totalMemory?: number;
  freeMemory?: number;
  diskUsage?: number;
  diskTotal?: number;
  diskUsed?: number;
  activeContainers?: number;
  totalContainers?: number;
  uptime?: number;
  netIn?: number;
  netOut?: number;
}

