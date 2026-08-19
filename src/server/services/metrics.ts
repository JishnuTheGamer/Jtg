import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

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
