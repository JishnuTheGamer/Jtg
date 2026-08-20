import fs from "fs-extra";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { ServerMemoryStats, ServerCpuStats, ServerResourceStats, HostResourceStats } from "../../types/stats.js";

const execAsync = promisify(exec);

// Cache disk usage for a few seconds to avoid high disk I/O on fast polling
const diskCache = new Map<string, { gb: number; timestamp: number }>();
const DISK_CACHE_TTL_MS = 3000;

/**
 * Calculates exact disk space used by a server in Gigabytes (GB)
 */
export const getServerDiskUsageGB = async (serverId: string): Promise<number> => {
  if (!serverId) return 0.05;

  const now = Date.now();
  const cached = diskCache.get(serverId);
  if (cached && now - cached.timestamp < DISK_CACHE_TTL_MS) {
    return cached.gb;
  }

  const serverDir = path.join(process.cwd(), ".data", "servers", serverId);
  let diskGB = 0.05;

  try {
    if (await fs.pathExists(serverDir)) {
      try {
        // Fast Linux / Unix disk usage lookup in kilobytes
        const { stdout } = await execAsync(`du -sk "${serverDir}" 2>/dev/null`);
        const kb = parseInt(stdout.trim().split(/\s+/)[0], 10);
        if (!isNaN(kb) && kb >= 0) {
          diskGB = parseFloat((kb / (1024 * 1024)).toFixed(2));
        }
      } catch {
        // Fallback: Node fs recursive sizing
        let totalBytes = 0;
        const traverse = async (dir: string) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await traverse(p);
            } else {
              const st = await fs.stat(p).catch(() => null);
              if (st) totalBytes += st.size;
            }
          }
        };
        await traverse(serverDir);
        diskGB = parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
      }
    }
  } catch (err) {
    diskGB = 0.05;
  }

  // Minimum friendly visual floor of 0.01 GB if directory exists with files
  if (diskGB <= 0) diskGB = 0.01;

  diskCache.set(serverId, { gb: diskGB, timestamp: now });
  return diskGB;
};

/**
 * Calculates memory usage for a Docker Minecraft container.
 * 
 * Rules:
 * 1. Strictly measures only the specific container's cgroup memory usage.
 * 2. Subtracts file cache / inactive_file memory (Linux OS disk buffers), ensuring
 *    only active container RSS and Java allocations are reported.
 * 3. Never falls back to or includes host VPS memory or Node.js panel memory.
 * 4. Uses the server's configured JTG RAM allocation as the display limit.
 * 5. If actual container usage exceeds configured limit, marks overLimit: true.
 */
export function calculateDockerMemoryStats(statsResult: any, configuredRamGB: number): ServerMemoryStats {
  const memoryStats = statsResult?.memory_stats || {};
  const memoryDetails = (memoryStats.stats as Record<string, any>) || {};

  // Linux cgroup memory cache (cgroup v1: cache or total_inactive_file; cgroup v2: inactive_file)
  const cacheBytes =
    Number(memoryDetails.cache) ||
    Number(memoryDetails.inactive_file) ||
    Number(memoryDetails.total_inactive_file) ||
    0;

  const rawUsageBytes = Number(memoryStats.usage) || 0;
  
  // Active container memory (RAM used by Java process + container runtime, excluding reclaimable file cache)
  const containerUsedBytes = Math.max(0, rawUsageBytes - cacheBytes);

  // Use the JTG configured allocation as the display limit (e.g. 4GB = 4 * 1024 * 1024 * 1024)
  const ramGB = typeof configuredRamGB === "number" && configuredRamGB > 0 ? configuredRamGB : 2;
  const configuredLimitBytes = Math.round(ramGB * 1024 * 1024 * 1024);

  const overLimit = containerUsedBytes > configuredLimitBytes;

  return {
    usedBytes: containerUsedBytes,
    limitBytes: configuredLimitBytes,
    cacheBytes,
    rawUsageBytes,
    overLimit,
    includesHostMemory: false
  };
}

/**
 * Calculates memory usage for local/native Java Minecraft processes.
 * 
 * Rules:
 * 1. Strictly measures only the target Minecraft Java PID and its child process tree.
 * 2. Never includes Node.js panel process or VPS host memory.
 * 3. Uses the configured JTG RAM allocation as the display limit.
 */
export function calculateLocalMemoryStats(
  pidsUsage: Array<{ memory?: number }>,
  configuredRamGB: number
): ServerMemoryStats {
  let totalUsedBytes = 0;
  for (const usage of pidsUsage) {
    if (usage && typeof usage.memory === "number" && usage.memory > 0) {
      totalUsedBytes += usage.memory;
    }
  }

  const ramGB = typeof configuredRamGB === "number" && configuredRamGB > 0 ? configuredRamGB : 2;
  const configuredLimitBytes = Math.round(ramGB * 1024 * 1024 * 1024);
  const overLimit = totalUsedBytes > configuredLimitBytes;

  return {
    usedBytes: totalUsedBytes,
    limitBytes: configuredLimitBytes,
    cacheBytes: 0,
    rawUsageBytes: totalUsedBytes,
    overLimit,
    includesHostMemory: false
  };
}

/**
 * Host/VPS stats collector. Strictly isolated from individual server metrics.
 */
export async function getHostResourceStats(): Promise<HostResourceStats> {
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);

  let cpuPercent = 0;
  try {
    const startCpus = os.cpus();
    await new Promise((r) => setTimeout(r, 100));
    const endCpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    for (let i = 0; i < startCpus.length; i++) {
      const start = startCpus[i].times;
      const end = endCpus[i].times;
      const startTick = start.user + start.nice + start.sys + start.idle + start.irq;
      const endTick = end.user + end.nice + end.sys + end.idle + end.irq;
      totalIdle += end.idle - start.idle;
      totalTick += endTick - startTick;
    }
    cpuPercent = totalTick > 0 ? Math.max(0, Math.min(100, Math.round(100 - (100 * totalIdle) / totalTick))) : 0;
  } catch {}

  let diskBytes = 0;
  try {
    const { stdout } = await execAsync("df -k /home 2>/dev/null || df -k / 2>/dev/null");
    const lines = stdout.trim().split("\n");
    if (lines.length > 1) {
      const parts = lines[1].trim().split(/\s+/);
      const usedKB = parseInt(parts[2], 10);
      if (!isNaN(usedKB)) diskBytes = usedKB * 1024;
    }
  } catch {}

  return {
    totalMemoryBytes,
    usedMemoryBytes,
    freeMemoryBytes,
    cpuPercent,
    diskBytes,
    source: "host"
  };
}
