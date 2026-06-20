import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function ServerConsole({ serverId }: { serverId: string }) {
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

  return (
    <div className="flex flex-col flex-1 bg-gray-950 pb-4">
      <div className="flex flex-col bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-lg h-[50vh] min-h-[300px] max-h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scrollbar whitespace-pre-wrap break-words text-gray-300">
          <div className="mb-4 text-xs opacity-50 flex items-center"><XTerm size={14} className="mr-2" /> Initializing terminal stream...</div>
          {logs.map((log, i) => (
            <div key={i} className={`${log.startsWith('>') ? 'opacity-80 font-semibold text-blue-400' : ''}`}>{log}</div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={sendCommand} className="border-t border-gray-800 p-2 md:p-4 bg-gray-950 flex space-x-2 md:space-x-4 shrink-0">
          <input 
            type="text" 
            value={command} 
            onChange={e => setCommand(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
            placeholder="Type a command..."
          />
          <button type="submit" className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-500 font-medium text-white rounded-lg transition-colors text-sm">
            Send
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 shrink-0">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">CPU Usage</p>
            <p className="text-xs text-gray-500">{stats.cpu.toFixed(1)}% / {stats.limitCpu}%</p>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-500 rounded-full" style={{ width: `${Math.min((stats.cpu / stats.limitCpu) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">RAM Usage</p>
            <p className="text-xs text-gray-500">{Math.floor(stats.ram)} MB / {stats.limitRam} MB</p>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full transition-all duration-500 rounded-full" style={{ width: `${Math.min((stats.ram / stats.limitRam) * 100, 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Disk Usage</p>
            <p className="text-xs text-gray-500">{stats.disk.toFixed(1)} GB / {stats.limitDisk} GB</p>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500 rounded-full" style={{ width: `${Math.min((stats.disk / stats.limitDisk) * 100, 100)}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
