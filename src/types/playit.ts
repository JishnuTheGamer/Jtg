export type PlayitTunnelHealthStatus =
  | "healthy"
  | "agent_offline"
  | "minecraft_offline"
  | "local_port_unreachable"
  | "tunnel_unhealthy"
  | "recovering"
  | "recovery_failed"
  | "needs_admin_attention"
  | "unknown";

export type PlayitServiceMode = "systemd" | "managed_process" | "docker_container";

export interface PlayitSettingsConfig {
  playitServiceMode?: PlayitServiceMode;
  playitServiceName?: string;
  healthCheckIntervalMinutes?: number;
  restartDelaySeconds?: number;
  maxRecoveryAttempts?: number;
  allowRecoveryWhilePlayersOnline?: boolean;
}

export interface PlayitDiagnostics {
  status: PlayitTunnelHealthStatus;
  minecraftStatus: "online" | "offline" | "starting" | "stopping" | "unknown";
  playerCount: number;
  runtime: "docker" | "local" | "wings" | "unknown";
  containerPort: number;
  hostPort: number;
  playitLocalAddress: string;
  playitLocalPort: number;
  playitPublicAddress: string | null;
  localTcpReachable: boolean;
  agentStatus: "running" | "stopped" | "crashed" | "unknown";
  dockerPortMappingOk: boolean;
  serverPropertiesServerIp: string | null;
  serverIpNotice?: string | null;
  failureReason: string | null;
  recommendedAction: string;
  claimLink: string | null;
  logsSnippet?: string;
  isLocked?: boolean;
  lastChecked?: string | null;
  lastRecovery?: string | null;
  nextRetryTime?: string | null;
  recoveryAttemptCount?: number;
}

export interface PlayitHealthRecord {
  serverId: string;
  serverName: string;
  tunnelId?: string;
  agentStatus: "running" | "stopped" | "crashed" | "unknown";
  minecraftStatus: "online" | "offline" | "starting" | "stopping" | "unknown";
  playerCount: number;
  runtimeType: "docker" | "local" | "wings" | "unknown";
  internalContainerPort: number;
  dockerHostPublishedPort: number;
  playitLocalAddress: string;
  playitLocalPort: number;
  playitPublicAddress: string | null;
  localTcpReachable: boolean;
  lastSuccessfulCheck: string | null;
  lastFailure: string | null;
  failureReason: string | null;
  recommendedAction: string | null;
  recoveryAttemptCount: number;
  nextRetryTime: string | null;
  lastRestartTime: string | null;
  currentHealthStatus: PlayitTunnelHealthStatus;
  serverPropertiesServerIp: string | null;
  dockerPortMappingOk: boolean;
}

export interface PlayitAuditEntry {
  id: string;
  serverId: string;
  serverName: string;
  timestamp: string;
  action: "automatic_recovery" | "manual_restart" | "force_recovery" | "agent_start" | "agent_stop" | "agent_reset";
  trigger: "scheduled_monitor" | "on_demand_test" | "user_action";
  performedBy: string;
  previousStatus: PlayitTunnelHealthStatus;
  newStatus?: PlayitTunnelHealthStatus;
  playerCount: number;
  reason: string;
  success: boolean;
  details?: string;
}
