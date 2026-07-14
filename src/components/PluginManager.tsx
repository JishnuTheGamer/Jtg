import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { Search, Download, RefreshCw, Puzzle, AlertCircle, Box, Server, Cpu } from "lucide-react";

interface Plugin {
  id: string;
  source: 'modrinth' | 'spigot' | 'hangar';
  name: string;
  tag: string;
  downloads: number;
  rating: number;
  icon: string | null;
}

export default function PluginManager({ serverId }: { serverId: string }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<'all' | 'modrinth' | 'spigot' | 'hangar'>('all');

  const searchPlugins = async (searchQuery: string = "essentials") => {
    try {
      setLoading(true);
      
      const q = searchQuery.trim() || 'essentials';
      const results: Plugin[] = [];
      
      const promises = [];
      
      // Create a clean axios instance for external requests so we don't send our auth token
      const externalAxios = axios.create();
      delete externalAxios.defaults.headers.common['Authorization'];
      
      if (activeSource === 'all' || activeSource === 'modrinth') {
        promises.push(
          externalAxios.get(`https://api.modrinth.com/v2/search?query=${q}&facets=[["project_type:plugin"]]&limit=15`)
            .then(res => {
              res.data.hits.forEach((hit: any) => {
                results.push({
                  id: hit.project_id,
                  source: 'modrinth',
                  name: hit.title,
                  tag: hit.description,
                  downloads: hit.downloads,
                  rating: 0,
                  icon: hit.icon_url
                });
              });
            }).catch(() => {})
        );
      }
      
      if (activeSource === 'all' || activeSource === 'spigot') {
        promises.push(
          externalAxios.get(`https://api.spiget.org/v2/search/resources/${q}?field=name&size=15&page=1`)
            .then(res => {
              if(Array.isArray(res.data)) {
                res.data.forEach((hit: any) => {
                  results.push({
                    id: hit.id.toString(),
                    source: 'spigot',
                    name: hit.name,
                    tag: hit.tag,
                    downloads: hit.downloads,
                    rating: hit.rating ? hit.rating.average : 0,
                    icon: hit.icon?.url ? `https://spigotmc.org/${hit.icon.url}` : null
                  });
                });
              }
            }).catch(() => {})
        );
      }

      if (activeSource === 'all' || activeSource === 'hangar') {
        promises.push(
          externalAxios.get(`https://hangar.papermc.io/api/v1/projects?q=${q}&limit=15`)
            .then(res => {
              if (res.data && res.data.result) {
                res.data.result.forEach((hit: any) => {
                  results.push({
                    id: `${hit.namespace.owner}/${hit.namespace.slug}`,
                    source: 'hangar',
                    name: hit.name,
                    tag: hit.description,
                    downloads: hit.stats?.downloads || 0,
                    rating: 0,
                    icon: null
                  });
                });
              }
            }).catch(() => {})
        );
      }

      await Promise.all(promises);
      
      results.sort((a, b) => b.downloads - a.downloads);
      setPlugins(results);
    } catch (e) {
      console.error(e);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPlugins();
  }, [activeSource]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPlugins(query);
  };

  const handleInstall = async (plugin: Plugin) => {
    if (!confirm(`Are you sure you want to install ${plugin.name}?`)) return;
    try {
      setIsInstalling(plugin.id);
      
      const res = await axios.post(`/api/servers/${serverId}/plugins/install`, {
        source: plugin.source,
        pluginId: plugin.id,
        pluginName: plugin.name
      });
      
      alert(res.data.message || `${plugin.name} installed successfully! Restart the server to apply changes.`);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to install plugin.");
    } finally {
      setIsInstalling(null);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'modrinth': return <Box className="w-3 h-3 text-green-400" />;
      case 'spigot': return <Server className="w-3 h-3 text-orange-400" />;
      case 'hangar': return <Cpu className="w-3 h-3 text-blue-400" />;
      default: return <Puzzle className="w-3 h-3 text-indigo-400" />;
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'modrinth': return 'Modrinth';
      case 'spigot': return 'SpigotMC';
      case 'hangar': return 'Paper Hangar';
      default: return source;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 text-white bg-transparent">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md mb-1">Plugin Manager</h2>
            <p className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-widest mt-1">Search and install plugins from Modrinth, Spigot, and Paper Hangar.</p>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
          <div className="p-4 border-b border-white/5 space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search for plugins..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Search
              </button>
            </form>
            
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {['all', 'modrinth', 'spigot', 'hangar'].map(src => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveSource(src as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeSource === src ? 'bg-indigo-500 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
                >
                  {src === 'all' ? <Puzzle className="w-3.5 h-3.5" /> : getSourceIcon(src)}
                  {src === 'all' ? 'All Sources' : getSourceName(src)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-indigo-500/50" />
                Searching repositories...
              </div>
            ) : plugins.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-3 text-zinc-600" />
                No plugins found.
              </div>
            ) : (
              plugins.map((plugin) => (
                <div key={`${plugin.source}-${plugin.id}`} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                      {plugin.icon ? (
                         <img src={plugin.icon} alt={plugin.name} className="w-full h-full object-cover" />
                      ) : (
                         <Puzzle className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                         <h4 className="font-medium text-zinc-200 truncate">{plugin.name}</h4>
                         <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/5 text-zinc-400 flex items-center gap-1">
                            {getSourceIcon(plugin.source)} {plugin.source}
                         </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{plugin.tag}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-zinc-500">
                        {plugin.downloads > 0 && (
                          <span className="flex items-center gap-1" title="Downloads">
                            <Download className="w-3.5 h-3.5 text-zinc-600" />
                            {plugin.downloads.toLocaleString()}
                          </span>
                        )}
                        {plugin.rating > 0 && (
                          <span title="Rating">⭐ {plugin.rating.toFixed(1)}/5</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleInstall(plugin)}
                    disabled={isInstalling !== null}
                    className="w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 text-zinc-300 hover:text-indigo-400 rounded-lg text-sm font-medium transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    {isInstalling === plugin.id ? (
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
      
      {isInstalling !== null && <LoadingOverlay message="Installing plugin..." />}
    </div>
  );
}
