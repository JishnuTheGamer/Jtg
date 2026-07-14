import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { Search, Download, RefreshCw, AlertCircle, Box } from "lucide-react";

interface Mod {
  id: string;
  name: string;
  tag: string;
  downloads: number;
  icon: string | null;
}

export default function ModManager({ serverId }: { serverId: string }) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const searchMods = async (searchQuery: string = "jei") => {
    try {
      setLoading(true);
      
      const q = searchQuery.trim() || 'jei';
      const results: Mod[] = [];
      
      const externalAxios = axios.create();
      delete externalAxios.defaults.headers.common['Authorization'];
      
      await externalAxios.get(`https://api.modrinth.com/v2/search?query=${q}&facets=[["project_type:mod"]]&limit=15`)
        .then(res => {
          res.data.hits.forEach((hit: any) => {
            results.push({
              id: hit.project_id,
              name: hit.title,
              tag: hit.description,
              downloads: hit.downloads,
              icon: hit.icon_url
            });
          });
        }).catch(() => {});
      
      results.sort((a, b) => b.downloads - a.downloads);
      setMods(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchMods();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchMods(query);
  };

  const handleInstall = async (mod: Mod) => {
    if (!confirm(`Are you sure you want to install ${mod.name}?`)) return;
    try {
      setIsInstalling(mod.id);
      
      const res = await axios.post(`/api/servers/${serverId}/mods/install`, {
        pluginId: mod.id,
        pluginName: mod.name
      });
      
      alert(res.data.message || `${mod.name} installed successfully! Restart the server to apply changes.`);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to install mod.");
    } finally {
      setIsInstalling(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 text-white bg-transparent">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-1 flex items-center">
               <Box className="w-6 h-6 mr-2 text-emerald-400" /> Mod Manager
            </h2>
            <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-widest mt-1">Search and install mods from Modrinth in one click.</p>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
          <div className="p-4 border-b border-white/5 space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search for mods..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button 
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Search
              </button>
            </form>
          </div>
          
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-emerald-500/50" />
                Searching repositories...
              </div>
            ) : mods.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-3 text-zinc-600" />
                No mods found.
              </div>
            ) : (
              mods.map((mod) => (
                <div key={mod.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                      {mod.icon ? (
                         <img src={mod.icon} alt={mod.name} className="w-full h-full object-cover" />
                      ) : (
                         <Box className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                         <h4 className="font-medium text-zinc-200 truncate">{mod.name}</h4>
                         <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/5 text-zinc-400 flex items-center gap-1">
                            Modrinth
                         </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{mod.tag}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-zinc-500">
                        {mod.downloads > 0 && (
                          <span className="flex items-center gap-1" title="Downloads">
                            <Download className="w-3.5 h-3.5 text-zinc-600" />
                            {mod.downloads.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleInstall(mod)}
                    disabled={isInstalling !== null}
                    className="w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-400 rounded-lg text-sm font-medium transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    {isInstalling === mod.id ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Installing...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Install</>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {isInstalling !== null && <LoadingOverlay message="Installing mod..." />}
    </div>
  );
}
