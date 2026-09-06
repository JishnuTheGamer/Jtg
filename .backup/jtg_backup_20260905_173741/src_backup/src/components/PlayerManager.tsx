import React, { useEffect, useState } from "react";
import { Users, Shield, Gavel, UserMinus, ShieldAlert, Check, RefreshCw, Plus, UserCheck } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

interface Player {
  name: string;
  joinedAt?: string;
  isOp?: boolean;
}

export default function PlayerManager({ serverId, players: propPlayers }: { serverId: string; players?: Player[] }) {
  const [players, setPlayers] = useState<Player[]>(propPlayers || []);
  const [loadingAction, setLoadingAction] = useState<{ player: string; action: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customPlayerInput, setCustomPlayerInput] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const { token } = useAuth();

  // Socket listener for dynamic player joins/leaves
  useEffect(() => {
    if (!token || !serverId) return;

    const socket: Socket = io({
      auth: { token },
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      socket.emit("joinServer", serverId);
      // Request player list
      axios.post(`/api/servers/${serverId}/command`, { command: "list" }).catch(() => {});
    });

    socket.on("log", (data: string) => {
      if (typeof data !== "string") return;
      const clean = data.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");

      // Check player join
      const joinMatch = clean.match(/:\s+([a-zA-Z0-9_]{3,16})\s+joined the game/i);
      if (joinMatch) {
        setPlayers((prev) => {
          if (!prev.some((p) => p.name === joinMatch[1])) {
            return [...prev, { name: joinMatch[1], joinedAt: new Date().toLocaleTimeString() }];
          }
          return prev;
        });
      }

      // Check player leave
      const leaveMatch = clean.match(/:\s+([a-zA-Z0-9_]{3,16})\s+left the game/i);
      if (leaveMatch) {
        setPlayers((prev) => prev.filter((p) => p.name !== leaveMatch[1]));
      }

      // Check 'list' command response
      const listMatch = clean.match(/players online:\s*(.*)/i);
      if (listMatch) {
        const names = listMatch[1].trim();
        if (names) {
          const parsed = names
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean)
            .map((name) => ({ name }));
          setPlayers(parsed);
        } else {
          setPlayers([]);
        }
      }
    });

    return () => {
      socket.emit("leaveServer", serverId);
      socket.disconnect();
    };
  }, [serverId, token]);

  const handleAction = async (player: string, action: string, command: string) => {
    try {
      setLoadingAction({ player, action });
      await axios.post(`/api/servers/${serverId}/command`, { command });
      setActionSuccess(`Executed ${action} on ${player}`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (e) {
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

  const handleCustomAction = async (actionType: string) => {
    const p = customPlayerInput.trim();
    if (!p) return;
    let cmd = "";
    if (actionType === "op") cmd = `op ${p}`;
    else if (actionType === "deop") cmd = `deop ${p}`;
    else if (actionType === "kick") cmd = `kick ${p} Kicked by admin.`;
    else if (actionType === "ban") cmd = `ban ${p} Banned by admin.`;
    else if (actionType === "whitelist") cmd = `whitelist add ${p}`;

    if (cmd) {
      await handleAction(p, actionType, cmd);
      setCustomPlayerInput("");
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-5xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* HEADER CARD */}
      <div className="qx-glass rounded-2xl border border-white/10 p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-theme-500/10 border border-theme-500/30 flex items-center justify-center text-theme-400">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide font-mono">
              Player Management
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Monitor connected players and execute administrative actions like OP, Kick, Ban, and Whitelist.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-theme-500/10 text-theme-300 border border-theme-500/30">
            {players.length} Online
          </span>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all"
            title="Refresh Player List"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-theme-400" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* QUICK PLAYER ACTION DOCK */}
      <div className="qx-glass rounded-2xl border border-white/10 p-4 shadow-xl">
        <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Direct Player Command
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customPlayerInput}
            onChange={(e) => setCustomPlayerInput(e.target.value)}
            placeholder="Enter player username..."
            className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-theme-500/50"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleCustomAction("op")}
              disabled={!customPlayerInput.trim()}
              className="px-3 py-2 rounded-xl bg-theme-500/10 border border-theme-500/30 text-theme-300 text-xs font-mono font-semibold hover:bg-theme-500/20 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              <Shield size={12} /> OP
            </button>
            <button
              onClick={() => handleCustomAction("deop")}
              disabled={!customPlayerInput.trim()}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-mono font-semibold hover:bg-white/10 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              De-OP
            </button>
            <button
              onClick={() => handleCustomAction("kick")}
              disabled={!customPlayerInput.trim()}
              className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold hover:bg-amber-500/20 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              <UserMinus size={12} /> Kick
            </button>
            <button
              onClick={() => handleCustomAction("ban")}
              disabled={!customPlayerInput.trim()}
              className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold hover:bg-rose-500/20 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              <Gavel size={12} /> Ban
            </button>
            <button
              onClick={() => handleCustomAction("whitelist")}
              disabled={!customPlayerInput.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold hover:bg-emerald-500/20 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              <UserCheck size={12} /> Whitelist
            </button>
          </div>
        </div>
      </div>

      {/* CONNECTED PLAYERS LIST */}
      <div className="qx-glass rounded-2xl border border-white/10 p-5 shadow-xl">
        <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Online Players
        </h3>

        {players.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20">
            <Users className="w-10 h-10 mb-3 text-slate-600" />
            <p className="font-mono text-sm font-semibold text-slate-400">No players currently connected</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              Players currently in the game will appear here with instant moderation controls.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((player) => (
              <div
                key={player.name}
                className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-theme-500/30 transition-all flex flex-col gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://minotar.net/avatar/${player.name}/40.png`}
                    alt={player.name}
                    className="w-10 h-10 rounded-lg bg-card shrink-0 border border-white/10 shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABW71eEAAAARElEQVR42mP8/58BDBjhGqgEho+B4aNg+BgYPgYqMECnEQ9s2IDiH2w4j6QY9EEDX8n20AdVDPqggS/4+tEHDXzB1w8AYU7y34W8vU0AAAAASUVORK5CYII=";
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-mono text-sm font-bold text-white truncate">{player.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500">
                      {player.joinedAt ? `Connected at ${player.joinedAt}` : "Active Session"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleAction(player.name, "op", `op ${player.name}`)}
                    className="px-2 py-1.5 rounded-lg bg-theme-500/10 hover:bg-theme-500/20 text-theme-300 border border-theme-500/20 text-[10px] font-mono font-bold uppercase tracking-wider flex justify-center items-center gap-1 transition-colors"
                    title="Make OP"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === "op" ? (
                      <Check size={12} />
                    ) : (
                      <Shield size={12} />
                    )}
                    OP
                  </button>

                  <button
                    onClick={() => handleAction(player.name, "kick", `kick ${player.name} Kicked by admin.`)}
                    className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold uppercase tracking-wider flex justify-center items-center gap-1 transition-colors"
                    title="Kick Player"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === "kick" ? (
                      <Check size={12} />
                    ) : (
                      <UserMinus size={12} />
                    )}
                    Kick
                  </button>

                  <button
                    onClick={() => handleAction(player.name, "ban", `ban ${player.name} Banned by admin.`)}
                    className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[10px] font-mono font-bold uppercase tracking-wider flex justify-center items-center gap-1 transition-colors"
                    title="Ban Player"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === "ban" ? (
                      <Check size={12} />
                    ) : (
                      <Gavel size={12} />
                    )}
                    Ban
                  </button>

                  <button
                    onClick={() => handleAction(player.name, "ban-ip", `ban-ip ${player.name}`)}
                    className="px-2 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 text-[10px] font-mono font-bold uppercase tracking-wider flex justify-center items-center gap-1 transition-colors"
                    title="Ban IP"
                  >
                    {loadingAction?.player === player.name && loadingAction?.action === "ban-ip" ? (
                      <Check size={12} />
                    ) : (
                      <ShieldAlert size={12} />
                    )}
                    IP
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
