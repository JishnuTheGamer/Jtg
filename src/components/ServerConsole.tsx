import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Terminal as XTerm,
  Cpu,
  MemoryStick,
  HardDrive,
  Send,
  Sparkles,
  Clock,
  Play,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

interface ServerStats {
  cpu: number;
  ram: number;
  disk: number;
  limitRam: number;
  limitCpu: number;
  limitDisk: number;
  isRunning?: boolean;
  status?: string;
  startedAt?: string | null;
  uptimeSeconds?: number;
}

interface ServerConsoleProps {
  serverId: string;
  server?: {
    name?: string;
    version?: string;
    type?: string;
    port?: number;
    ipAlias?: string;
    status?: string;
    startedAt?: string | null;
    [key: string]: unknown;
  };
}

const MAX_LOG_LINES = 400;
const STATS_POLL_MS = 2000;
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const DEFAULT_STATS: ServerStats = {
  cpu: 0,
  ram: 0,
  disk: 0,
  limitRam: 2048,
  limitCpu: 100,
  limitDisk: 10,
};

const stripAnsi = (s: string) => s.replace(ANSI_RE, "");

// Format total seconds into standard digital HH:MM:SS or Dd HH:MM:SS
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return "00:00:00";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hhmmss = [hours, minutes, seconds].map((x) => String(x).padStart(2, "0")).join(":");
  if (days > 0) {
    return `${days}d ${hhmmss}`;
  }
  return hhmmss;
}

// Format total seconds into human-readable duration (e.g., 2h 15m 30s)
function formatHumanDuration(totalSeconds: number): string {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

// Format start date and time
function formatStartTime(isoString?: string | null): { short: string; full: string } {
  if (!isoString) return { short: "Not Running", full: "Server is currently offline" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { short: "Not Running", full: "Unknown start time" };

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  if (isToday) {
    return {
      short: `Today at ${timeStr}`,
      full: `Started today at ${d.toLocaleTimeString()} (${d.toLocaleDateString()})`
    };
  }

  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return {
    short: `${dateStr}, ${timeStr}`,
    full: `Started on ${d.toLocaleString()}`
  };
}

// Smooth Number Counter
function FormattedNumber({ value, dec = 0 }: { value: number; dec?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    const duration = 400;
    const start = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        prev.current = to;
      }
    };
    requestAnimationFrame(frame);
  }, [value]);

  return <span className="tabular-nums font-mono">{display.toFixed(dec)}</span>;
}

export default function ServerConsole({ serverId, server }: ServerConsoleProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [cmdHist, setCmdHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [stats, setStats] = useState<ServerStats>(DEFAULT_STATS);
  const [autoScroll, setAutoScroll] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [startedAt, setStartedAt] = useState<string | null>(server?.startedAt || null);
  const [status, setStatus] = useState<string>(server?.status || "offline");
  const [uptime, setUptime] = useState("00:00:00");
  const [uptimeHuman, setUptimeHuman] = useState("0s");

  const autoScrollRef = useRef(autoScroll);
  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sockRef = useRef<Socket | null>(null);
  const connectedOnceRef = useRef(false);
  const { token } = useAuth();

  // Synchronize server prop updates
  useEffect(() => {
    if (server?.startedAt !== undefined) {
      setStartedAt(server.startedAt);
    }
    if (server?.status) {
      setStatus(server.status);
    }
  }, [server?.startedAt, server?.status]);

  // Live Accurate Uptime Ticker
  useEffect(() => {
    const updateTicker = () => {
      const isOnline = status === "online";
      if (!isOnline || !startedAt) {
        setUptime("00:00:00");
        setUptimeHuman("0s");
        return;
      }

      const startMs = new Date(startedAt).getTime();
      if (isNaN(startMs) || startMs <= 0) {
        setUptime("00:00:00");
        setUptimeHuman("0s");
        return;
      }

      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setUptime(formatDuration(elapsed));
      setUptimeHuman(formatHumanDuration(elapsed));
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  // Socket Connection for live logs
  useEffect(() => {
    if (!token || !serverId) return;

    const socket: Socket = io({
      auth: { token },
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 4000,
    });
    sockRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinServer", serverId);
    });

    socket.on("log", (data: string) => {
      if (typeof data !== "string") return;
      const lines = data.split(/\r?\n/).filter((l) => l.trim());

      setLogs((prev) => {
        const next = [...prev, ...lines];
        return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
      });

      if (!autoScrollRef.current) {
        setUnreadCount((c) => c + lines.length);
      }
    });

    socket.on("disconnect", () => {
      // quiet disconnect handling without polluting the logs
    });

    return () => {
      socket.emit("leaveServer", serverId);
      socket.removeAllListeners();
      socket.disconnect();
      sockRef.current = null;
    };
  }, [serverId, token]);

  // Polling Server Vitals and Process Status
  useEffect(() => {
    if (!serverId) return;
    let alive = true;

    const fetchStats = async () => {
      try {
        const { data } = await axios.get<ServerStats>(`/api/servers/${serverId}/stats`);
        if (alive && data) {
          setStats((prev) => ({
            cpu: data.cpu ?? prev.cpu,
            ram: data.ram ?? prev.ram,
            disk: data.disk ?? prev.disk,
            limitRam: data.limitRam ?? prev.limitRam,
            limitCpu: data.limitCpu ?? prev.limitCpu,
            limitDisk: data.limitDisk ?? prev.limitDisk,
          }));

          if (data.status) {
            setStatus(data.status);
          }
          if (data.startedAt !== undefined) {
            setStartedAt(data.startedAt);
          }
        }
      } catch {
        // quiet fallback
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, STATS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [serverId]);

  // Autoscroll to bottom
  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [logs, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isClose = distanceToBottom < 40;
    setAutoScroll(isClose);
    if (isClose) setUnreadCount(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      setAutoScroll(true);
      setUnreadCount(0);
    }
  }, []);

  // Clear Terminal Output
  const clearConsole = useCallback(() => {
    setLogs([]);
    setUnreadCount(0);
  }, []);

  // Send Command
  const sendCommand = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const cmd = command.trim();
      if (!cmd) return;

      setCommand("");
      setCmdHist((h) => [cmd, ...h.filter((item) => item !== cmd)].slice(0, 50));
      setHistIdx(-1);
      setLogs((p) => [...p, `> ${cmd}`]);

      try {
        await axios.post(`/api/servers/${serverId}/command`, { command: cmd });
      } catch (err: any) {
        setLogs((p) => [...p, `[Error] Command failed: ${err.message}`]);
      }
    },
    [command, serverId]
  );

  const fillQuickCommand = (cmd: string) => {
    setCommand(cmd);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistIdx((i) => {
          const next = Math.min(i + 1, cmdHist.length - 1);
          if (cmdHist[next]) setCommand(cmdHist[next]);
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistIdx((i) => {
          const next = i - 1;
          if (next < 0) {
            setCommand("");
            return -1;
          }
          setCommand(cmdHist[next]);
          return next;
        });
      }
    },
    [cmdHist]
  );

  // Vitals percentages
  const cpuPct = useMemo(() => Math.min((stats.cpu / (stats.limitCpu || 100)) * 100, 100), [stats.cpu, stats.limitCpu]);
  const ramPct = useMemo(() => Math.min((stats.ram / (stats.limitRam || 2048)) * 100, 100), [stats.ram, stats.limitRam]);
  const diskPct = useMemo(() => Math.min((stats.disk / (stats.limitDisk || 10)) * 100, 100), [stats.disk, stats.limitDisk]);

  const isOnline = status === "online";
  const startInfo = formatStartTime(startedAt);

  // Render log line with crisp white body text and theme colored tags/prefixes
  const renderLogLine = (raw: string, index: number) => {
    const clean = stripAnsi(raw);

    // Command line: > command or $ command
    if (clean.startsWith(">") || clean.startsWith("$ ")) {
      const spaceIdx = clean.indexOf(" ");
      const promptChar = spaceIdx !== -1 ? clean.slice(0, spaceIdx + 1) : clean.slice(0, 1) + " ";
      const cmdBody = spaceIdx !== -1 ? clean.slice(spaceIdx + 1) : clean.slice(1);
      return (
        <div key={index} className="break-words whitespace-pre-wrap hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors flex items-start gap-1">
          <span className="text-theme-400 font-mono font-bold select-none">{promptChar}</span>
          <span className="text-white font-mono font-semibold">{cmdBody}</span>
        </div>
      );
    }

    // System messages e.g. [System] or [CONSOLE]
    if (clean.startsWith("[System]") || clean.startsWith("[System ") || clean.startsWith("[CONSOLE]")) {
      const endBracketIdx = clean.indexOf("]");
      const tag = clean.slice(0, endBracketIdx + 1);
      const msg = clean.slice(endBracketIdx + 1);
      return (
        <div key={index} className="break-words whitespace-pre-wrap hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors">
          <span className="text-theme-400 font-mono font-bold mr-1.5 select-none">{tag}</span>
          <span className="text-white font-mono font-normal">{msg}</span>
        </div>
      );
    }

    // Standard Minecraft log format: [HH:mm:ss INFO]: msg or [HH:mm:ss] [Thread/LEVEL]: msg
    const mcMatch = clean.match(/^(\[[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\s+[A-Z]+)?\](?:\s+\[[^\]]+\])?:?)(.*)$/);
    if (mcMatch) {
      const header = mcMatch[1];
      const body = mcMatch[2];
      const isError = /ERROR|Exception|FATAL|Severe/i.test(header) || /ERROR|Exception|FATAL|Severe/i.test(body);
      const isWarn = /WARN|Warning/i.test(header) || /WARN|Warning/i.test(body);

      let headerClass = "text-theme-400 font-mono font-semibold";
      let lineBg = "hover:bg-white/[0.03]";
      if (isError) {
        headerClass = "text-rose-400 font-mono font-bold";
        lineBg = "bg-rose-500/[0.07] hover:bg-rose-500/[0.14]";
      } else if (isWarn) {
        headerClass = "text-amber-400 font-mono font-bold";
        lineBg = "bg-amber-500/[0.07] hover:bg-amber-500/[0.14]";
      }

      return (
        <div key={index} className={`break-words whitespace-pre-wrap px-1.5 py-0.5 rounded transition-colors ${lineBg}`}>
          <span className={`${headerClass} mr-1.5 select-none`}>{header}</span>
          <span className="text-white font-mono font-normal">{body}</span>
        </div>
      );
    }

    // General error/warn matching without bracket format
    const isError = /ERROR|Exception|FATAL|Severe/i.test(clean);
    const isWarn = /WARN|Warning/i.test(clean);

    if (isError) {
      return (
        <div key={index} className="break-words whitespace-pre-wrap bg-rose-500/[0.07] hover:bg-rose-500/[0.14] px-1.5 py-0.5 rounded transition-colors text-white font-mono font-normal">
          <span className="text-rose-400 font-bold mr-1.5">[ERROR]</span>
          <span>{clean}</span>
        </div>
      );
    }

    if (isWarn) {
      return (
        <div key={index} className="break-words whitespace-pre-wrap bg-amber-500/[0.07] hover:bg-amber-500/[0.14] px-1.5 py-0.5 rounded transition-colors text-white font-mono font-normal">
          <span className="text-amber-400 font-bold mr-1.5">[WARN]</span>
          <span>{clean}</span>
        </div>
      );
    }

    // Standard raw console log: Pure bright white text
    return (
      <div key={index} className="break-words whitespace-pre-wrap text-white font-mono font-normal hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors">
        {clean}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col p-2 sm:p-4 min-h-[550px] font-sans">
      <div className="flex-1 flex flex-col qx-glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
        
        {/* CONSOLE HEADER WITH LIVE UPTIME AND START TIME */}
        <div className="px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
          {/* Left: Terminal Identity, Start Timestamp and Live Uptime */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-theme-500/30 bg-theme-500/10 flex items-center justify-center text-theme-400 shrink-0 shadow-sm shadow-theme-500/20">
              <XTerm className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs sm:text-sm font-bold text-theme-300 tracking-wide truncate">
                  {server?.name || "Server Terminal"}
                </span>
                <span className="hidden sm:inline-block font-mono text-[11px] text-theme-400/80">
                  ({server?.version || "Minecraft"})
                </span>
              </div>

              {/* Live Uptime and Start Time Row in Theme Color */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-theme-400 font-mono text-[10px] sm:text-[11px] mt-0.5">
                {isOnline ? (
                  <>
                    {/* Live Uptime Duration */}
                    <div 
                      className="flex items-center gap-1.5 text-theme-300 font-semibold cursor-help transition-colors hover:text-theme-200"
                      title={`Elapsed Uptime: ${uptimeHuman} (${uptime})`}
                    >
                      <Clock className="w-3.5 h-3.5 text-theme-400 animate-pulse shrink-0" />
                      <span>Uptime: {uptime}</span>
                      <span className="text-theme-400/80 font-normal hidden sm:inline">({uptimeHuman})</span>
                    </div>

                    <span className="text-theme-500/40 hidden xs:inline">•</span>

                    {/* Server Start Time */}
                    <div 
                      className="flex items-center gap-1 text-theme-400 cursor-help transition-colors hover:text-theme-200"
                      title={startInfo.full}
                    >
                      <Play className="w-3 h-3 text-theme-400 fill-theme-400 shrink-0" />
                      <span>Started: <strong className="font-medium text-theme-200">{startInfo.short}</strong></span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Uptime: 00:00:00 (Offline)</span>
                  </div>
                )}

                {server?.port && (
                  <>
                    <span className="text-theme-500/40 hidden sm:inline">•</span>
                    <span className="text-theme-400/80 font-mono hidden sm:inline">
                      :{server.port}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Clean Terminal Status & Clear Buffer */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {isOnline ? (
              <div 
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-theme-500/10 border border-theme-500/30 text-theme-300 font-mono text-[11px] shadow-sm shadow-theme-500/15"
                title={startInfo.full}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-500"></span>
                </span>
                <span className="font-bold text-theme-300">Online</span>
                <span className="text-theme-400/80 text-[10px] hidden xs:inline">• {uptime}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-mono text-[11px]">
                <span className="inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                <span>Stopped</span>
              </div>
            )}

            {/* Clear Console Buffer button */}
            <button
              onClick={clearConsole}
              title="Clear terminal buffer"
              className="p-1.5 rounded-lg bg-theme-500/10 hover:bg-theme-500/20 border border-theme-500/30 text-theme-400 hover:text-theme-200 transition-all text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TERMINAL LOG BUFFER VIEWPORT CONTAINER */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            ref={bodyRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3.5 sm:p-5 font-mono text-[13px] sm:text-[14px] leading-relaxed bg-black/50 backdrop-blur-md custom-scrollbar select-text space-y-1"
            role="log"
          >
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <XTerm className="w-10 h-10 opacity-30 mb-3 text-theme-400" />
                <p className="font-mono text-sm font-semibold text-theme-300">Terminal Ready</p>
                <p className="text-xs text-theme-400/80 mt-1 max-w-sm">
                  {isOnline 
                    ? `Server is online since ${startInfo.short}. Listening for output...` 
                    : "Server is offline. Start the server to stream logs and commands."}
                </p>
              </div>
            )}

            {logs.map((raw, index) => renderLogLine(raw, index))}
          </div>

          {/* SLEEK FLOATING SIDE ARROW BUTTON */}
          {!autoScroll && (
            <button
              onClick={scrollToBottom}
              title="Scroll to latest logs"
              className="absolute bottom-3 right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900/90 hover:bg-theme-500 hover:text-black border border-white/20 hover:border-theme-400 text-zinc-300 shadow-xl backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-95 group"
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-0.5 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-theme-500 text-black text-[10px] font-bold font-mono shadow-md flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* QUICK COMMANDS SECTION */}
        <div className="px-3.5 sm:px-4 py-2.5 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-theme-300 shrink-0 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-theme-400" /> Quick:
          </span>
          {(() => {
            const serverType = String(server?.type || "").toLowerCase();
            if (serverType === "nodejs" || serverType === "node") {
              return [
                { cmd: "node -v", label: "node -v" },
                { cmd: "npm -v", label: "npm -v" },
                { cmd: "npm list", label: "npm list" },
                { cmd: "npm test", label: "npm test" },
              ];
            } else if (serverType === "python" || serverType === "python3") {
              return [
                { cmd: "python3 --version", label: "python -V" },
                { cmd: "pip list", label: "pip list" },
                { cmd: "pip check", label: "pip check" },
              ];
            }
            return [
              { cmd: "list", label: "list" },
              { cmd: "tps", label: "tps" },
              { cmd: "save-all", label: "save-all" },
              { cmd: "whitelist list", label: "whitelist" },
              { cmd: "gamerule keepInventory true", label: "keepInventory" },
              { cmd: "reload confirm", label: "reload" },
              { cmd: "stop", label: "stop" },
            ];
          })().map((q) => (
            <button
              key={q.cmd}
              onClick={() => fillQuickCommand(q.cmd)}
              className="min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl bg-theme-500/10 border border-theme-500/30 text-theme-300 hover:text-theme-100 hover:border-theme-400 hover:bg-theme-500/20 font-mono text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* NEAT & CLEAN COMMAND TYPE BAR */}
        <form onSubmit={sendCommand} className="p-2.5 sm:p-3.5 border-t border-white/10 bg-black/60 backdrop-blur-xl flex gap-2.5 items-center">
          <div className="flex-1 min-h-[46px] flex items-center rounded-xl border border-theme-500/30 bg-black/50 px-3.5 py-1.5 focus-within:border-theme-500/80 focus-within:ring-2 focus-within:ring-theme-500/30 transition-all">
            <span className="text-theme-400 font-mono text-base font-bold mr-2.5 select-none shrink-0">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={(() => {
                const sType = String(server?.type || "").toLowerCase();
                if (sType === "nodejs" || sType === "node") return "Enter Node.js stdin or shell command...";
                if (sType === "python" || sType === "python3") return "Enter Python stdin or shell command...";
                return "Enter server command (e.g. op, gamemode, say)...";
              })()}
              spellCheck="false"
              autoComplete="off"
              className="w-full bg-transparent py-1 text-sm sm:text-base font-mono text-white focus:outline-none placeholder:text-theme-400/40 caret-theme-400"
            />
          </div>
          <button
            type="submit"
            disabled={!command.trim()}
            className="min-h-[46px] px-5 sm:px-6 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold text-black bg-theme-500 hover:bg-theme-400 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-lg shadow-theme-500/20 shrink-0 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

        {/* VITALS DOCK AT THE BOTTOM OF THE CONSOLE */}
        <div className="border-t border-white/10 bg-black/40 backdrop-blur-md p-3 sm:p-3.5">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            
            {/* CPU VITAL */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-theme-500/[0.03] border border-theme-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs uppercase font-bold text-theme-400">
                  <Cpu className="w-3.5 h-3.5 text-theme-400" />
                  <span>CPU</span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white">
                  <FormattedNumber value={stats.cpu} dec={1} />%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-theme-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${cpuPct}%` }}
                />
              </div>
            </div>

            {/* RAM VITAL */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-theme-500/[0.03] border border-theme-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs uppercase font-bold text-theme-400">
                  <MemoryStick className="w-3.5 h-3.5 text-theme-400" />
                  <span>RAM</span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white truncate">
                  <FormattedNumber value={stats.ram} dec={0} />
                  <span className="text-[10px] text-theme-400/80 ml-0.5">/{stats.limitRam || 2048}M</span>
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-theme-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${ramPct}%` }}
                />
              </div>
            </div>

            {/* DISK VITAL */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-theme-500/[0.03] border border-theme-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="flex items-center gap-1 font-mono text-[11px] sm:text-xs uppercase font-bold text-theme-400">
                  <HardDrive className="w-3.5 h-3.5 text-theme-400" />
                  <span>Disk</span>
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white truncate">
                  <FormattedNumber value={stats.disk} dec={1} />
                  <span className="text-[10px] text-theme-400/80 ml-0.5">/{stats.limitDisk || 10}G</span>
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-theme-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${diskPct}%` }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
