import React, { useState } from "react";
import { Users, Shield, Gavel, UserMinus, ShieldAlert, Check, RefreshCw } from "lucide-react";
import axios from "axios";

export default function PlayerManager({ serverId, players }: { serverId: string, players: {name: string}[] }) {
  const [loadingAction, setLoadingAction] = useState<{player: string, action: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
    <div id="player-manager" className="relative h-full flex flex-col min-h-0">
      <div className="px-4 pt-3.5 pb-1 shrink-0 relative z-10 flex items-center justify-between">
        <h2 className="qx-display text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
          Players
        </h2>
        <button 
          onClick={handleRefresh} 
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Refresh Player List"
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="relative z-10 overflow-y-auto flex-1 qx-scroll touch-auto overscroll-y-auto mt-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {players.length === 0 ? (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full opacity-50">
            <Users className="w-8 h-8 mb-2 text-slate-500" />
            <span className="qx-mono text-[10px] text-slate-500 uppercase tracking-widest">No players online</span>
          </div>
        ) : (
          players.map((player) => (
            <div key={player.name} className="px-4 py-2.5 flex flex-col gap-2 hover:bg-muted-subtle border-t border-border-subtle first:border-t-0 transition-colors">
              <div className="flex items-center gap-2">
                <img 
                  src={`https://minotar.net/avatar/${player.name}/32.png`} 
                  alt={player.name}
                  className="w-8 h-8 rounded-sm bg-card shrink-0 border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABW71eEAAAARElEQVR42mP8/58BDBjhGqgEho+B4aNg+BgYPgYqMECnEQ9s2IDiH2w4j6QY9EEDX8n20AdVDPqggS/4+tEHDXzB1w8AYU7y34W8vU0AAAAASUVORK5CYII='; }}
                />
                <span className="qx-display font-semibold text-slate-200 text-base truncate">{player.name}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 w-full mt-1">
                <button 
                  onClick={() => handleAction(player.name, 'op', `op ${player.name}`)}
                  className="qx-chamfer px-2 py-1.5 bg-emerald-400/[0.06] hover:bg-emerald-400/15 text-emerald-400 border border-emerald-400/10 hover:border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center transition-colors"
                  title="Make OP"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'op' ? <Check size={12} className="mr-1" /> : <Shield size={12} className="mr-1" />}
                  OP
                </button>
                <button 
                  onClick={() => handleAction(player.name, 'kick', `kick ${player.name} Kicked by admin.`)}
                  className="qx-chamfer px-2 py-1.5 bg-amber-400/[0.06] hover:bg-amber-400/15 text-amber-400 border border-amber-400/10 hover:border-amber-400/30 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center transition-colors"
                  title="Kick Player"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'kick' ? <Check size={12} className="mr-1" /> : <UserMinus size={12} className="mr-1" />}
                  Kick
                </button>
                <button 
                  onClick={() => handleAction(player.name, 'ban', `ban ${player.name} Banned by admin.`)}
                  className="qx-chamfer px-2 py-1.5 bg-rose-400/[0.06] hover:bg-rose-400/15 text-rose-400 border border-rose-400/10 hover:border-rose-400/30 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center transition-colors"
                  title="Ban Player"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'ban' ? <Check size={12} className="mr-1" /> : <Gavel size={12} className="mr-1" />}
                  Ban
                </button>
                <button 
                  onClick={() => handleAction(player.name, 'ban-ip', `ban-ip ${player.name}`)}
                  className="qx-chamfer px-2 py-1.5 bg-rose-500/[0.08] hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 hover:border-rose-500/40 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center transition-colors"
                  title="Ban IP"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'ban-ip' ? <Check size={12} className="mr-1" /> : <ShieldAlert size={12} className="mr-1" />}
                  IP
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
