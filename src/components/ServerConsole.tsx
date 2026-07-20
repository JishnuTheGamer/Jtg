import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm, Hash, Box } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import PlayerManager from "./PlayerManager";

export default function ServerConsole({ serverId, server }: { serverId: string, server?: any }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [players, setPlayers] = useState<{name: string}[]>([]);
  const [stats, setStats] = useState({ cpu: 0, ram: 0, disk: 0, limitRam: 1024, limitCpu: 100, limitDisk: 10 });
  const consoleBodyRef = useRef<HTMLDivElement>(null);
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
      const parsedLines = data.split(/\r?\n/).filter(line => line.trim() !== "");
      setPlayers(prev => {
        let newPlayers = [...prev];
        let changed = false;
        parsedLines.forEach(line => {
          const cleanLine = line.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
          
          const joinMatch = cleanLine.match(/:\s+([a-zA-Z0-9_]{3,16})\s+joined the game/);
          if (joinMatch) {
             const name = joinMatch[1];
             if (!newPlayers.find(p => p.name === name)) {
               newPlayers.push({name});
               changed = true;
             }
          }
          
          const leaveMatch = cleanLine.match(/:\s+([a-zA-Z0-9_]{3,16})\s+left the game/);
          if (leaveMatch) {
             const name = leaveMatch[1];
             const filtered = newPlayers.filter(p => p.name !== name);
             if (filtered.length !== newPlayers.length) {
                newPlayers = filtered;
                changed = true;
             }
          }

          const listMatch = cleanLine.match(/players online:\s*(.*)/i);
          if (listMatch) {
             const listStr = listMatch[1].trim();
             if (listStr) {
               const names = listStr.split(',').map(n => n.trim()).filter(Boolean);
               newPlayers = names.map(name => ({name}));
               changed = true;
             } else {
               newPlayers = [];
               changed = true;
             }
          }
        });
        return changed ? newPlayers : prev;
      });

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
    const t = setTimeout(() => {
       axios.post(`/api/servers/${serverId}/command`, { command: "list" }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [serverId]);

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
    if (consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
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

  const formatLogLine = (rawLog: string) => {
    // Strip ANSI escape codes
    const log = rawLog.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

    // Basic formatting for Minecraft/standard logs: e.g., "[14:23:45 INFO]: Starting minecraft server version 1.21"
    const timestampMatch = log.match(/^(\[\d{2}:\d{2}:\d{2}\s[^\]]+\]|\d{2}:\d{2}:\d{2})/);
    let levelClass = "text-indigo-200/70";
    if (log.includes("INFO")) levelClass = "text-sky-300";
    if (log.includes("WARN")) levelClass = "text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.3)]";
    if (log.includes("ERROR") || log.includes("Exception") || log.includes("FATAL")) levelClass = "text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.5)] font-medium";
    if (log.startsWith(">")) levelClass = "text-emerald-400 font-bold drop-shadow-[0_0_5px_rgba(52,211,153,0.4)]";
    
    if (timestampMatch) {
      const prefix = timestampMatch[0];
      const rest = log.substring(prefix.length);
      return (
        <span className={`break-words whitespace-pre-wrap flex-1 ${levelClass}`}>
          <span className="text-indigo-500/50 mr-2">{prefix}</span>
          {rest}
        </span>
      );
    }
    
    return <span className={`break-words whitespace-pre-wrap flex-1 ${levelClass}`}>{log}</span>;
  };

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar text-white touch-auto overscroll-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex flex-col xl:flex-row w-full max-w-7xl mx-auto min-h-full gap-4 md:gap-6 p-4 md:p-6 pb-24 md:pb-12">
        
        {/* Left Side: Stats and Players */}
        <div className="flex flex-col gap-4 md:gap-6 xl:w-[320px] shrink-0 order-2 xl:order-1">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-px bg-white/10 shrink-0 border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-xl relative">
            <div className="bg-black/60 p-4 flex flex-col justify-center relative overflow-hidden group hover:bg-black/40 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex flex-col mb-2 relative z-10">
                <p className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 drop-shadow-[0_0_2px_rgba(129,140,248,0.3)]">CPU Usage</p>
                <p className="text-sm md:text-base text-white font-mono font-bold drop-shadow-md">{stats.cpu.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5 shadow-inner relative z-10 mt-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min((stats.cpu / stats.limitCpu) * 100, 100)}%` }}></div>
              </div>
            </div>
            
            <div className="bg-black/60 p-4 flex flex-col justify-center relative overflow-hidden group hover:bg-black/40 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex flex-col mb-2 relative z-10">
                <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 drop-shadow-[0_0_2px_rgba(52,211,153,0.3)]">Memory</p>
                <p className="text-sm md:text-base text-white font-mono font-bold drop-shadow-md">{Math.floor(stats.ram)} MB</p>
              </div>
              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5 shadow-inner relative z-10 mt-auto">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min((stats.ram / stats.limitRam) * 100, 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-black/60 p-4 flex flex-col justify-center relative overflow-hidden group hover:bg-black/40 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex flex-col mb-2 relative z-10">
                <p className="text-orange-400/80 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 drop-shadow-[0_0_2px_rgba(251,146,60,0.3)]">Storage</p>
                <p className="text-sm md:text-base text-white font-mono font-bold drop-shadow-md">{stats.disk.toFixed(1)} GB</p>
              </div>
              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5 shadow-inner relative z-10 mt-auto">
                <div className="bg-gradient-to-r from-orange-600 to-orange-400 h-full transition-all duration-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${Math.min((stats.disk / stats.limitDisk) * 100, 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-black/60 p-4 flex flex-col justify-center relative overflow-hidden group hover:bg-black/40 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex flex-col h-full relative z-10 justify-center">
                <p className="text-purple-400/80 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 drop-shadow-[0_0_2px_rgba(192,132,252,0.3)]">Engine Ver.</p>
                <p className="text-sm md:text-base text-white font-mono font-bold drop-shadow-md">{server?.version || "Unknown"}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 xl:min-h-0 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/5 flex flex-col relative">
            <PlayerManager serverId={serverId} players={players} />
          </div>
        </div>

        {/* Right Side: Console */}
        <div className="flex flex-col flex-1 h-[60vh] xl:h-[calc(100vh-140px)] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] relative ring-1 ring-white/5 order-1 xl:order-2">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent shadow-[0_0_20px_rgba(99,102,241,1)]"></div>
          
          <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between relative z-10 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            </div>
            <div className="text-[10px] text-indigo-300 flex items-center uppercase tracking-[0.2em] font-sans font-bold text-shadow-sm">
              <XTerm size={12} className="mr-2 opacity-70" /> System_Console
            </div>
            <div className="w-12"></div>
          </div>

          <div ref={consoleBodyRef} className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs md:text-[13px] custom-scrollbar leading-relaxed relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
            {logs.length === 0 && (
              <div className="text-zinc-500 flex items-center animate-pulse">
                <span className="text-indigo-400 mr-2">➜</span> Awaiting connection...
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex py-1 hover:bg-indigo-500/[0.05] px-2 -mx-2 rounded transition-colors group">
                 <span className="text-indigo-500/30 mr-3 md:mr-4 select-none shrink-0 w-8 md:w-10 text-right pr-3 border-r border-indigo-500/20 group-hover:text-indigo-400/70 group-hover:border-indigo-500/50 transition-all">
                   {String(i + 1).padStart(4, '0')}
                 </span> 
                 {formatLogLine(log)}
              </div>
            ))}
          </div>
          
          <form onSubmit={sendCommand} className="p-2 md:p-3 bg-black/60 flex space-x-2 shrink-0 border-t border-white/10 relative z-10 backdrop-blur-md">
            <div className="flex-1 flex items-center bg-black/40 rounded-xl px-4 border border-white/10 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all">
              <span className="text-indigo-500 font-mono mr-3 select-none text-sm font-bold">root@sys:~#</span>
              <input 
                type="text" 
                value={command} 
                onChange={e => setCommand(e.target.value)}
                className="flex-1 bg-transparent py-3 md:py-3.5 text-indigo-100 focus:outline-none font-mono text-sm placeholder:text-indigo-900/50"
                placeholder="Enter command..."
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button type="submit" disabled={!command.trim()} className="px-5 py-3 md:px-6 md:py-3.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] font-bold tracking-wider rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase">
              Execute
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
