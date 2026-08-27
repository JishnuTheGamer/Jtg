const fs = require('fs');
let text = fs.readFileSync("src/server/services/docker.ts", "utf8");

const old_func = `export const getContainerStats = async (containerId: string, nodeId?: string) => {
  const docker = await getDocker(nodeId);
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    if (!mockState[id]) return { cpu: 0, ram: 0, disk: 0 };
    
    // Stable pseudo-random mock stats based on time so it fluctuates realistically
    const timeSec = Math.floor(Date.now() / 5000);
    const floatPseudo = (Math.sin(timeSec + id.charCodeAt(0)) + 1) / 2; // 0 to 1
    
    return {
      cpu: floatPseudo * 10 + 2, // 2% to 12%
      ram: 600 + (floatPseudo * 50 - 25), // ~600 MB
      disk: 2.1
    };
  }
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    if (!info.State.Running) {
      return { cpu: 0, ram: 0, disk: 0 };
    }
    const statsResult = await container.stats({ stream: false });
    
    let cpuPercent = 0.0;
    try {
      const cpuDelta = statsResult.cpu_stats.cpu_usage.total_usage - statsResult.precpu_stats.cpu_usage.total_usage;
      const systemDelta = statsResult.cpu_stats.system_cpu_usage - statsResult.precpu_stats.system_cpu_usage;
      if (systemDelta > 0.0 && cpuDelta > 0.0) {
        const cpus = statsResult.cpu_stats.online_cpus || statsResult.cpu_stats.cpu_usage.percpu_usage?.length || 1;
        cpuPercent = (cpuDelta / systemDelta) * cpus * 100.0;
      }
    } catch(e) {}

    let ramMB = 0.0;
    try {
      const stats = statsResult.memory_stats.stats as any || {};
      const cache = stats.cache || stats.inactive_file || stats.total_inactive_file || 0;
      const usedMemory = statsResult.memory_stats.usage - cache;
      ramMB = usedMemory / 1024 / 1024;
    } catch(e) {}

    // Roughly calculate disk size from the volume directory if possible, or provide a default for now.
    return {
      cpu: cpuPercent,
      ram: ramMB,
      disk: 2.1
    };
  } catch (e) {
    return { cpu: 0, ram: 0, disk: 0 };
  }
};`;

const new_func = `
let diskCache: Record<string, { sizeMB: number, lastUpdate: number }> = {};
async function getDirectorySize(dir: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const p = path.join(dir, file.name);
      if (file.isDirectory()) {
        size += await getDirectorySize(p);
      } else {
        const stat = await fs.promises.stat(p);
        size += stat.size;
      }
    }
  } catch (e) {}
  return size;
}

export const getContainerStats = async (containerId: string, nodeId?: string, serverId?: string) => {
  const docker = await getDocker(nodeId);
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    if (!mockState[id]) return { cpu: 0, ram: 0, disk: 0, netIn: 0, netOut: 0, startedAt: null };
    
    // Stable pseudo-random mock stats based on time so it fluctuates realistically
    const timeSec = Math.floor(Date.now() / 5000);
    const floatPseudo = (Math.sin(timeSec + id.charCodeAt(0)) + 1) / 2; // 0 to 1
    
    return {
      cpu: floatPseudo * 10 + 2, // 2% to 12%
      ram: 600 + (floatPseudo * 50 - 25), // ~600 MB
      disk: 2.1,
      netIn: timeSec * 1024,
      netOut: timeSec * 512,
      startedAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
    };
  }
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    if (!info.State.Running) {
      return { cpu: 0, ram: 0, disk: 0, netIn: 0, netOut: 0, startedAt: null };
    }
    const statsResult = await container.stats({ stream: false });
    
    let cpuPercent = 0.0;
    try {
      const cpuDelta = statsResult.cpu_stats.cpu_usage.total_usage - statsResult.precpu_stats.cpu_usage.total_usage;
      const systemDelta = statsResult.cpu_stats.system_cpu_usage - statsResult.precpu_stats.system_cpu_usage;
      if (systemDelta > 0.0 && cpuDelta > 0.0) {
        const cpus = statsResult.cpu_stats.online_cpus || statsResult.cpu_stats.cpu_usage.percpu_usage?.length || 1;
        cpuPercent = (cpuDelta / systemDelta) * cpus * 100.0;
      }
    } catch(e) {}

    let ramMB = 0.0;
    try {
      const stats = statsResult.memory_stats.stats as any || {};
      const cache = stats.cache || stats.inactive_file || stats.total_inactive_file || 0;
      const usedMemory = statsResult.memory_stats.usage - cache;
      ramMB = usedMemory / 1024 / 1024;
    } catch(e) {}
    
    let netIn = 0;
    let netOut = 0;
    try {
      const networks = statsResult.networks || {};
      for (const net of Object.values<any>(networks)) {
        netIn += net.rx_bytes;
        netOut += net.tx_bytes;
      }
    } catch(e) {}

    let diskSizeMB = 2.1;
    if (serverId) {
       const now = Date.now();
       if (!diskCache[serverId] || now - diskCache[serverId].lastUpdate > 60000) {
          const dir = path.join(process.cwd(), ".data", "servers", serverId);
          const bytes = await getDirectorySize(dir);
          diskCache[serverId] = { sizeMB: bytes / 1024 / 1024, lastUpdate: now };
       }
       diskSizeMB = diskCache[serverId].sizeMB;
    }

    return {
      cpu: cpuPercent,
      ram: ramMB,
      disk: diskSizeMB,
      netIn: netIn,
      netOut: netOut,
      startedAt: info.State.StartedAt
    };
  } catch (e) {
    return { cpu: 0, ram: 0, disk: 0, netIn: 0, netOut: 0, startedAt: null };
  }
};`;

if (text.includes(old_func)) {
    text = text.replace(old_func, new_func);
    // Add path import if not present
    if (!text.includes('import path from "path"')) {
        text = 'import path from "path";\n' + text;
    }
    console.log("Replaced successfully");
} else {
    console.log("Could not find old function");
}

fs.writeFileSync("src/server/services/docker.ts", text);
