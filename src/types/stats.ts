export type ServerRuntimeStatus = "running" | "offline" | "starting" | "stopping" | "unknown";
export type ServerMetricSource = "docker-container" | "local-java-process" | "local-process" | "unavailable";

export interface ServerMemoryStats {
  usedBytes: number;
  limitBytes: number;
  cacheBytes?: number;
  rawUsageBytes?: number;
  overLimit: boolean;
  includesHostMemory: false;
}

export interface ServerCpuStats {
  percent: number;
  includesHostCpu: false;
}

export interface ServerDiskStats {
  usedBytes: number;
  limitBytes?: number;
}

export interface ServerNetworkStats {
  rxBytes: number;
  txBytes: number;
}

/**
 * Strongly-typed individual server resource statistics contract.
 * Strictly isolates container / Java process resources from host VPS / Node.js panel memory.
 */
export interface ServerResourceStats {
  serverId: string;
  status: ServerRuntimeStatus;
  source: ServerMetricSource;
  collectedAt: string;

  memory: ServerMemoryStats;
  cpuStats?: ServerCpuStats;
  diskStats?: ServerDiskStats;
  network?: ServerNetworkStats;

  // Compatibility fields for legacy components
  cpu: number;
  ram: number; // in MB
  disk: number; // in GB
  limitRam: number; // in MB
  limitCpu: number;
  limitDisk: number; // in GB
  isRunning: boolean;
  uptimeSeconds: number;
  startedAt: string | null;
}

/**
 * Separate host/VPS metrics contract for Admin/System/Node views only.
 * Must never be substituted or mixed into ServerResourceStats.
 */
export interface HostResourceStats {
  totalMemoryBytes: number;
  usedMemoryBytes: number;
  freeMemoryBytes: number;
  cpuPercent: number;
  diskBytes: number;
  source: "host";
}

/**
 * Formats byte counts into clear, human-readable MB or GB strings according to standard rules:
 * - Under 1024 MB (< 1,073,741,824 bytes): display in MB
 * - At or above 1024 MB (>= 1,073,741,824 bytes): display in GB
 * - Always guards against NaN, Infinity, and negative values.
 */
export function formatBytesToDisplay(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || !isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const ONE_MB = 1024 * 1024;
  const ONE_GB = 1024 * 1024 * 1024;

  if (bytes < ONE_GB) {
    const mb = bytes / ONE_MB;
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  }

  const gb = bytes / ONE_GB;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Formats MB counts into clear display strings:
 * - Under 1024 MB: display in MB
 * - At or above 1024 MB: display in GB
 */
export function formatMBToDisplay(mb: number | null | undefined): string {
  if (mb === null || mb === undefined || isNaN(mb) || !isFinite(mb) || mb <= 0) {
    return "0 MB";
  }
  return formatBytesToDisplay(mb * 1024 * 1024);
}
