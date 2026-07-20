import React, { useState } from "react";
import { Users, Shield, Gavel, UserMinus, ShieldAlert, Check } from "lucide-react";
import axios from "axios";

export default function PlayerManager({ serverId, players }: { serverId: string, players: {name: string}[] }) {
  const [loadingAction, setLoadingAction] = useState<{player: string, action: string} | null>(null);
  
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

  return (
    <div id="player-manager" className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative group h-full flex flex-col">
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-emerald-500/5 blur-[80px] rounded-full" />
      </div>

      <div className="p-4 border-b border-white/5 flex justify-between items-center relative z-10 shrink-0">
        <div>
          <h3 className="text-lg font-black text-white flex items-center tracking-tight drop-shadow-md">
            <Users className="w-4 h-4 mr-2 text-indigo-400" />
            Players
          </h3>
          <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mt-0.5">
            {players.length} {players.length === 1 ? 'online' : 'online'}
          </p>
        </div>
      </div>

      <div className="relative z-10 divide-y divide-white/5 overflow-y-auto flex-1 custom-scrollbar touch-auto overscroll-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {players.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 flex flex-col items-center justify-center h-full min-h-[150px]">
            <Users className="w-6 h-6 mb-2 text-zinc-700" />
            <span className="text-sm">No players online</span>
          </div>
        ) : (
          players.map((player) => (
            <div key={player.name} className="p-3 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center gap-2">
                <img 
                  src={`https://minotar.net/avatar/${player.name}/32.png`} 
                  alt={player.name}
                  className="w-6 h-6 rounded bg-zinc-800 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABW71eEAAAARElEQVR42mP8/58BDBjhGqgEho+B4aNg+BgYPgYqMECnEQ9s2IDiH2w4j6QY9EEDX8n20AdVDPqggS/4+tEHDXzB1w8AYU7y34W8vU0AAAAASUVORK5CYII='; }}
                />
                <span className="font-medium text-zinc-200 text-sm truncate">{player.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <button 
                  onClick={() => handleAction(player.name, 'op', `op ${player.name}`)}
                  className="px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-medium flex justify-center items-center transition-colors"
                  title="Make OP"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'op' ? <Check className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                  OP
                </button>
                <button 
                  onClick={() => handleAction(player.name, 'kick', `kick ${player.name} Kicked by admin.`)}
                  className="px-2 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-md text-[10px] font-medium flex justify-center items-center transition-colors"
                  title="Kick Player"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'kick' ? <Check className="w-3 h-3 mr-1" /> : <UserMinus className="w-3 h-3 mr-1" />}
                  Kick
                </button>
                <button 
                  onClick={() => handleAction(player.name, 'ban', `ban ${player.name} Banned by admin.`)}
                  className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-md text-[10px] font-medium flex justify-center items-center transition-colors"
                  title="Ban Player"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'ban' ? <Check className="w-3 h-3 mr-1" /> : <Gavel className="w-3 h-3 mr-1" />}
                  Ban
                </button>
                <button 
                  onClick={() => handleAction(player.name, 'ban-ip', `ban-ip ${player.name}`)}
                  className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-md text-[10px] font-medium flex justify-center items-center transition-colors"
                  title="Ban IP"
                >
                  {loadingAction?.player === player.name && loadingAction?.action === 'ban-ip' ? <Check className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                  Ban IP
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
