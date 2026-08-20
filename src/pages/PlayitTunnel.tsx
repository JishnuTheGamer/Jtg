// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Play,
  Square,
  Loader2,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Users,
  ShieldAlert,
  ArrowRight,
  Copy,
  Check,
  History,
  Terminal,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { PlayitDiagnostics, PlayitTunnelHealthStatus, PlayitAuditEntry } from "../types/playit";

export default function PlayitTunnel({ serverId }: { serverId: string }) {
  const [status, setStatus] = useState<"running" | "stopped" | "checking">("checking");
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [publicAddress, setPublicAddress] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [healthData, setHealthData] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<PlayitDiagnostics | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [serverRuntimeType, setServerRuntimeType] = useState<string>("docker");

  const [activeTab, setActiveTab] = useState<"terminal" | "audit">("terminal");
  const [auditLogs, setAuditLogs] = useState<PlayitAuditEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [playerWarningModal, setPlayerWarningModal] = useState<{
    isOpen: boolean;
    action: "restart" | "force_recover";
  }>({ isOpen: false, action: "restart" });

  const [copiedAddr, setCopiedAddr] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const fetchStatus = async () => {
    try {
      const serverRes = await axios.get(`/api/servers/${serverId}`);
      setServerRuntimeType(serverRes.data.runtimeType || "docker");

      const res = await axios.get(`/api/servers/${serverId}/playit`);
      setStatus(res.data.status);
      setClaimLink(res.data.claimLink || null);
      setPublicAddress(res.data.publicAddress || null);
      if (res.data.logs !== undefined) {
        setLogs(res.data.logs);
      }
      if (res.data.health) {
        setHealthData(res.data.health);
      }
      if (res.data.playerCount !== undefined) {
        setPlayerCount(res.data.playerCount);
      }
    } catch (e) {
      console.error("Failed to fetch Playit status", e);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await axios.get(`/api/servers/${serverId}/playit/audit`);
      setAuditLogs(res.data.auditLogs || []);
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleRunHealthTest = async () => {
    setIsTesting(true);
    try {
      const res = await axios.post(`/api/servers/${serverId}/playit/test`);
      setDiagnostics(res.data);
      if (res.data.claimLink) setClaimLink(res.data.claimLink);
      if (res.data.playitPublicAddress) setPublicAddress(res.data.playitPublicAddress);
      await fetchStatus();
    } catch (e) {
      console.error("Failed to run health check", e);
    } finally {
      setIsTesting(false);
    }
  };

  const generateTunnel = async () => {
    setIsProcessing(true);
    setLogs("");
    setClaimLink(null);
    try {
      await axios.post(`/api/servers/${serverId}/playit/start`);
      setStatus("running");
      await fetchStatus();
    } catch (e) {
      console.error("Failed to start tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopTunnel = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`/api/servers/${serverId}/playit/stop`);
      setStatus("stopped");
      setClaimLink(null);
      setLogs("");
      await fetchStatus();
    } catch (e) {
      console.error("Failed to stop tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTunnel = async () => {
    setShowResetConfirm(false);
    setIsProcessing(true);
    setLogs("");
    setClaimLink(null);
    try {
      await axios.post(`/api/servers/${serverId}/playit/reset`);
      setStatus("running");
      await fetchStatus();
    } catch (e) {
      console.error("Failed to reset tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const requestRestart = () => {
    if (playerCount > 0) {
      setPlayerWarningModal({ isOpen: true, action: "restart" });
    } else {
      executeRestart(false);
    }
  };

  const requestForceRecover = () => {
    if (playerCount > 0) {
      setPlayerWarningModal({ isOpen: true, action: "force_recover" });
    } else {
      executeForceRecover();
    }
  };

  const executeRestart = async (force: boolean) => {
    setPlayerWarningModal({ isOpen: false, action: "restart" });
    setIsProcessing(true);
    try {
      await axios.post(`/api/servers/${serverId}/playit/restart`, { force });
      await fetchStatus();
    } catch (e: any) {
      console.error("Failed to restart Playit agent", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeForceRecover = async () => {
    setPlayerWarningModal({ isOpen: false, action: "force_recover" });
    setIsProcessing(true);
    try {
      const res = await axios.post(`/api/servers/${serverId}/playit/force-recover`);
      if (res.data.diagnostics) setDiagnostics(res.data.diagnostics);
      await fetchStatus();
    } catch (e: any) {
      console.error("Failed to force recover Playit", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const currentHealth: PlayitTunnelHealthStatus =
    diagnostics?.status || healthData?.currentHealthStatus || (status === "running" ? "healthy" : "agent_offline");

  const renderHealthBadge = (healthStatus: PlayitTunnelHealthStatus) => {
    switch (healthStatus) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Healthy & Online
          </span>
        );
      case "agent_offline":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Agent Offline
          </span>
        );
      case "minecraft_offline":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Minecraft Offline
          </span>
        );
      case "local_port_unreachable":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            Local Port Unreachable
          </span>
        );
      case "tunnel_unhealthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Tunnel Degraded
          </span>
        );
      case "recovering":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Recovering Agent...
          </span>
        );
      case "needs_admin_attention":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Attention
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border-subtle">
            Unknown
          </span>
        );
    }
  };

  const displayedHostPort = diagnostics?.hostPort || healthData?.dockerHostPublishedPort || "25565";
  const displayedContainerPort = diagnostics?.containerPort || healthData?.internalContainerPort || "25565";
  const isTcpReachable = diagnostics ? diagnostics.localTcpReachable : healthData ? healthData.localTcpReachable : status === "running";
  const failureReason = diagnostics?.failureReason || healthData?.failureReason;
  const recommendedAction = diagnostics?.recommendedAction || healthData?.recommendedAction;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                <Globe className="w-6 h-6 text-theme-500" />
                Playit.gg Tunnel & Health Monitor
              </h1>
              {renderHealthBadge(currentHealth)}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Automated tunnel health monitoring, TCP reachability testing, and player-safe recovery for Minecraft.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunHealthTest}
              disabled={isTesting || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted-hover text-foreground font-semibold text-xs rounded-xl border border-border-subtle transition-all active:scale-95 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-theme-500" /> : <Activity className="w-3.5 h-3.5 text-theme-500" />}
              <span>{isTesting ? "Testing Health..." : "Test Connection"}</span>
            </button>

            {status === "running" && (
              <button
                onClick={requestRestart}
                disabled={isProcessing || isTesting}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 font-semibold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Restart</span>
              </button>
            )}
          </div>
        </div>

        {/* Failure / Advisory Banner if unhealthy */}
        {failureReason && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 md:p-5 rounded-2xl border ${
              currentHealth === "healthy"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : currentHealth === "needs_admin_attention" || currentHealth === "agent_offline"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">Diagnostic Notice</h3>
                  <p className="text-xs mt-1 opacity-90">{failureReason}</p>
                  {recommendedAction && (
                    <p className="text-xs mt-1 font-semibold text-foreground/90">
                      Recommendation: {recommendedAction}
                    </p>
                  )}
                </div>
              </div>

              {(currentHealth === "needs_admin_attention" || currentHealth === "tunnel_unhealthy") && (
                <button
                  onClick={requestForceRecover}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all shadow-md active:scale-95 shrink-0"
                >
                  Force Recovery
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Diagnostics & Status Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Local Minecraft & TCP Reachability */}
          <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Server className="w-4 h-4 text-theme-500" /> Minecraft Server
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                {serverRuntimeType.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Local TCP Reachability:</span>
                <span className="font-semibold flex items-center gap-1">
                  {isTcpReachable ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reachable (127.0.0.1)
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Unreachable
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Port Publication:</span>
                <span className="font-mono text-foreground font-semibold flex items-center gap-1">
                  {displayedContainerPort} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {displayedHostPort}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Online Players:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-theme-500" />
                  {playerCount} active
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Tunnel Endpoint & Public Address */}
          <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-theme-500" /> Public Tunnel
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                Playit.gg
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-xs">
                <span className="text-muted-foreground block mb-1">Public Ingress Address:</span>
                {publicAddress ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded-xl border border-border-subtle">
                    <span className="font-mono text-xs font-bold text-theme-400 truncate select-all">
                      {publicAddress}
                    </span>
                    <button
                      onClick={() => copyToClipboard(publicAddress)}
                      className="p-1 hover:bg-muted-hover rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copy address"
                    >
                      {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    {claimLink ? "Claim link generated below" : "Tunnel not active"}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Agent Status:</span>
                <span className="font-semibold text-foreground capitalize">{status}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Auto-Recovery Health Diagnostics */}
          <div className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-theme-500" /> Recovery Policy
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                Auto-Heal
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Recovery Attempts:</span>
                <span className="font-semibold text-foreground">
                  {healthData?.recoveryAttemptCount || 0} / 3
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Successful Check:</span>
                <span className="font-semibold text-foreground truncate max-w-[140px]">
                  {healthData?.lastSuccessfulCheck
                    ? new Date(healthData.lastSuccessfulCheck).toLocaleTimeString()
                    : "None recorded"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Next Scheduled Run:</span>
                <span className="font-semibold text-foreground">5 min interval</span>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Link Alert if unlinked */}
        {claimLink && (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 bg-gradient-to-r from-theme-600/20 via-theme-600/10 to-transparent border border-theme-600/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          >
            <div>
              <h3 className="text-foreground font-bold text-sm flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-theme-500" /> Playit Account Registration Required
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Link this agent to your Playit.gg dashboard to assign custom domain names and manage routes.
              </p>
            </div>
            <a
              href={claimLink}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-theme-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-theme-500 transition-all shrink-0 text-center shadow-md active:scale-95"
            >
              Claim Agent on Playit.gg
            </a>
          </motion.div>
        )}

        {/* Main Controls Card */}
        <div className="bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Tunnel Process Control</h2>
              <p className="text-xs text-muted-foreground">
                Manage the background supervisor process and credentials for this server's tunnel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {status !== "running" ? (
                <button
                  onClick={generateTunnel}
                  disabled={isProcessing || status === "checking"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-theme-600 hover:bg-theme-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Start Tunnel</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={stopTunnel}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    <span>Stop Tunnel</span>
                  </button>

                  {!showResetConfirm ? (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted-hover text-muted-foreground hover:text-foreground border border-border-subtle font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reset Agent & Secret</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-red-400 font-semibold">Regenerate secret?</span>
                      <button
                        onClick={resetTunnel}
                        disabled={isProcessing}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-all active:scale-95"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="bg-muted hover:bg-muted-hover text-muted-foreground px-2 py-1 rounded-lg text-xs transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed View: Terminal Logs & Recovery Audit */}
        <div className="bg-card border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-muted/40">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("terminal")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "terminal"
                    ? "bg-theme-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Playit Logs</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("audit");
                  fetchAuditLogs();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "audit"
                    ? "bg-theme-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Recovery Audit Log</span>
              </button>
            </div>

            {activeTab === "terminal" && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-border-subtle text-theme-600 focus:ring-0"
                  />
                  <span>Auto-scroll</span>
                </label>
                <button
                  onClick={() => copyToClipboard(logs)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy logs"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {activeTab === "terminal" ? (
              <div className="h-[360px] bg-background rounded-xl p-4 font-mono text-[12px] leading-relaxed text-zinc-300 overflow-y-auto whitespace-pre-wrap border border-border-subtle selection:bg-theme-600 selection:text-white">
                {logs || (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    Playit agent is idle. Click 'Start Tunnel' to initialize.
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            ) : (
              <div className="h-[360px] overflow-y-auto pr-1 space-y-2">
                {isLoadingAudit ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground gap-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-theme-500" />
                    <span>Loading audit records...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 text-xs">
                    <Info className="w-5 h-5 text-muted-foreground/60" />
                    <span>No recovery or restart events recorded yet.</span>
                  </div>
                ) : (
                  auditLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3.5 bg-muted/40 rounded-xl border border-border-subtle text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              entry.success ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {entry.action.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Triggered by <span className="font-semibold text-foreground">{entry.performedBy}</span> ({entry.trigger}) &bull; Active players: {entry.playerCount}
                      </p>
                      <p className="text-foreground/90 font-medium">{entry.reason}</p>
                      {entry.details && (
                        <p className="text-[11px] text-muted-foreground font-mono bg-background/50 p-1.5 rounded-lg">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safety Warning Modal for Active Players */}
      <AnimatePresence>
        {playerWarningModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-bold text-foreground">Active Players Online</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                There are currently <strong className="text-foreground">{playerCount} active player(s)</strong> connected to this server.
                Restarting the Playit tunnel will temporarily drop active player connections and require them to reconnect.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  onClick={() => setPlayerWarningModal({ isOpen: false, action: "restart" })}
                  className="px-4 py-2 bg-muted hover:bg-muted-hover text-muted-foreground text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (playerWarningModal.action === "force_recover") {
                      executeForceRecover();
                    } else {
                      executeRestart(true);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Proceed with Restart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
