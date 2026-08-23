import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { formatBytesToDisplay } from "../types/stats";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

interface ServerStats {
  cpu: number;
  ram: number;
  disk: number;
  limitRam: number;
  limitCpu: number;
  limitDisk: number;
  networkIn?: number;
  networkOut?: number;
  memory?: {
    usedBytes: number;
    limitBytes: number;
    cacheBytes?: number;
    overLimit: boolean;
    includesHostMemory: false;
  };
  diskStats?: {
    usedBytes: number;
    limitBytes: number;
  };
  network?: {
    rxBytes: number;
    txBytes: number;
  };
}

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const stripAnsi = (s: string) => s.replace(ANSI_RE, "");

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

export default function ServerConsole({ serverId, server }: { serverId: string, server: any }) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<ServerStats>({ cpu: 0, ram: 0, disk: 0, limitRam: 2048, limitCpu: 100, limitDisk: 10, networkIn: 0, networkOut: 0 });
  const [uptime, setUptime] = useState(0);

  // Chart Histories
  const [historyLabels, setHistoryLabels] = useState<string[]>(Array(15).fill(''));
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(15).fill(0));
  const [memHistory, setMemHistory] = useState<number[]>(Array(15).fill(0));
  const [netHistory, setNetHistory] = useState<number[]>(Array(15).fill(0));

  const isOnline = server?.status === 'online';

  // 1. Initial Logs fetch via REST API
  useEffect(() => {
    if (!token || !serverId) return;
    axios.get(`/api/servers/${serverId}/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      if (res.data && typeof res.data.logs === "string" && res.data.logs.trim().length > 0) {
        const lines = res.data.logs.split("\n").filter((l: string) => l.trim().length > 0);
        setLogs((prev) => {
          if (prev.length === 0) return lines;
          return prev;
        });
      }
    }).catch(() => {});
  }, [serverId, token]);

  // 2. Real-time Socket.IO Connection
  useEffect(() => {
    if (!token || !serverId) return;

    const socket: Socket = io({
      auth: { token },
      reconnectionAttempts: 10,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinServer", serverId);
    });

    socket.on("reconnect", () => {
      socket.emit("joinServer", serverId);
    });

    socket.on("log", (data: string) => {
      if (typeof data !== "string") return;
      setLogs((prev) => {
        const lines = data.split("\n").filter((l) => l.trim().length > 0);
        const newLogs = [...prev, ...lines];
        if (newLogs.length > 1000) return newLogs.slice(newLogs.length - 1000);
        return newLogs;
      });
    });

    return () => {
      socket.emit("leaveServer", serverId);
      socket.disconnect();
    };
  }, [serverId, token]);

  // Auto-scroll on logs change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  // Fetch Stats
  useEffect(() => {
    if (!isOnline) {
      setUptime(0);
      return;
    }
    const fetchStats = async () => {
      try {
        const res = await axios.get(`/api/servers/${serverId}/stats`);
        const newStats = res.data;
        setStats(newStats);
        if (newStats.uptimeSeconds) {
            setUptime(newStats.uptimeSeconds);
        }

        // Update charts
        const memUsed = newStats.memory?.usedBytes || (newStats.ram ? newStats.ram * 1024 * 1024 : 0);
        const netRx = newStats.network?.rxBytes ?? (newStats.networkIn || 0);
        const netTx = newStats.network?.txBytes ?? (newStats.networkOut || 0);

        setHistoryLabels(prev => {
           const now = new Date();
           return [...prev.slice(1), `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`];
        });
        setCpuHistory(prev => [...prev.slice(1), newStats.cpu || 0]);
        setMemHistory(prev => [...prev.slice(1), memUsed / (1024 * 1024)]);
        setNetHistory(prev => [...prev.slice(1), (netRx + netTx) / (1024 * 1024)]);

      } catch (err) {}
    };
    fetchStats();
    const int = setInterval(fetchStats, 2000);
    return () => clearInterval(int);
  }, [serverId, isOnline]);

  const sendCommandNow = async (commandToSend: string) => {
    const cmd = commandToSend.trim();
    if (!cmd || isSending) return;

    setInput("");
    setCommandHistory((prev) => [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50));
    setHistoryIndex(-1);
    setLogs((prev) => [...prev, `> ${cmd}`]);
    setIsSending(true);

    try {
      await axios.post(`/api/servers/${serverId}/command`, { command: cmd }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err: any) {
      console.error("Failed to send command", err);
      const errMsg = err?.response?.data?.error || err.message || "Failed to execute command";
      setLogs((prev) => [...prev, `[System Error] ${errMsg}`]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendCommandNow(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const uptimeHuman = isOnline ? formatHumanDuration(uptime) : "Offline";

  const renderLogLine = (raw: string, index: number) => {
    const clean = stripAnsi(raw);
    
    // Parse Minecraft format: [HH:mm:ss] [Thread/INFO]: message
    const mcMatch = clean.match(/^(\[[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\s+[A-Z]+)?\](?:\s+\[[^\]]+\])?:?)(.*)$/);
    if (mcMatch) {
      const header = mcMatch[1];
      const body = mcMatch[2];
      const isError = /ERROR|Exception|FATAL|Severe/i.test(header) || /ERROR|Exception|FATAL|Severe/i.test(body);
      const isWarn = /WARN|Warning/i.test(header) || /WARN|Warning/i.test(body);
      const isPlayer = /joined|left|issued server command/i.test(body);
      
      let bodyClass = "tx";
      if (isError) bodyClass = "er";
      else if (isWarn) bodyClass = "am";
      else if (isPlayer) bodyClass = "am";

      return (
        <div key={index} className="log-line">
          <span className="tm">{header} </span>
          <span className={bodyClass}>{body}</span>
        </div>
      );
    }

    const isError = /ERROR|Exception|FATAL|Severe/i.test(clean);
    const isWarn = /WARN|Warning/i.test(clean);
    const isInfo = /INFO/i.test(clean);
    const isPlayer = /joined|left/i.test(clean);
    
    let colorClass = "tx";
    if (isError) colorClass = "er";
    else if (isWarn) colorClass = "am";
    else if (isPlayer) colorClass = "am";
    else if (isInfo) colorClass = "tm";

    return (
      <div key={index} className="log-line">
        <span className={colorClass}>{clean}</span>
      </div>
    );
  };

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#666', font: { size: 10 } }
      },
      x: {
        grid: { display: false },
        ticks: { display: false }
      }
    }
  };

  const createChartData = (data: number[], colorStr: string) => {
    return {
        labels: historyLabels,
        datasets: [{
          data,
          borderColor: colorStr,
          backgroundColor: (context: any) => {
             const ctx = context.chart.ctx;
             const gradient = ctx.createLinearGradient(0, 0, 0, 190);
             gradient.addColorStop(0, 'rgba(34,211,238,0.30)');
             gradient.addColorStop(1, 'rgba(34,211,238,0.03)');
             return gradient;
          },
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
    };
  };

  return (
    <>
      <div className="grid">
        <div className="console" onClick={() => inputRef.current?.focus()}>
          <div className="console-out" ref={bodyRef}>
            {logs.length === 0 ? (
              <div className="log-line">
                <span className="it">
                  {server?.status === 'online'
                    ? "[System] Console connected. Waiting for server output..."
                    : server?.status === 'starting'
                    ? "[System] Server is starting up. Logs will appear here shortly..."
                    : "[System] Server is currently offline. Press the Start button above to boot the server."}
                </span>
              </div>
            ) : (
              logs.map((log, i) => renderLogLine(log, i))
            )}
          </div>
          <div className="console-in" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => sendCommandNow(input)}
              title="Send command"
              className="bg-transparent border-0 p-0 text-[#8a8a8a] hover:text-white transition-colors cursor-pointer flex items-center"
            >
              <i className="bi bi-chevron-double-right"></i>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSending ? "Executing command..." : "Type a command (Press Enter)..."}
              autoComplete="off"
              disabled={isSending}
            />
          </div>
        </div>

        <div className="stats">
          <div className="card">
            <i className="bi bi-wifi bgico"></i>
            <div className="lbl">Address</div>
            <div className="val">{server?.ipAlias ? `${server.ipAlias}:${server.port}` : `:${server?.port}`}</div>
          </div>

          <div className="card">
            <i className="bi bi-clock-fill bgico"></i>
            <div className="lbl">Uptime</div>
            <div className="val">{uptimeHuman}</div>
          </div>

          <div className="card">
            <i className="bi bi-cpu-fill bgico"></i>
            <div className="lbl">CPU Load</div>
            <div className="val">{stats.cpu.toFixed(1)}% <span className="dim">/ 100%</span></div>
          </div>

          <div className="card">
            <i className="bi bi-memory bgico"></i>
            <div className="lbl">Memory</div>
            <div className="val">
               {formatBytesToDisplay(stats.memory?.usedBytes || (stats.ram ? stats.ram * 1024 * 1024 : 0))} <span className="dim">/ {stats.limitRam >= 1024 ? `${(stats.limitRam / 1024).toFixed(stats.limitRam % 1024 === 0 ? 0 : 1)} GB` : `${stats.limitRam || 2048} MB`}</span>
            </div>
          </div>

          <div className="card">
            <i className="bi bi-hdd-fill bgico"></i>
            <div className="lbl">Disk</div>
            <div className="val">
               {formatBytesToDisplay(stats.diskStats?.usedBytes ?? (typeof stats.disk === "number" ? stats.disk * 1024 * 1024 * 1024 : 0))} <span className="dim">/ {stats.limitDisk || 10} GB</span>
            </div>
          </div>

          <div className="card">
            <i className="bi bi-cloud-arrow-down-fill bgico"></i>
            <div className="lbl">Network (Inbound)</div>
            <div className="val">
               {formatBytesToDisplay(stats.network?.rxBytes ?? (stats.networkIn || 0))}
            </div>
          </div>

          <div className="card">
            <i className="bi bi-cloud-arrow-up-fill bgico"></i>
            <div className="lbl">Network (Outbound)</div>
            <div className="val">
               {formatBytesToDisplay(stats.network?.txBytes ?? (stats.networkOut || 0))}
            </div>
          </div>

        </div>
      </div>

      <div className="charts">
        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-title">CPU Load</div>
          </div>
          <div className="chart-box">
            <Line data={createChartData(cpuHistory, '#22d3ee')} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-title">Memory Usage</div>
          </div>
          <div className="chart-box">
            <Line data={createChartData(memHistory, '#22d3ee')} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-title">Network I/O</div>
            <div className="chart-icons">
              <i className="bi bi-arrow-down dn"></i>
              <i className="bi bi-arrow-up up"></i>
            </div>
          </div>
          <div className="chart-box">
            <Line data={createChartData(netHistory, '#22d3ee')} options={chartOptions} />
          </div>
        </div>
      </div>
    </>
  );
}
