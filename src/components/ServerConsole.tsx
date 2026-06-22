import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm, Hash, Box } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function ServerConsole({ serverId, server }: { serverId: string, server?: any }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, limitRam: 1024, limitCpu: 100, limitDisk: 10 });
  const endRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    const socket: Socket = io({
      auth: { token }
    });

    socket.on("connect", () => {
      socket.emit("joinServer", serverId);
      setLogs(prev => [...prev, "[System] Connected to console stream."]);
    });

    socket.on("log", (data: string) => {
      const lines = data.split(/\r?\n/).filter(line => line.trim() !== "");
      setLogs(prev => {
        const newLogs = [...prev, ...lines];
        return newLogs.slice(-200);
      });
    });

    socket.on("disconnect", () => {
      setLogs(prev => [...prev, "[System] Disconnected from server."]);
    });

    return () => {
      socket.emit("leaveServer", serverId);
      socket.disconnect();
    };
  }, [serverId, token]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`/api/servers/${serverId}/stats`);
        setStats(res.data);
      } catch (err) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [serverId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const sendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    const cmd = command;
    setCommand("");
    try {
      await axios.post(`/api/servers/${serverId}/command`, { command: cmd });
    } catch(e) {
      setLogs(prev => [...prev, "[System Error] Failed to send command"]);
    }
  };

  const formatLogLine = (log: string) => {
    // Basic formatting for Minecraft/standard logs: e.g., "[14:23:45 INFO]: Starting minecraft server version 1.21"
    const timestampMatch = log.match(/^(\[\d{2}:\d{2}:\d{2}\s[^\]]+\]|\d{2}:\d{2}:\d{2})/);
    let levelClass = "text-gray-300";
    if (log.includes("INFO")) levelClass = "text-blue-300";
    if (log.includes("WARN")) levelClass = "text-orange-300";
    if (log.includes("ERROR") || log.includes("Exception") || log.includes("FATAL")) levelClass = "text-red-400";
    if (log.startsWith(">")) levelClass = "text-emerald-400 font-semibold";
    
    if (timestampMatch) {
      const prefix = timestampMatch[0];
      const rest = log.substring(prefix.length);
      return (
        <span className={`break-words whitespace-pre-wrap flex-1 ${levelClass}`}>
          <span className="text-gray-500 mr-2">{prefix}</span>
          {rest}
        </span>
      );
    }
    
    return <span className={`break-words whitespace-pre-wrap flex-1 ${levelClass}`}>{log}</span>;
  };

  return (
    <div className="flex flex-col flex-1 bg-[#0a0a0c] h-full min-h-[400px] md:h-auto md:min-h-full overflow-y-auto custom-scrollbar md:p-6 md:pb-12 text-white">
      <div className="flex flex-col w-full max-w-4xl mx-auto h-full md:h-auto gap-0 md:gap-6">
        <div className="flex flex-col flex-1 md:flex-none md:w-full md:aspect-square bg-[#050505] border-b md:border md:rounded-xl border-white/5 overflow-hidden min-h-0 shadow-xl relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs md:text-sm custom-scrollbar leading-relaxed">
            <div className="mb-4 text-[10px] text-zinc-500 flex items-center uppercase tracking-widest font-sans font-semibold">
              <XTerm size={12} className="mr-2" /> Server Terminal Session
            </div>
            {logs.map((log, i) => (
              <div key={i} className="flex py-1 hover:bg-white/[0.02] px-2 -mx-2 rounded transition-colors group">
                 <span className="text-zinc-600 mr-3 md:mr-4 select-none shrink-0 w-8 md:w-10 text-right pr-3 border-r border-white/5 opacity-50 group-hover:opacity-100 transition-opacity">
                   {String(i + 1).padStart(4, '0')}
                 </span> 
                 {formatLogLine(log)}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={sendCommand} className="p-2 md:p-3 bg-[#0a0a0c] flex space-x-2 shrink-0 border-t border-white/5">
            <div className="flex-1 flex items-center bg-[#050505] rounded-none px-4 border border-white/10 focus-within:border-indigo-500/50 transition-colors shadow-inner">
              <span className="text-emerald-500 font-mono mr-3 select-none text-sm">root@server:~#</span>
              <input 
                type="text" 
                value={command} 
                onChange={e => setCommand(e.target.value)}
                className="flex-1 bg-transparent py-3 md:py-3.5 text-gray-200 focus:outline-none font-mono text-sm"
                placeholder="Execute command..."
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button type="submit" disabled={!command.trim()} className="px-5 py-3 md:px-6 md:py-3.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 font-medium rounded-none transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Execute
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 shrink-0 border-y md:border border-white/5 md:w-full md:rounded-xl overflow-hidden mt-auto md:mt-0 shadow-xl">
        <div className="bg-[#0a0a0c] p-4 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 md:mb-3">
            <p className="text-zinc-500 text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-1 md:mb-0">CPU Usage</p>
            <p className="text-sm md:text-base text-zinc-300 font-mono">{stats.cpu.toFixed(1)}%</p>
          </div>
          <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min((stats.cpu / stats.limitCpu) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-[#0a0a0c] p-4 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 md:mb-3">
            <p className="text-zinc-500 text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-1 md:mb-0">Memory</p>
            <p className="text-sm md:text-base text-zinc-300 font-mono">{Math.floor(stats.ram)} MB</p>
          </div>
          <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min((stats.ram / stats.limitRam) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-[#0a0a0c] p-4 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 md:mb-3">
            <p className="text-zinc-500 text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-1 md:mb-0">Storage</p>
            <p className="text-sm md:text-base text-zinc-300 font-mono">{stats.disk.toFixed(1)} GB</p>
          </div>
          <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min((stats.disk / stats.limitDisk) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-[#0a0a0c] p-4 flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center h-full">
            <p className="text-zinc-500 text-[11px] md:text-xs font-semibold uppercase tracking-widest mb-1 md:mb-0">Engine Ver.</p>
            <p className="text-sm md:text-base text-zinc-300 font-mono">{server?.version || "Unknown"}</p>
          </div>
        </div>
      </div>
     </div>
    </div>
  );
}
