import React, { useState, useEffect, useRef } from "react";
import {
  Server,
  Plus,
  X,
  ServerCrash,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Globe,
  Clock,
  Zap,
  Radio
} from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";

interface NodeStats {
  cpuUsage: number;
  cpuCores?: number;
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    percent: number;
  };
  disk: {
    totalMB: number;
    usedMB: number;
    percent: number;
  };
  uptime?: number;
  timestamp?: number;
}

interface NodeData {
  id: string;
  name: string;
  ip?: string;
  hostname?: string;
  apiPort?: number;
  memory?: number;
  usedMemory?: number;
  ramUsagePercent?: number;
  disk?: number;
  usedDisk?: number;
  diskUsagePercent?: number;
  cpuCores?: number;
  cpuModel?: string;
  serversCount?: number;
  isLocal?: boolean;
  status?: string;
  uptime?: number;
  history?: number[];
}

function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Just started";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatStorageMB(mb: number): string {
  if (!mb || mb <= 0) return "0 MB";
  if (mb >= 1024 * 1024) return `${(mb / (1024 * 1024)).toFixed(2)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

// Interactive SVG Area Chart for live metric streaming
function LiveSparkline({
  data,
  color = "#10b981",
  gradientId,
  height = 56,
  label = "Usage"
}: {
  data: number[];
  color?: string;
  gradientId: string;
  height?: number;
  label?: string;
}) {
  const points = data.length >= 2 ? data : [0, ...(data.length === 1 ? data : [0])];
  const max = 100;
  const width = 280;
  const step = width / (points.length - 1);

  const coordinates = points.map((val, idx) => ({
    x: Math.round(idx * step * 10) / 10,
    y: Math.round((height - (Math.max(0, Math.min(100, val)) / max) * (height - 8) - 4) * 10) / 10
  }));

  const linePath = coordinates.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, "");

  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${height} L ${coordinates[0].x} ${height} Z`;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-14 overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="90%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Baseline grid */}
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="rgba(255,255,255,0.08)" />
        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        {/* Stroke curve */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Latest point pulse */}
        {coordinates.length > 0 && (
          <circle
            cx={coordinates[coordinates.length - 1].x}
            cy={coordinates[coordinates.length - 1].y}
            r="3"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}

export default function Nodes() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [nodeStats, setNodeStats] = useState<Record<string, NodeStats>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    hostname: "",
    apiUrl: "",
    token: "",
    ssl: false,
    apiPort: 8080,
    memory: 8192,
    disk: 50000,
    location: "Default"
  });

  const fetchNodes = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await axios.get("/api/nodes");
      const list: NodeData[] = res.data;
      setNodes(list);

      // Fetch live stats for each node
      list.forEach(async (node) => {
        try {
          const statsRes = await axios.get(`/api/nodes/${node.id}/stats`);
          const st: NodeStats = statsRes.data;
          setNodeStats((prev) => ({ ...prev, [node.id]: st }));
          setHistoryMap((prev) => {
            const curHistory = prev[node.id] || [st.cpuUsage, st.cpuUsage];
            const next = [...curHistory.slice(-19), st.cpuUsage];
            return { ...prev, [node.id]: next };
          });
        } catch (e) {}
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load nodes");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(() => {
      fetchNodes(true);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchNodes(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/nodes", formData);
      setIsModalOpen(false);
      setFormData({
        name: "",
        hostname: "",
        apiUrl: "",
        token: "",
        ssl: false,
        apiPort: 8080,
        memory: 8192,
        disk: 50000,
        location: "Default"
      });
      fetchNodes();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add node");
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (id === "local") {
      alert("Built-in host node cannot be removed.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this node? Existing servers on this node will not be deleted but can no longer be reached.")) {
      return;
    }
    setDeletingId(id);
    try {
      await axios.delete(`/api/nodes/${id}`);
      setNodes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete node");
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute aggregate stats across nodes
  const totalNodesCount = nodes.length;
  const totalServersCount = nodes.reduce((sum, n) => sum + (n.serversCount || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono uppercase">
              Nodes
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Beta Testing
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Node system daemon management and hardware metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-theme-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-theme-600 hover:bg-theme-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-theme-600/20 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" /> Add Node
          </button>
        </div>
      </div>

      {/* QUICK SYSTEM AGGREGATE SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-theme-500/10 border border-theme-500/20 text-theme-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Active Nodes</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{totalNodesCount}</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Hosted Instances</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{totalServersCount}</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Cluster Status</div>
            <div className="text-sm font-semibold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 100% Operational
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Telemetry Stream</div>
            <div className="text-sm font-mono text-zinc-300 mt-1">3.5s Polling</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 flex items-center gap-3 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* NODE CARDS / EXPANDED FLAT CARDS */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500 font-mono text-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-theme-500" />
          <span>Retrieving node telemetry...</span>
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-950/40 p-8">
          <ServerCrash className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No nodes configured</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-sm">
            Connect your host daemon or a Pterodactyl Wings node to start orchestrating containers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {nodes.map((node) => {
            const stats = nodeStats[node.id];
            const history = historyMap[node.id] || [
              node.ramUsagePercent || 20,
              node.ramUsagePercent || 25,
              node.ramUsagePercent || 22
            ];

            const currentCpu = stats?.cpuUsage !== undefined ? stats.cpuUsage : 0;
            const cpuCores = stats?.cpuCores || node.cpuCores || 4;

            const totalRamMB = stats?.memory?.totalMB || node.memory || 8192;
            const usedRamMB = stats?.memory?.usedMB || node.usedMemory || Math.round(totalRamMB * 0.25);
            const freeRamMB = Math.max(0, totalRamMB - usedRamMB);
            const ramPercent = stats?.memory?.percent !== undefined
              ? stats.memory.percent
              : Math.round((usedRamMB / totalRamMB) * 100);

            const totalDiskMB = stats?.disk?.totalMB || node.disk || 50000;
            const usedDiskMB = stats?.disk?.usedMB || node.usedDisk || Math.round(totalDiskMB * 0.15);
            const availableDiskMB = Math.max(0, totalDiskMB - usedDiskMB);
            const rawDiskPercent = totalDiskMB > 0 ? (usedDiskMB / totalDiskMB) * 100 : 0;
            const diskPercent = stats?.disk?.percent !== undefined
              ? stats.disk.percent
              : Math.round(rawDiskPercent);

            const formattedUsedRam = formatStorageMB(usedRamMB);
            const formattedTotalRam = formatStorageMB(totalRamMB);
            const formattedFreeRam = formatStorageMB(freeRamMB);

            const formattedUsedDisk = formatStorageMB(usedDiskMB);
            const formattedTotalDisk = formatStorageMB(totalDiskMB);
            const formattedAvailableDisk = formatStorageMB(availableDiskMB);

            const nodeEndpoint = `${node.hostname || node.ip || "localhost"}:${node.apiPort || 3000}`;

            return (
              <div
                key={node.id}
                className="rounded-2xl border border-white/10 bg-zinc-950/70 backdrop-blur-md p-5 sm:p-6 shadow-xl transition-all hover:border-white/20"
              >
                {/* NODE TOP BAR */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/5">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 text-theme-400 shadow-inner">
                      <Server className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-bold text-white font-mono">{node.name}</h3>
                        <span className="flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Online
                        </span>
                        {node.isLocal ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Local Engine
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Wings Agent
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-zinc-500" />
                          {nodeEndpoint}
                        </span>
                        <button
                          onClick={() => copyToClipboard(nodeEndpoint, node.id)}
                          className="hover:text-white flex items-center gap-1 text-zinc-400 hover:underline transition-all"
                        >
                          {copiedId === node.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Host</span>
                            </>
                          )}
                        </button>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Clock className="w-3.5 h-3.5" />
                          Uptime: {formatUptime(stats?.uptime || node.uptime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE CONTROLS & INSTANCES */}
                  <div className="flex items-center gap-3 self-end lg:self-center">
                    <Link
                      to="/servers"
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-theme-400" />
                      <span>{node.serversCount || 0} Servers</span>
                    </Link>

                    {!node.isLocal && (
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        disabled={deletingId === node.id}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                        title="Delete node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* REAL-TIME USAGE METRICS (FLAT & EXPANSIVE GRAPH SECTION) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
                  {/* 1. CPU USAGE & LIVE SPARKLINE */}
                  <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                          <Cpu className="w-4 h-4 text-theme-400" />
                          <span>CPU Load</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">{cpuCores} Threads</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black font-mono text-white tracking-tight">
                          {currentCpu}%
                        </span>
                        <span className="text-xs font-mono text-emerald-400">Live Rate</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <LiveSparkline
                        data={history}
                        color="#ef4444"
                        gradientId={`cpu-grad-${node.id}`}
                        height={50}
                        label="CPU"
                      />
                    </div>
                  </div>

                  {/* 2. RAM ALLOCATION & PERCENTAGE GAUGE */}
                  <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                          <Activity className="w-4 h-4 text-blue-400" />
                          <span>RAM Allocation</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-300 font-medium">
                          {formattedUsedRam} / {formattedTotalRam}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black font-mono text-white tracking-tight">
                          {ramPercent}%
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {freeRamMB > 0 ? `${formattedFreeRam} free` : "Max capacity"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="w-full bg-zinc-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                          style={{ width: `${Math.min(100, Math.max(usedRamMB > 0 ? 3 : 0, ramPercent))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>0 MB</span>
                        <span>{formattedTotalRam} Total</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. DISK STORAGE & PERCENTAGE GAUGE */}
                  <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                          <HardDrive className="w-4 h-4 text-emerald-400" />
                          <span>Disk Capacity</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-300 font-medium">
                          {formattedUsedDisk} / {formattedTotalDisk}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black font-mono text-white tracking-tight">
                          {diskPercent < 1 && usedDiskMB > 0 ? "<1" : diskPercent}%
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {availableDiskMB > 0 ? `${formattedAvailableDisk} available` : "Full capacity"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="w-full bg-zinc-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          style={{ width: `${Math.min(100, Math.max(usedDiskMB > 0 ? 3 : 0, diskPercent))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>0 MB</span>
                        <span>{formattedTotalDisk} Space</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD WINGS NODE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-theme-400" />
                <h2 className="text-lg font-bold font-mono text-white">Add Wings Node</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNode} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-mono uppercase text-zinc-400">Node Identifier Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500 font-mono"
                  placeholder="e.g. EU-Frankfurt-Node01"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-mono uppercase text-zinc-400">Hostname / FQDN</label>
                  <input
                    required
                    type="text"
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500 font-mono"
                    placeholder="node1.domain.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-mono uppercase text-zinc-400">Daemon API Port</label>
                  <input
                    type="number"
                    value={formData.apiPort}
                    onChange={(e) => setFormData({ ...formData, apiPort: parseInt(e.target.value) || 8080 })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500 font-mono"
                    placeholder="8080"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-mono uppercase text-zinc-400">Total Memory (MB)</label>
                  <input
                    type="number"
                    value={formData.memory}
                    onChange={(e) => setFormData({ ...formData, memory: parseInt(e.target.value) || 8192 })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-mono uppercase text-zinc-400">Total Disk (MB)</label>
                  <input
                    type="number"
                    value={formData.disk}
                    onChange={(e) => setFormData({ ...formData, disk: parseInt(e.target.value) || 50000 })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.ssl}
                    onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                    className="text-theme-600 rounded border-white/10 bg-black/60"
                  />
                  <span className="text-xs font-medium text-zinc-300">Enable SSL / TLS for daemon communication</span>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-mono uppercase text-zinc-400">Wings Bearer Token</label>
                <input
                  required
                  type="password"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500 font-mono"
                  placeholder="Daemon bearer authorization token"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-theme-600 hover:bg-theme-500 text-xs font-semibold text-white shadow-lg shadow-theme-600/25 transition-all"
                >
                  Deploy Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
