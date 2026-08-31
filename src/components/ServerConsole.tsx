// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Terminal as XTerm, Cpu, MemoryStick as MemoryIcon, HardDrive, 
  Play, Square, RotateCw, Wifi, Clock, ArrowDown, ArrowUp, ChevronRight
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
interface ServerStats {
  cpu: number;
  ram: number;
  disk: number;
  limitRam: number;
  limitCpu: number;
  limitDisk: number;
  netIn?: number;
  netOut?: number;
  startedAt?: string | null;
  status?: string;
}

interface ServerConsoleProps {
  serverId: string;
  server?: any;
}

const STATS_POLL_MS = 3000;
const SPARK_CAP = 30;

function stripAnsi(str: string) {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function formatSize(mb: number) {
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatRate(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
}

/* ═══════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════ */
const StatCard = ({ icon, label, value, dim }: any) => (
  <div className="relative bg-[#131010] rounded-[10px] py-[15px] pr-[18px] pl-[96px] min-h-[88px] overflow-hidden flex flex-col justify-center transition-colors duration-300 hover:bg-[#1c1818] group">
    <div className="absolute left-[16px] top-1/2 -translate-y-1/2 -rotate-[20deg] text-[#242121] transition-all duration-300 group-hover:text-[#2f2a2a] group-hover:scale-110 pointer-events-none">
      {icon}
    </div>
    <div className="text-[13px] text-[#9a9a9a] mb-[6px] relative z-10">{label}</div>
    <div className="text-[17px] font-[700] text-white whitespace-nowrap overflow-hidden text-ellipsis relative z-10">
      {value} {dim && <span className="text-[#6f6f6f] font-[400] text-[13px]">{dim}</span>}
    </div>
  </div>
);

const ChartCard = ({ title, data, dataKey, dataKey2, max, icons }: any) => {
  const chartData = useMemo(() => {
    let d = [...data];
    while (d.length < 30) {
      d.unshift({ [dataKey]: 0, ...(dataKey2 ? { [dataKey2]: 0 } : {}) });
    }
    return d;
  }, [data, dataKey, dataKey2]);

  return (
    <div className="bg-[#131010] rounded-[10px] p-[18px_20px]">
      <div className="flex justify-between items-center mb-[12px]">
        <div className="text-[15px] font-[700] text-white">{title}</div>
        {icons && <div className="flex gap-[9px] items-center">{icons}</div>}
      </div>
      <div className="relative h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.30)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0.03)" />
              </linearGradient>
              {dataKey2 && (
                <linearGradient id={`fill${dataKey2}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(232,189,21,0.30)" />
                  <stop offset="100%" stopColor="rgba(232,189,21,0.03)" />
                </linearGradient>
              )}
            </defs>
            <YAxis domain={[0, max || 'auto']} hide />
            <Area 
               type="monotone" 
               dataKey={dataKey} 
               stroke="#22d3ee" 
               strokeWidth={2} 
               fillOpacity={1} 
               fill={`url(#fill${dataKey})`} 
               isAnimationActive={false}
            />
            {dataKey2 && (
              <Area 
                 type="monotone" 
                 dataKey={dataKey2} 
                 stroke="#e8bd15" 
                 strokeWidth={2} 
                 fillOpacity={1} 
                 fill={`url(#fill${dataKey2})`} 
                 isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function ServerConsole({ serverId, server }: ServerConsoleProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  
  const [stats, setStats] = useState<ServerStats>({
    cpu: 0, ram: 0, disk: 0, limitRam: server?.ram || 1024, limitCpu: server?.cpu || 100, limitDisk: server?.disk || 10, status: server?.status || 'offline'
  });
  const [netRates, setNetRates] = useState({ in: 0, out: 0 });

  const [cpuHist, setCpuHist] = useState<any[]>([]);
  const [ramHist, setRamHist] = useState<any[]>([]);
  const [netHist, setNetHist] = useState<any[]>([]);
  
  const [atBottom, setAtBottom] = useState(true);
  const [uptime, setUptime] = useState(0);
  
  const sockRef = useRef<Socket | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevNetRef = useRef({ netIn: 0, netOut: 0, timestamp: 0 });
  const isVisible = useRef(true);

  /* ── Visibility Check ── */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  /* ── Socket stream ── */
  useEffect(() => {
    if (!token || !serverId) return;
    const socket: Socket = io({
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
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
        return next.length > 500 ? next.slice(next.length - 500) : next;
      });
    });
    return () => {
      socket.emit("leaveServer", serverId);
      socket.removeAllListeners();
      socket.disconnect();
      sockRef.current = null;
    };
  }, [serverId, token]);

  /* ── Fetch stats (Polling) ── */
  useEffect(() => {
    let alive = true;
    let failCount = 0;
    
    const pull = async () => {
      if (!alive) return;
      if (!isVisible.current) return; // Skip polling if tab is hidden
      
      try {
        const { data } = await axios.get<ServerStats>(`/api/servers/${serverId}/stats`);
        if (alive && data) {
          failCount = 0;
          setStats((p) => ({
            ...p,
            cpu: data.cpu ?? p.cpu,
            ram: data.ram ?? p.ram,
            disk: data.disk ?? p.disk,
            limitRam: data.limitRam ?? p.limitRam,
            limitCpu: data.limitCpu ?? p.limitCpu,
            limitDisk: data.limitDisk ?? p.limitDisk,
            startedAt: data.startedAt ?? p.startedAt,
            status: data.status ?? p.status,
          }));

          setCpuHist((h) => [...h, { cpu: data.cpu ?? 0 }].slice(-SPARK_CAP));
          setRamHist((h) => [...h, { ram: data.ram ?? 0 }].slice(-SPARK_CAP));
          
          const now = Date.now();
          if (prevNetRef.current.timestamp > 0 && data.netIn !== undefined && data.netOut !== undefined) {
            const elapsedSeconds = (now - prevNetRef.current.timestamp) / 1000;
            // Handle restart or counter reset
            if (data.netIn >= prevNetRef.current.netIn && data.netOut >= prevNetRef.current.netOut) {
                const inRate = Math.max(0, data.netIn - prevNetRef.current.netIn) / elapsedSeconds;
                const outRate = Math.max(0, data.netOut - prevNetRef.current.netOut) / elapsedSeconds;
                setNetRates({ in: inRate, out: outRate });
                setNetHist((h) => [...h, { netIn: inRate / 1024, netOut: outRate / 1024 }].slice(-SPARK_CAP)); // Save in KB/s for chart
            } else {
                setNetRates({ in: 0, out: 0 });
                setNetHist((h) => [...h, { netIn: 0, netOut: 0 }].slice(-SPARK_CAP));
            }
          }
          prevNetRef.current = { netIn: data.netIn || 0, netOut: data.netOut || 0, timestamp: now };
        }
      } catch { 
         failCount++;
         if (failCount > 3) {
            setStats(p => ({ ...p, status: 'offline', cpu: 0, ram: 0, disk: 0 }));
            setNetRates({ in: 0, out: 0 });
            setCpuHist((h) => [...h, { cpu: 0 }].slice(-SPARK_CAP));
            setRamHist((h) => [...h, { ram: 0 }].slice(-SPARK_CAP));
            setNetHist((h) => [...h, { netIn: 0, netOut: 0 }].slice(-SPARK_CAP));
         }
      }
    };
    
    pull();
    const iv = setInterval(pull, STATS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [serverId]);

  /* ── Uptime ── */
  useEffect(() => {
    const iv = setInterval(() => {
      if (stats.status === "online" || stats.status === "running") {
        if (stats.startedAt) {
           const start = new Date(stats.startedAt).getTime();
           if (start > 0) {
             setUptime(Math.max(0, Math.floor((Date.now() - start) / 1000)));
             return;
           }
        }
      }
      setUptime(0);
    }, 1000);
    return () => clearInterval(iv);
  }, [stats.startedAt, stats.status]);

  let uptimeStr = "—";
  if (stats.status === "online" || stats.status === "running") {
      const d = Math.floor(uptime / 86400);
      const h = Math.floor((uptime % 86400) / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = uptime % 60;
      if (d > 0) uptimeStr = `${d}d ${h}h ${m}m`;
      else if (h > 0) uptimeStr = `${h}h ${m}m ${s}s`;
      else uptimeStr = `${m}m ${s}s`;
  }

  /* ── Scroll handling ── */
  useEffect(() => {
    if (atBottom && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, atBottom]);

  const onScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist < 20;
    setAtBottom(prev => prev === near ? prev : near);
  }, []);

  /* ── Send command ── */
  const send = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const cmd = command.trim();
      if (!cmd) return;
      setCommand("");
      setLogs((p) => [...p, `> ${cmd}`]);
      try {
        await axios.post(`/api/servers/${serverId}/command`, { command: cmd });
      } catch (err: any) {
        setLogs((p) => [...p, `[System] Failed to send: ${err?.message}`]);
      }
    },
    [command, serverId]
  );

  const executeAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!server) return;
    try {
      setLogs((p) => [...p, `[System] Sending ${action} signal...`]);
      await axios.post(`/api/servers/${server.id}/${action}`);
      setLogs((p) => [...p, `[System] Server ${action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted'} successfully`]);
    } catch (error: any) {
      setLogs((p) => [...p, `[System Error] Failed to ${action} server. Reason: ${error.response?.data?.error || error.message}`]);
    }
  };

  /* ── Render ANSI ── */
  const renderLog = (line: string, i: number) => {
    const upperLine = line.toUpperCase();
    const isError = upperLine.includes("ERROR") || upperLine.includes("FATAL") || upperLine.includes("EXCEPTION") || upperLine.includes("SEVERE");
    const isWarn = upperLine.includes("WARN") || upperLine.includes("RESTARTING") || upperLine.includes("STOPPING") || upperLine.includes("PLUGIN") || upperLine.includes("LOADING");
    
    let textColor = 'text-zinc-100'; // Default white
    if (isError) textColor = 'text-red-400';
    else if (isWarn) textColor = 'text-yellow-400';

    return (
      <div key={i} className={`mb-px break-words animate-[login_.25s_ease_both] ${textColor}`}>
        {stripAnsi(line)}
      </div>
    );
  };

  const isOnline = stats.status === "online" || stats.status === "running";

  return (
    <div className="w-full max-w-[1720px] mx-auto px-[14px] sm:px-[24px] py-[18px] sm:py-[30px] pb-[34px] sm:pb-[44px]">
      
      {/* CSS overrides to match precisely */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes login { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: none; } }
        @keyframes pulseOrb { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
      `}} />

      {/* TOP BAR */}
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-[20px] sm:mb-[24px] gap-[12px] sm:gap-[14px] animate-[rise_.5s_ease_both]">
        <div className="flex items-center gap-[12px] min-w-0">
          <div className={`w-[11px] h-[11px] rounded-full shrink-0 ${isOnline ? 'bg-[#42e33d] shadow-[0_0_10px_rgba(66,227,61,.55)] animate-[pulseOrb_2s_ease-in-out_infinite]' : stats.status === 'offline' ? 'bg-[#524b4b]' : 'bg-[#e8bd15] animate-[pulseOrb_1s_ease-in-out_infinite]'}`} />
          <h1 className="text-[20px] sm:text-[24px] font-[800] text-white truncate">{server?.name || "Server"}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-[14px] w-full sm:w-auto justify-end">
          <button onClick={() => executeAction('start')} className="flex-1 sm:flex-initial min-w-[70px] sm:min-w-[104px] h-[40px] sm:h-[46px] border-none rounded-full flex items-center justify-center text-[16px] sm:text-[19px] text-white cursor-pointer bg-[#4CAF50] transition-all hover:brightness-[1.12] hover:-translate-y-px active:translate-y-0 touch-manipulation" title="Start">
            <Play className="w-5 h-5 fill-current" />
          </button>
          <button onClick={() => executeAction('restart')} className="flex-1 sm:flex-initial min-w-[70px] sm:min-w-[104px] h-[40px] sm:h-[46px] border-none rounded-full flex items-center justify-center text-[16px] sm:text-[19px] text-white cursor-pointer bg-[#e8bd15] transition-all hover:brightness-[1.12] hover:-translate-y-px active:translate-y-0 touch-manipulation" title="Restart">
            <RotateCw className="w-5 h-5" />
          </button>
          <button onClick={() => executeAction('stop')} className="flex-1 sm:flex-initial min-w-[70px] sm:min-w-[104px] h-[40px] sm:h-[46px] border-none rounded-full flex items-center justify-center text-[16px] sm:text-[19px] text-white cursor-pointer bg-[#fb4242] transition-all hover:brightness-[1.12] hover:-translate-y-px active:translate-y-0 touch-manipulation" title="Stop">
            <Square className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      {/* CONSOLE + STATS */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-[22px] mb-[22px]">
        {/* Console */}
        <div className="bg-[#131010] rounded-[10px] overflow-hidden flex flex-col h-[420px] sm:h-[520px] xl:h-[700px] animate-[rise_.5s_ease_.08s_both]">
          <div className="flex-1 overflow-y-auto p-[14px_18px] bg-[#0d0c0c] font-mono text-[12.5px] leading-[1.62] text-[#c9c9c9]" ref={bodyRef} onScroll={onScroll}>
             {logs.map((log, i) => renderLog(log, i))}
          </div>
          <form onSubmit={send} className="flex items-center gap-[11px] p-[13px_18px] bg-[#191717] border-t border-[#232020]">
            <ChevronRight className="text-[#8a8a8a] w-4 h-4 shrink-0" />
            <input 
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              type="text" 
              placeholder="Type a command..." 
              className="flex-1 bg-transparent border-0 outline-none text-[#e9eaee] font-mono text-[13px] placeholder:text-[#5c5c5c]" 
              autoComplete="off" 
            />
          </form>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-col gap-[14px] animate-[rise_.5s_ease_.16s_both]">
          <StatCard 
            icon={<Wifi style={{width: 62, height: 62}} />} 
            label="Address" 
            value={(() => {
              if (!server) return "—";
              const alias = server.ipAlias?.trim();
              if (alias) {
                return alias.includes(":") ? alias : `${alias}:${server.port || "25565"}`;
              }
              return server.port ? `${server.port}` : "25565";
            })()} 
          />
          <StatCard icon={<Clock style={{width: 62, height: 62}} />} label="Uptime" value={uptimeStr} />
          <StatCard icon={<Cpu style={{width: 62, height: 62}} />} label="CPU Load" value={isOnline ? `${stats.cpu.toFixed(2)}%` : '—'} dim={isOnline ? `/ ${stats.limitCpu}%` : ''} />
          <StatCard icon={<MemoryIcon style={{width: 62, height: 62}} />} label="Memory" value={isOnline ? formatSize(stats.ram) : '—'} dim={isOnline ? `/ ${formatSize(stats.limitRam)}` : ''} />
          <StatCard icon={<HardDrive style={{width: 62, height: 62}} />} label="Disk" value={isOnline ? formatSize(stats.disk) : '—'} dim={`/ ${formatSize(stats.limitDisk)}`} />
          <StatCard icon={<ArrowDown style={{width: 62, height: 62}} />} label="Network (Inbound)" value={isOnline ? `↓ ${formatRate(netRates.in)}` : '—'} />
          <StatCard icon={<ArrowUp style={{width: 62, height: 62}} />} label="Network (Outbound)" value={isOnline ? `↑ ${formatRate(netRates.out)}` : '—'} />
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[22px] animate-[rise_.5s_ease_.24s_both]">
         <ChartCard title="CPU Load (%)" data={cpuHist} dataKey="cpu" max={stats.limitCpu} />
         <ChartCard title="Memory (MB)" data={ramHist} dataKey="ram" max={stats.limitRam} />
         <ChartCard title="Network (KB/s)" data={netHist} dataKey="netIn" dataKey2="netOut" max={100} icons={<><ArrowDown className="w-3 h-3 text-[#22d3ee]"/><ArrowUp className="w-3 h-3 text-[#e8bd15]"/></>} />
      </div>

    </div>
  );
}
