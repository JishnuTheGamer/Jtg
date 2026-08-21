import net from "net";
import path from "path";
import fs from "fs-extra";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { panelEvents } from "../events.js";
import { readJSON, writeJSON } from "./db.js";
import { getServerRuntimeStatus } from "./runtime.js";
import { getDocker, isNodeSandbox } from "./docker.js";
import {
  PlayitTunnelHealthStatus,
  PlayitSettingsConfig,
  PlayitDiagnostics,
  PlayitHealthRecord,
  PlayitAuditEntry
} from "../../types/playit.js";
import { getDataDir } from "../utils/pathUtils.js";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const DATA_DIR = getDataDir();
const HEALTH_FILE = "playit-health.json";
const AUDIT_FILE = "playit-audit.json";

// In-memory locks per server to prevent concurrent health runs on the same server
const serverLocks = new Map<string, boolean>();

// Active player tracker derived from Minecraft console logs
const onlinePlayersByServer = new Map<string, Set<string>>();

// Setup log listener for real-time player tracking
panelEvents.on("log", (serverId: string, data: any) => {
  if (typeof data !== "string" || !serverId) return;
  const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b./g, "").trim();

  let set = onlinePlayersByServer.get(serverId);
  if (!set) {
    set = new Set<string>();
    onlinePlayersByServer.set(serverId, set);
  }

  // Detect player join
  const joinMatch = clean.match(/:\s+([a-zA-Z0-9_]{3,16})\s+joined the game/i);
  if (joinMatch) {
    set.add(joinMatch[1]);
  }

  // Detect player leave
  const leaveMatch = clean.match(/:\s+([a-zA-Z0-9_]{3,16})\s+left the game/i);
  if (leaveMatch) {
    set.delete(leaveMatch[1]);
  }

  // Detect 'list' command response
  const listMatch = clean.match(/players online:\s*(.*)/i);
  if (listMatch) {
    const rawNames = listMatch[1].trim();
    set.clear();
    if (rawNames) {
      rawNames
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((name) => set.add(name));
    }
  }

  // Server stopping or shutting down clears players
  if (
    clean.includes("Stopping server") ||
    clean.includes("Server closed") ||
    clean.includes("Stopping the server") ||
    clean.includes("Closing Server")
  ) {
    set.clear();
  }
});

/**
 * Get online player count for a given server
 */
export const getTrackedPlayerCount = (serverId: string): number => {
  const set = onlinePlayersByServer.get(serverId);
  return set ? set.size : 0;
};

/**
 * Get list of tracked online players
 */
export const getTrackedOnlinePlayers = (serverId: string): string[] => {
  const set = onlinePlayersByServer.get(serverId);
  return set ? Array.from(set) : [];
};

/**
 * Test local TCP port connectivity with strict timeout
 */
export const testTcpPort = (
  host: string,
  port: number,
  timeoutMs: number = 2500
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!port || port <= 0 || port > 65535) {
      return resolve(false);
    }
    const socket = new net.Socket();
    let settled = false;

    const finalize = (success: boolean) => {
      if (!settled) {
        settled = true;
        socket.removeAllListeners();
        socket.destroy();
        resolve(success);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finalize(true));
    socket.once("timeout", () => finalize(false));
    socket.once("error", () => finalize(false));

    try {
      socket.connect(port, host);
    } catch {
      finalize(false);
    }
  });
};

/**
 * Sanitize strings and logs to prevent leaking Playit tokens or secrets
 */
export const sanitizePlayitLogs = (logs: string): string => {
  if (!logs) return "";
  return logs
    .replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b./g, "")
    .replace(/secret_key\s*=\s*["'][^"']+["']/gi, 'secret_key = "[REDACTED]"')
    .replace(/secret_key\s*=\s*[^\s\n]+/gi, "secret_key = [REDACTED]")
    .replace(/token\s*=\s*["'][^"']+["']/gi, 'token = "[REDACTED]"')
    .replace(/claim\/([a-zA-Z0-9]{30,})/gi, "claim/[REDACTED]");
};

/**
 * Read system-wide Playit configuration settings
 */
export const getPlayitSettings = async (): Promise<PlayitSettingsConfig> => {
  try {
    const settings = (await readJSON("settings.json")) || {};
    return {
      playitServiceMode: settings.playitServiceMode || "managed_process",
      playitServiceName: settings.playitServiceName || "playit",
      healthCheckIntervalMinutes: Number(settings.healthCheckIntervalMinutes) || 5,
      restartDelaySeconds: Number(settings.restartDelaySeconds) || 20,
      maxRecoveryAttempts: Number(settings.maxRecoveryAttempts) || 3,
      allowRecoveryWhilePlayersOnline: settings.allowRecoveryWhilePlayersOnline === true
    };
  } catch {
    return {
      playitServiceMode: "managed_process",
      playitServiceName: "playit",
      healthCheckIntervalMinutes: 5,
      restartDelaySeconds: 20,
      maxRecoveryAttempts: 3,
      allowRecoveryWhilePlayersOnline: false
    };
  }
};

/**
 * Load health records store
 */
export const getHealthRecords = async (): Promise<Record<string, PlayitHealthRecord>> => {
  try {
    const data = await readJSON(HEALTH_FILE);
    return data || {};
  } catch {
    return {};
  }
};

/**
 * Save health record for a specific server
 */
export const saveHealthRecord = async (
  serverId: string,
  record: Partial<PlayitHealthRecord>
): Promise<void> => {
  try {
    const records = await getHealthRecords();
    const existing = records[serverId] || {
      serverId,
      serverName: serverId,
      agentStatus: "unknown",
      minecraftStatus: "unknown",
      playerCount: 0,
      runtimeType: "docker",
      internalContainerPort: 25565,
      dockerHostPublishedPort: 25565,
      playitLocalAddress: "127.0.0.1",
      playitLocalPort: 25565,
      playitPublicAddress: null,
      localTcpReachable: false,
      lastSuccessfulCheck: null,
      lastFailure: null,
      failureReason: null,
      recommendedAction: null,
      recoveryAttemptCount: 0,
      nextRetryTime: null,
      lastRestartTime: null,
      currentHealthStatus: "unknown",
      serverPropertiesServerIp: null,
      dockerPortMappingOk: true
    };

    records[serverId] = { ...existing, ...record };
    await writeJSON(HEALTH_FILE, records);
  } catch (err) {
    console.error("[Playit Health] Failed to persist health record:", err);
  }
};

/**
 * Add an audit log entry for recovery/restart actions
 */
export const addPlayitAudit = async (entry: Omit<PlayitAuditEntry, "id" | "timestamp">): Promise<void> => {
  try {
    const list: PlayitAuditEntry[] = (await readJSON(AUDIT_FILE)) || [];
    const fullEntry: PlayitAuditEntry = {
      ...entry,
      id: "audit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString()
    };
    list.unshift(fullEntry);
    // Keep last 200 audit events
    if (list.length > 200) list.length = 200;
    await writeJSON(AUDIT_FILE, list);
  } catch (err) {
    console.error("[Playit Audit] Failed to record audit log:", err);
  }
};

/**
 * Get Playit audit logs
 */
export const getPlayitAuditLogs = async (serverId?: string): Promise<PlayitAuditEntry[]> => {
  try {
    const list: PlayitAuditEntry[] = (await readJSON(AUDIT_FILE)) || [];
    if (serverId) {
      return list.filter((e) => e.serverId === serverId);
    }
    return list;
  } catch {
    return [];
  }
};

/**
 * Compute safe PM2 process name for a server
 */
export const getPm2ProcessName = (server: any): string => {
  const safeName = server.name ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : server.id;
  return `playit_${safeName}`;
};

/**
 * Inspect server directory, ports, and server.properties
 */
export const inspectServerPortsAndConfig = async (
  server: any
): Promise<{
  internalContainerPort: number;
  dockerHostPublishedPort: number;
  playitLocalAddress: string;
  playitLocalPort: number;
  serverPropertiesServerIp: string | null;
  serverIpNotice: string | null;
  dockerPortMappingOk: boolean;
}> => {
  const serverDir = path.join(DATA_DIR, "servers", server.id);
  const internalContainerPort = Number(server.port) || 25565;
  let dockerHostPublishedPort = Number(server.port) || 25565;
  let dockerPortMappingOk = true;

  // Check Docker port bindings if Docker runtime
  if (server.runtimeType !== "local" && server.containerId) {
    try {
      if (!isNodeSandbox(server.nodeId)) {
        const docker = await getDocker(server.nodeId);
        const container = docker.getContainer(server.containerId);
        const info = await container.inspect();
        const portBindings = info?.HostConfig?.PortBindings;
        const netPorts = info?.NetworkSettings?.Ports;

        let foundPort: number | null = null;

        // Check PortBindings
        if (portBindings) {
          for (const key of Object.keys(portBindings)) {
            const bindings = portBindings[key];
            if (Array.isArray(bindings) && bindings.length > 0 && bindings[0].HostPort) {
              foundPort = parseInt(bindings[0].HostPort, 10);
              break;
            }
          }
        }

        // Check NetworkSettings.Ports
        if (!foundPort && netPorts) {
          for (const key of Object.keys(netPorts)) {
            const bindings = netPorts[key];
            if (Array.isArray(bindings) && bindings.length > 0 && bindings[0].HostPort) {
              foundPort = parseInt(bindings[0].HostPort, 10);
              break;
            }
          }
        }

        if (foundPort && !isNaN(foundPort)) {
          dockerHostPublishedPort = foundPort;
        } else {
          dockerPortMappingOk = false;
        }
      }
    } catch {
      // Container not found or inspect failed
    }
  }

  // Check server.properties for server-ip setting
  let serverPropertiesServerIp: string | null = null;
  let serverIpNotice: string | null = null;

  try {
    const propsPath = path.join(serverDir, "server.properties");
    if (await fs.pathExists(propsPath)) {
      const content = await fs.readFile(propsPath, "utf8");
      const match = content.match(/^server-ip=(.*)$/m);
      if (match) {
        const val = match[1].trim();
        if (val) {
          serverPropertiesServerIp = val;
          if (val !== "0.0.0.0" && val !== "127.0.0.1" && val !== "localhost") {
            serverIpNotice = `server-ip is set to '${val}'. For Playit compatibility, server-ip should be blank or 0.0.0.0 so localhost connections are accepted.`;
          }
        }
      }
    }
  } catch {
    // Ignore error reading server.properties
  }

  // Playit configured local address & port
  const playitLocalAddress = "127.0.0.1";
  const playitLocalPort = dockerHostPublishedPort;

  return {
    internalContainerPort,
    dockerHostPublishedPort,
    playitLocalAddress,
    playitLocalPort,
    serverPropertiesServerIp,
    serverIpNotice,
    dockerPortMappingOk
  };
};

/**
 * Get Playit Agent Process/Service status and logs
 */
export const getPlayitAgentStatus = async (
  server: any,
  config?: PlayitSettingsConfig
): Promise<{
  status: "running" | "stopped" | "crashed" | "unknown";
  claimLink: string | null;
  publicAddress: string | null;
  logs: string;
}> => {
  const resolvedConfig = config || (await getPlayitSettings());
  const pm2Name = getPm2ProcessName(server);

  return new Promise((resolve) => {
    if (resolvedConfig.playitServiceMode === "systemd") {
      const serviceName = (resolvedConfig.playitServiceName || "playit").replace(/[^a-zA-Z0-9_-]/g, "");
      execFile("systemctl", ["is-active", serviceName], (err, stdout) => {
        const isActive = (stdout || "").trim() === "active";
        if (isActive) {
          execFile("journalctl", ["-u", serviceName, "-n", "60", "--no-pager"], (jErr, jOut) => {
            const logs = sanitizePlayitLogs(jOut || "");
            const claimMatches = logs.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9]+/g);
            const addrMatches = logs.match(/([a-zA-Z0-9.-]+\.playit\.gg:[0-9]+)/g) || logs.match(/([a-zA-Z0-9.-]+\.ply\.gg:[0-9]+)/g);
            resolve({
              status: "running",
              claimLink: claimMatches ? claimMatches[claimMatches.length - 1] : null,
              publicAddress: addrMatches ? addrMatches[addrMatches.length - 1] : null,
              logs: logs.split("\n").slice(-40).join("\n")
            });
          });
        } else {
          resolve({
            status: "stopped",
            claimLink: null,
            publicAddress: null,
            logs: ""
          });
        }
      });
      return;
    }

    // Default: managed_process (PM2 / direct process)
    exec("npx pm2 jlist", (err, stdout) => {
      let status: "running" | "stopped" | "crashed" | "unknown" = "stopped";
      try {
        const jsonStart = stdout.indexOf("[");
        const jsonEnd = stdout.lastIndexOf("]");
        const jsonStr = jsonStart !== -1 && jsonEnd !== -1 ? stdout.substring(jsonStart, jsonEnd + 1) : stdout;
        const pm2List = JSON.parse(jsonStr);
        const proc = pm2List.find((p: any) => p.name === pm2Name);
        if (proc && proc.pm2_env) {
          if (proc.pm2_env.status === "online") {
            status = "running";
          } else if (proc.pm2_env.status === "errored" || proc.pm2_env.status === "stopped") {
            status = proc.pm2_env.status === "errored" ? "crashed" : "stopped";
          }
        }
      } catch {
        status = "unknown";
      }

      if (status === "running") {
        exec(`npx pm2 logs ${pm2Name} --nostream --lines 80`, (lErr, logStdout) => {
          const rawLogs = logStdout || "";
          const logs = sanitizePlayitLogs(rawLogs);
          const claimMatches = logs.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9]+/g);
          const addrMatches = logs.match(/([a-zA-Z0-9.-]+\.playit\.gg:[0-9]+)/g) || logs.match(/([a-zA-Z0-9.-]+\.ply\.gg:[0-9]+)/g);
          resolve({
            status: "running",
            claimLink: claimMatches ? claimMatches[claimMatches.length - 1] : null,
            publicAddress: addrMatches ? addrMatches[addrMatches.length - 1] : null,
            logs: logs.split("\n").slice(-40).join("\n")
          });
        });
      } else {
        resolve({
          status,
          claimLink: null,
          publicAddress: null,
          logs: ""
        });
      }
    });
  });
};

/**
 * Start Playit Agent safely with allowlisted execution
 */
export const startPlayitAgent = async (
  server: any,
  config?: PlayitSettingsConfig
): Promise<{ success: boolean; error?: string }> => {
  const resolvedConfig = config || (await getPlayitSettings());
  const serverDir = path.join(DATA_DIR, "servers", server.id);
  await fs.ensureDir(serverDir);

  const serverName = server.name ? server.name.replace(/[^a-zA-Z0-9_-]/g, "_") : server.id;
  const pm2Name = getPm2ProcessName(server);
  const playitBin = path.join(serverDir, `playit_${serverName}`);
  const secretPath = path.join(serverDir, "playit.toml");

  if (resolvedConfig.playitServiceMode === "systemd") {
    const serviceName = (resolvedConfig.playitServiceName || "playit").replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      await execFileAsync("systemctl", ["restart", serviceName]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to start systemd playit service" };
    }
  }

  // Managed PM2 process
  return new Promise((resolve) => {
    const setupCmd = `if [ ! -f "${playitBin}" ]; then wget -qO "${playitBin}" "https://github.com/playit-cloud/playit-agent/releases/download/v0.15.26/playit-linux-amd64" && chmod +x "${playitBin}"; fi`;
    exec(
      `npx pm2 delete ${pm2Name} || true; npx pm2 flush ${pm2Name} || true; ${setupCmd} && npx pm2 start "${playitBin}" --name ${pm2Name} -- -s --secret_path "${secretPath}" && npx pm2 save`,
      (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
};

/**
 * Stop Playit Agent safely
 */
export const stopPlayitAgent = async (
  server: any,
  config?: PlayitSettingsConfig
): Promise<{ success: boolean; error?: string }> => {
  const resolvedConfig = config || (await getPlayitSettings());
  const pm2Name = getPm2ProcessName(server);

  if (resolvedConfig.playitServiceMode === "systemd") {
    const serviceName = (resolvedConfig.playitServiceName || "playit").replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      await execFileAsync("systemctl", ["stop", serviceName]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return new Promise((resolve) => {
    exec(`npx pm2 delete ${pm2Name} && npx pm2 save`, (err) => {
      resolve({ success: true });
    });
  });
};

/**
 * Reset Playit secret and restart
 */
export const resetPlayitAgent = async (
  server: any,
  config?: PlayitSettingsConfig
): Promise<{ success: boolean; error?: string }> => {
  const resolvedConfig = config || (await getPlayitSettings());
  const serverDir = path.join(DATA_DIR, "servers", server.id);
  const secretPath = path.join(serverDir, "playit.toml");
  const pm2Name = getPm2ProcessName(server);

  try {
    await fs.remove(secretPath);
  } catch {}

  if (resolvedConfig.playitServiceMode === "systemd") {
    const serviceName = (resolvedConfig.playitServiceName || "playit").replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      await execFileAsync("systemctl", ["restart", serviceName]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return new Promise((resolve) => {
    exec(`npx pm2 delete ${pm2Name} || true; npx pm2 flush ${pm2Name} || true && npx pm2 save`, () => {
      startPlayitAgent(server, resolvedConfig).then(resolve);
    });
  });
};

/**
 * Calculate next backoff timestamp in ISO format
 * 1st retry: 0 (immediate)
 * 2nd retry: 5 minutes (300s)
 * 3rd retry: 15 minutes (900s)
 * 4th+ retry: 30 minutes (1800s)
 */
export const calculateNextBackoffTime = (attemptCount: number): string => {
  let delaySec = 0;
  if (attemptCount === 1) delaySec = 300; // 5m
  else if (attemptCount === 2) delaySec = 900; // 15m
  else delaySec = 1800; // 30m

  return new Date(Date.now() + delaySec * 1000).toISOString();
};

/**
 * Primary Playit Health Diagnostic & Recovery Engine
 */
export const runServerPlayitHealthCheck = async (
  serverId: string,
  options?: {
    isManualTrigger?: boolean;
    triggerUser?: string;
    allowForce?: boolean;
  }
): Promise<PlayitDiagnostics> => {
  // Check if server lock is active
  if (serverLocks.get(serverId)) {
    const prev = (await getHealthRecords())[serverId];
    return {
      status: prev?.currentHealthStatus || "unknown",
      minecraftStatus: prev?.minecraftStatus || "unknown",
      playerCount: prev?.playerCount || 0,
      runtime: (prev?.runtimeType as any) || "unknown",
      containerPort: prev?.internalContainerPort || 25565,
      hostPort: prev?.dockerHostPublishedPort || 25565,
      playitLocalAddress: prev?.playitLocalAddress || "127.0.0.1",
      playitLocalPort: prev?.playitLocalPort || 25565,
      playitPublicAddress: prev?.playitPublicAddress || null,
      localTcpReachable: prev?.localTcpReachable || false,
      agentStatus: prev?.agentStatus || "unknown",
      dockerPortMappingOk: prev?.dockerPortMappingOk ?? true,
      serverPropertiesServerIp: prev?.serverPropertiesServerIp || null,
      failureReason: "Health check currently in progress for this server.",
      recommendedAction: "Please wait a few seconds for the active health test to finish.",
      claimLink: null,
      isLocked: true
    };
  }

  // Acquire lock
  serverLocks.set(serverId, true);

  try {
    const servers: any[] = (await readJSON("servers.json")) || [];
    const server = servers.find((s) => s.id === serverId);

    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const config = await getPlayitSettings();
    const records = await getHealthRecords();
    const existingRecord = records[serverId];

    const playerCount = getTrackedPlayerCount(serverId);
    const portsConfig = await inspectServerPortsAndConfig(server);
    const agentInfo = await getPlayitAgentStatus(server, config);

    // Check Minecraft server runtime status
    let mcStatus: "online" | "offline" | "starting" | "stopping" | "unknown" = "offline";
    try {
      const rtStatus = await getServerRuntimeStatus(server);
      if (rtStatus && rtStatus.State) {
        if (rtStatus.State.Running) mcStatus = "online";
        else mcStatus = "offline";
      }
    } catch {
      mcStatus = "unknown";
    }

    // Step 5: Test local TCP connectivity from VPS host to 127.0.0.1:<publishedHostPort>
    const localTcpReachable = mcStatus === "online"
      ? await testTcpPort("127.0.0.1", portsConfig.dockerHostPublishedPort, 2500)
      : false;

    let status: PlayitTunnelHealthStatus = "unknown";
    let failureReason: string | null = null;
    let recommendedAction = "Tunnel and local server are operating normally.";
    let shouldAttemptRecovery = false;
    let recoveryReason = "";

    const isBackoffExceeded =
      existingRecord?.nextRetryTime &&
      new Date(existingRecord.nextRetryTime).getTime() > Date.now();

    // ==========================================
    // HEALTH EVALUATION & SAFE DECISION MATRIX
    // ==========================================

    if (mcStatus !== "online") {
      // RULE B: Minecraft server is offline or starting/stopping
      status = "minecraft_offline";
      failureReason = `Minecraft server is ${mcStatus}; tunnel cannot accept connections.`;
      recommendedAction = "Start the Minecraft server from the panel dashboard to accept connections.";
    } else if (!portsConfig.dockerPortMappingOk) {
      // Docker port is not published to host
      status = "local_port_unreachable";
      failureReason = "Minecraft container port is not published to the VPS host.";
      recommendedAction = "Check Docker port publishing in server configuration and restart the container.";
    } else if (!localTcpReachable) {
      // RULE C: Local Minecraft port unreachable
      status = "local_port_unreachable";
      failureReason = `Playit cannot reach the local Minecraft server because the host port (127.0.0.1:${portsConfig.dockerHostPublishedPort}) is not reachable.`;
      recommendedAction = portsConfig.serverIpNotice
        ? `${portsConfig.serverIpNotice} Check server.properties and restart Minecraft.`
        : "Check server status, console logs for bind errors, and verify the configured host port.";
    } else if (agentInfo.status === "stopped" || agentInfo.status === "crashed") {
      // RULE D: Playit agent process stopped/crashed
      status = "agent_offline";
      failureReason =
        agentInfo.status === "crashed"
          ? "Playit agent process crashed or terminated unexpectedly."
          : "Playit agent process is stopped.";
      recommendedAction = "Restarting Playit agent to restore global tunnel connectivity.";
      shouldAttemptRecovery = true;
      recoveryReason = "Playit agent process was stopped or crashed.";
    } else if (agentInfo.status === "running") {
      // Agent is running and local TCP is reachable
      // Check if logs indicate disconnect, broken pipe, or tunnel errors
      const lowerLogs = agentInfo.logs.toLowerCase();
      const hasConnectionError =
        lowerLogs.includes("error connecting to playit") ||
        lowerLogs.includes("tunnel error") ||
        lowerLogs.includes("broken pipe") ||
        lowerLogs.includes("failed to authenticate tunnel");

      if (hasConnectionError) {
        status = "tunnel_unhealthy";
        failureReason = "Playit agent is connected locally but experiencing remote relay/tunnel connectivity errors.";
        recommendedAction = "Attempting automated tunnel connection recovery.";
        shouldAttemptRecovery = true;
        recoveryReason = "Playit remote relay reported connection or tunnel failure.";
      } else {
        // RULE A: Tunnel is healthy
        status = "healthy";
        failureReason = null;
        recommendedAction = "Tunnel is active, local server is responding, and connections are ready.";
      }
    }

    // ==========================================
    // RECOVERY EXECUTION WITH PLAYER AWARENESS
    // ==========================================

    let currentAttemptCount = existingRecord?.recoveryAttemptCount || 0;
    let nextRetryIso: string | null = existingRecord?.nextRetryTime || null;
    let lastRestartIso = existingRecord?.lastRestartTime || null;

    if (status === "healthy") {
      // Reset consecutive failure attempts on clean health
      currentAttemptCount = 0;
      nextRetryIso = null;
    }

    if (shouldAttemptRecovery) {
      const isForce = options?.allowForce === true;

      // Check max recovery attempts (Rule F)
      if (currentAttemptCount >= (config.maxRecoveryAttempts || 3) && !isForce) {
        status = "needs_admin_attention";
        failureReason = `Automatic recovery failed after ${currentAttemptCount} attempts. Admin action is required.`;
        recommendedAction = "Inspect Playit logs, check server token/secret, or click 'Force Playit Recovery' in the panel.";
      } else if (isBackoffExceeded && !isForce && !options?.isManualTrigger) {
        // Obey exponential backoff
        status = "recovery_failed";
        failureReason = `Recovery backoff active until ${new Date(nextRetryIso!).toLocaleTimeString()}.`;
        recommendedAction = "Waiting for backoff timer to expire before retrying.";
      } else if (playerCount > 0 && !config.allowRecoveryWhilePlayersOnline && !isForce) {
        // RULE E: Players online, do NOT restart automatically
        failureReason = `Automatic recovery was skipped because ${playerCount} player(s) are currently online.`;
        recommendedAction = "Use 'Force Playit Recovery' button if players report connection drops.";
        await addPlayitAudit({
          serverId,
          serverName: server.name || serverId,
          action: "automatic_recovery",
          trigger: options?.isManualTrigger ? "on_demand_test" : "scheduled_monitor",
          performedBy: options?.triggerUser || "System Health Monitor",
          previousStatus: status,
          newStatus: status,
          playerCount,
          reason: "Skipped Playit agent restart because active players are online.",
          success: false,
          details: failureReason
        });
      } else {
        // Proceed with graceful recovery restart
        status = "recovering";
        currentAttemptCount += 1;
        lastRestartIso = new Date().toISOString();
        nextRetryIso = calculateNextBackoffTime(currentAttemptCount);

        await addPlayitAudit({
          serverId,
          serverName: server.name || serverId,
          action: isForce ? "force_recovery" : "automatic_recovery",
          trigger: options?.isManualTrigger ? "on_demand_test" : "scheduled_monitor",
          performedBy: options?.triggerUser || "System Health Monitor",
          previousStatus: agentInfo.status === "running" ? "tunnel_unhealthy" : "agent_offline",
          newStatus: "recovering",
          playerCount,
          reason: recoveryReason,
          success: true,
          details: `Recovery attempt #${currentAttemptCount}. Waiting ${config.restartDelaySeconds}s delay.`
        });

        // Restart Playit agent
        await startPlayitAgent(server, config);

        // Wait configured restart delay (15-30s)
        const delayMs = (config.restartDelaySeconds || 20) * 1000;
        await new Promise((r) => setTimeout(r, Math.min(delayMs, 25000)));

        // Re-check agent status and TCP after restart
        const postAgentInfo = await getPlayitAgentStatus(server, config);
        const postLocalTcp = await testTcpPort("127.0.0.1", portsConfig.dockerHostPublishedPort, 2500);

        if (postAgentInfo.status === "running" && postLocalTcp) {
          status = "healthy";
          failureReason = null;
          recommendedAction = "Playit agent was successfully recovered and is now healthy.";
          currentAttemptCount = 0;
          nextRetryIso = null;
        } else {
          status = currentAttemptCount >= (config.maxRecoveryAttempts || 3) ? "needs_admin_attention" : "recovery_failed";
          failureReason = `Agent restarted but status is ${postAgentInfo.status} (local TCP reachable: ${postLocalTcp ? "Yes" : "No"}).`;
          recommendedAction = "Check Playit logs and ensure Playit claim link is registered.";
        }
      }
    }

    const nowIso = new Date().toISOString();
    const lastSuccessfulCheck =
      status === "healthy" ? nowIso : existingRecord?.lastSuccessfulCheck || null;
    const lastFailure = status !== "healthy" ? nowIso : existingRecord?.lastFailure || null;

    // Persist updated health record
    await saveHealthRecord(serverId, {
      serverId,
      serverName: server.name || serverId,
      agentStatus: agentInfo.status,
      minecraftStatus: mcStatus,
      playerCount,
      runtimeType: server.runtimeType || "docker",
      internalContainerPort: portsConfig.internalContainerPort,
      dockerHostPublishedPort: portsConfig.dockerHostPublishedPort,
      playitLocalAddress: portsConfig.playitLocalAddress,
      playitLocalPort: portsConfig.playitLocalPort,
      playitPublicAddress: agentInfo.publicAddress || existingRecord?.playitPublicAddress || null,
      localTcpReachable,
      lastSuccessfulCheck,
      lastFailure,
      failureReason,
      recommendedAction,
      recoveryAttemptCount: currentAttemptCount,
      nextRetryTime: nextRetryIso,
      lastRestartTime: lastRestartIso,
      currentHealthStatus: status,
      serverPropertiesServerIp: portsConfig.serverPropertiesServerIp,
      dockerPortMappingOk: portsConfig.dockerPortMappingOk
    });

    return {
      status,
      minecraftStatus: mcStatus,
      playerCount,
      runtime: server.runtimeType || "docker",
      containerPort: portsConfig.internalContainerPort,
      hostPort: portsConfig.dockerHostPublishedPort,
      playitLocalAddress: portsConfig.playitLocalAddress,
      playitLocalPort: portsConfig.playitLocalPort,
      playitPublicAddress: agentInfo.publicAddress || existingRecord?.playitPublicAddress || null,
      localTcpReachable,
      agentStatus: agentInfo.status,
      dockerPortMappingOk: portsConfig.dockerPortMappingOk,
      serverPropertiesServerIp: portsConfig.serverPropertiesServerIp,
      serverIpNotice: portsConfig.serverIpNotice,
      failureReason,
      recommendedAction,
      claimLink: agentInfo.claimLink,
      logsSnippet: agentInfo.logs,
      lastChecked: nowIso,
      lastRecovery: lastRestartIso,
      nextRetryTime: nextRetryIso,
      recoveryAttemptCount: currentAttemptCount
    };
  } finally {
    // Release lock
    serverLocks.delete(serverId);
  }
};

/**
 * Background Scheduler
 */
let schedulerIntervalTimer: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;

export const startPlayitHealthMonitor = async () => {
  if (schedulerIntervalTimer) {
    clearInterval(schedulerIntervalTimer);
    schedulerIntervalTimer = null;
  }

  const config = await getPlayitSettings();
  const intervalMinutes = Math.max(1, config.healthCheckIntervalMinutes || 5);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[Playit Monitor] Starting background health monitor (Interval: ${intervalMinutes} min)`);

  const runScheduledChecks = async () => {
    if (isSchedulerRunning) return;
    isSchedulerRunning = true;

    try {
      const servers: any[] = (await readJSON("servers.json")) || [];
      const globalSettings = (await readJSON("settings.json")) || {};

      // Only check if Playit is enabled globally
      if (globalSettings.enablePlayit === false) {
        return;
      }

      for (const server of servers) {
        try {
          const serverDir = path.join(DATA_DIR, "servers", server.id);
          const secretPath = path.join(serverDir, "playit.toml");
          const playitExists = await fs.pathExists(secretPath);

          // Check if server has Playit configured or running
          if (playitExists || server.enablePlayit === true) {
            // Do not run if already locked for this server
            if (!serverLocks.get(server.id)) {
              await runServerPlayitHealthCheck(server.id, {
                isManualTrigger: false,
                triggerUser: "Scheduled Background Monitor"
              });
            }
          }
        } catch (serverErr: any) {
          console.error(`[Playit Monitor] Error checking server ${server.id}:`, serverErr.message);
        }
      }
    } catch (err: any) {
      console.error("[Playit Monitor] Scheduled health loop error:", err.message);
    } finally {
      isSchedulerRunning = false;
    }
  };

  // Run initial check after 10 seconds of startup
  setTimeout(() => {
    runScheduledChecks().catch(console.error);
  }, 10000);

  // Set recurring interval
  schedulerIntervalTimer = setInterval(runScheduledChecks, intervalMs);
};

export const stopPlayitHealthMonitor = () => {
  if (schedulerIntervalTimer) {
    clearInterval(schedulerIntervalTimer);
    schedulerIntervalTimer = null;
    console.log("[Playit Monitor] Stopped background health monitor.");
  }
};

export const reloadPlayitHealthMonitor = async () => {
  stopPlayitHealthMonitor();
  await startPlayitHealthMonitor();
};
