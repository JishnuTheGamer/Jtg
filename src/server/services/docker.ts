import Docker from "dockerode";
import fs from "fs-extra";
import path from "path";
import { io } from "../../../server.js"; // Import socket for logs

export const isSandbox = !fs.existsSync("/var/run/docker.sock") && process.platform !== "win32";

export const docker = new Docker({ socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock' });

// Mock state for sandbox demo
const mockState: Record<string, boolean> = {};

export const getPaperVersions = async () => {
  return [
    "1.21.11", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", 
    "1.20.6", "1.20.4", "1.20.2", "1.20.1", "1.20", 
    "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", 
    "1.18.2", "1.18.1", "1.17.1", "1.16.5", "1.15.2", 
    "1.14.4", "1.13.2", "1.12.2", "1.11.2", "1.10.2", 
    "1.9.4", "1.8.8"
  ];
};

const DOCKER_IMAGE = "itzg/minecraft-server";

export const createServerContainer = async (serverData: any) => {
  if (isSandbox) {
    mockState[serverData.id] = false;
    return "mock-container-id-" + serverData.id;
  }

  // Pull image if not exists
  console.log(`Ensuring ${DOCKER_IMAGE} is pulled...`);
  await new Promise((resolve, reject) => {
    docker.pull(DOCKER_IMAGE, (err: any, stream: any) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, onFinished, onProgress);
      function onFinished(err: any, output: any) {
        if (err) return reject(err);
        resolve(output);
      }
      function onProgress(event: any) {}
    });
  });

  const serverDir = path.join(process.cwd(), ".data", "servers", serverData.id);
  await fs.ensureDir(serverDir);

  const container = await docker.createContainer({
    Image: DOCKER_IMAGE,
    name: `jtg-server-${serverData.id}`,
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    Env: [
      `EULA=TRUE`,
      `TYPE=PAPER`,
      `VERSION=${serverData.version}`,
      // MEMORY specifies the maximum heap size (-Xmx) for the Minecraft server.
      // We allow allocating more RAM than the VPS has physically available (overcommitting).
      // Since we don't set HostConfig.Memory limits here, Docker relies on the OS's OOM killer if physical RAM is fully exhausted.
      `MEMORY=${serverData.ram}G`,
      // INIT_MEMORY sets the initial heap size (-Xms). By keeping this low (e.g., 128M),
      // the application only consumes memory as it actually needs it during runtime,
      // rather than reserving the entire 'MEMORY' amount immediately at startup.
      `INIT_MEMORY=128M`,
      `SERVER_PORT=${serverData.port}`,
      `ENABLE_RCON=true`,
      `RCON_PASSWORD=admin`,
      `JVM_OPTS=-DPaper.IgnoreWorldDataVersion=true`,
      `JVM_DD_OPTS=Paper.IgnoreWorldDataVersion=true,paper.ignoreWorldDataVersion=true`
    ],
    ExposedPorts: {
      [`${serverData.port}/tcp`]: {}
    },
    HostConfig: {
      PortBindings: {
        [`${serverData.port}/tcp`]: [
          {
            HostPort: `${serverData.port}`
          }
        ]
      },
      Binds: [`${serverDir}:/data`]
    }
  });

  return container.id;
};

export const startContainer = async (containerId: string) => {
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = true;
    io.to(`server_${id}`).emit("log", `[System] Server started (Sandbox Mode).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.start();
};

export const stopContainer = async (containerId: string) => {
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = false;
    io.to(`server_${id}`).emit("log", `[System] Server stopped (Sandbox Mode).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.stop();
};

export const restartContainer = async (containerId: string) => {
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    mockState[id] = true;
    io.to(`server_${id}`).emit("log", `[System] Server restarted (Sandbox Mode).\r\n`);
    return;
  }
  const container = docker.getContainer(containerId);
  await container.restart();
};

export const deleteContainer = async (containerId: string) => {
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    delete mockState[id];
    return;
  }
  const container = docker.getContainer(containerId);
  try {
    const info = await container.inspect();
    if (info.State.Running) {
      await container.stop();
    }
    await container.remove({ force: true });
  } catch (err) {
    console.error("Error deleting container", err);
  }
};

export const getContainerStatus = async (containerId: string) => {
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    const isRunning = mockState[id] || false;
    return { State: { Running: isRunning, Status: isRunning ? "running" : "exited" } };
  }
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info;
  } catch (e) {
    return null;
  }
};

export const getContainerStats = async (containerId: string) => {
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
};

export const getContainerLogs = async (containerId: string): Promise<string> => {
  if (isSandbox) return "[System] Sandbox mode. No historical logs available.\r\n";
  try {
    const container = docker.getContainer(containerId);
    
    // Convert Buffer log output to string safely. dockerode returns interleaved multiplexed streams if tty is false,
    // but we use tty: true in createServerContainer, so it's a raw stream buffer.
    const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 100 });
    return logsBuffer.toString('utf8');
  } catch (e) {
    return "";
  }
};

const activeStreams: Record<string, NodeJS.ReadWriteStream> = {};

export const attachContainerSocket = async (containerId: string, serverId: string) => {
  if (isSandbox) {
    return;
  }
  try {
    const container = docker.getContainer(containerId);
    if (!activeStreams[containerId]) {
      const stream = await container.attach({ stream: true, stdout: true, stderr: true, stdin: true });
      activeStreams[containerId] = stream;
      stream.on('data', (chunk) => {
        io.to(`server_${serverId}`).emit("log", chunk.toString());
      });
      stream.on('end', () => {
        delete activeStreams[containerId];
      });
    }
  } catch(e) {
    console.error("Attach error", e);
  }
};

export const sendContainerCommand = async (containerId: string, command: string) => {
  if (isSandbox) {
    const id = containerId.replace("mock-container-id-", "");
    io.to(`server_${id}`).emit("log", `> ${command}\r\n`);
    return;
  }
  if (activeStreams[containerId]) {
    activeStreams[containerId].write(command + "\n");
  } else {
    try {
      const container = docker.getContainer(containerId);
      const stream = await container.attach({ stream: true, stdout: true, stderr: true, stdin: true });
      activeStreams[containerId] = stream;
      stream.write(command + "\n");
      stream.on('data', (chunk) => {
        // Will be broadcasted due to existing or new attach
      });
    } catch(e) {
       console.error("Command error", e);
    }
  }
};
