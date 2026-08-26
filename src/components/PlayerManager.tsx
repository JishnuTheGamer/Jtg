import React, { useState, useEffect, useRef } from "react";
import { Users, Shield, Gavel, UserMinus, ShieldAlert, Check, RefreshCw } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

function stripAnsi(str: string) {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

export default function PlayerManager({ serverId }: { serverId: string }) {
  const [players, setPlayers] = useState<{name: string}[]>([]);
  const [loadingAction, setLoadingAction] = useState<{player: string, action: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuth();
  const sockRef = useRef<Socket | null>(null);

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
      
      setPlayers((prev) => {
        let u = [...prev];
        let ch = false;
        for (const raw of lines) {
          const c = stripAnsi(raw);
          const jm = c.match(/:\s+([a-zA-Z0-9_]{3,16})\s+joined the game/);
          if (jm) {
            const name = jm[1];
            if (!u.find((x) => x.name === name)) {
              u.push({ name });
              ch = true;
            }
          }
          const lm = c.match(/:\s+([a-zA-Z0-9_]{3,16})\s+left the game/);
          if (lm) {
            const name = lm[1];
            const old = u.length;
            u = u.filter((x) => x.name !== name);
            if (u.length !== old) ch = true;
          }
          
          // Fallback parsing for list command output
          const listMatch = c.match(/There are \d+ of a max of \d+ players online:(.*)/);
          if (listMatch) {
             const names = listMatch[1].split(',').map(n => n.trim()).filter(n => n);
             for(const name of names) {
                if (!u.find((x) => x.name === name)) {
                   u.push({ name });
                   ch = true;
                }
             }
          }
        }
        return ch ? u : prev;
      });
    });

    return () => {
      socket.emit("leaveServer", serverId);
      socket.removeAllListeners();
      socket.disconnect();
      sockRef.current = null;
    };
  }, [serverId, token]);

  const handleAction = async (player: string, action: string, command: string) => {
    try {
      setLoadingAction({ player, action });
      await axios.post(`/api/servers/${serverId}/command`, { command });
    } catch(e) {
      console.error(e);
    } finally {
      setTimeout(() => setLoadingAction(null), 1000);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await axios.post(`/api/servers/${serverId}/command`, { command: "list" });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-[14px] sm:px-[24px] py-[18px] sm:py-[30px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-[800] text-white">Player Manager</h2>
        <button 
          onClick={handleRefresh} 
          className="flex items-center gap-2 px-4 py-2 bg-[#131010] hover:bg-[#1c1818] rounded-[10px] text-white transition-colors"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="bg-[#131010] rounded-[10px] overflow-hidden">
        {players.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center h-[400px] opacity-50">
            <Users className="w-12 h-12 mb-4 text-[#5c5c5c]" />
            <span className="text-[14px] text-[#5c5c5c] tracking-widest uppercase">No players online</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {players.map((player) => (
              <div key={player.name} className="bg-[#1c1818] rounded-[10px] p-4 flex flex-col gap-4 border border-[#2f2a2a]/50">
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://minotar.net/avatar/${player.name}/48.png`} 
                    alt={player.name}
                    className="w-12 h-12 rounded-[8px] bg-black shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABW71eEAAAARElEQVR42mP8/58BDBjhGqgEho+B4aNg+BgYPgYqMECnEQ9s2IDiH2w4j6QY9EEDX8n20AdVDPqggS/4+tEHDXzB1w8AYU7y34W8vU0AAAAASUVORK5CYII='; }}
                  />
                  <span className="font-bold text-white text-[16px] truncate">{player.name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAction(player.name, 'op', `op ${player.name}`)}
                    className="flex justify-center items-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[12px] font-bold uppercase transition-colors"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === 'op' ? <Check size={14} /> : <Shield size={14} />}
                    OP
                  </button>
                  <button 
                    onClick={() => handleAction(player.name, 'kick', `kick ${player.name} Kicked by admin.`)}
                    className="flex justify-center items-center gap-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[12px] font-bold uppercase transition-colors"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === 'kick' ? <Check size={14} /> : <UserMinus size={14} />}
                    Kick
                  </button>
                  <button 
                    onClick={() => handleAction(player.name, 'ban', `ban ${player.name} Banned by admin.`)}
                    className="flex justify-center items-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[12px] font-bold uppercase transition-colors"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === 'ban' ? <Check size={14} /> : <Gavel size={14} />}
                    Ban
                  </button>
                  <button 
                    onClick={() => handleAction(player.name, 'ban-ip', `ban-ip ${player.name}`)}
                    className="flex justify-center items-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-[12px] font-bold uppercase transition-colors"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === 'ban-ip' ? <Check size={14} /> : <ShieldAlert size={14} />}
                    IP Ban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
