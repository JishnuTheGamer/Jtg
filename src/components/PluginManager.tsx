import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  Download,
  RefreshCw,
  Puzzle,
  AlertCircle,
  Box,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Server,
  FolderDown,
  ChevronRight,
  ExternalLink,
  RotateCw
} from "lucide-react";
import { LoadingOverlay } from "./LoadingOverlay";
import ModrinthVersionModal from "./ModrinthVersionModal";
import {
  ModrinthHit,
  InstalledItem,
  formatFileSize,
  normalizeMinecraftVersion
} from "../utils/modrinthHelper";

interface PluginManagerProps {
  serverId: string;
  server?: any;
}

export default function PluginManager({ serverId, server }: PluginManagerProps) {
  const [currentServer, setCurrentServer] = useState<any>(server || null);
  const [activeTab, setActiveTab] = useState<"search" | "installed">("search");
  
  // Search state
  const [plugins, setPlugins] = useState<ModrinthHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isInstallingId, setIsInstallingId] = useState<string | null>(null);
  
  // Installed plugins state
  const [installedPlugins, setInstalledPlugins] = useState<InstalledItem[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [deletingPlugin, setDeletingPlugin] = useState<string | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Version explorer modal
  const [modalProject, setModalProject] = useState<ModrinthHit | null>(null);

  // Load server details if not provided
  useEffect(() => {
    if (!currentServer) {
      axios.get(`/api/servers/${serverId}`)
        .then(res => setCurrentServer(res.data))
        .catch(console.error);
    }
  }, [serverId, currentServer]);

  const serverType = (currentServer?.type || "PAPER").toUpperCase();
  const serverVersion = currentServer?.version || "1.21.4";
  const normalizedGameVer = normalizeMinecraftVersion(serverVersion);

  const isProxy = ["VELOCITY", "BUNGEECORD", "WATERFALL"].includes(serverType);
  const isCompatibleSoftware = ["PAPER", "SPIGOT", "BUKKIT", "PURPUR"].includes(serverType);

  // Fetch installed plugins
  const fetchInstalledPlugins = async () => {
    if (isProxy) return;
    try {
      setLoadingInstalled(true);
      const res = await axios.get(`/api/servers/${serverId}/plugins/installed`);
      if (res.data && Array.isArray(res.data.plugins)) {
        setInstalledPlugins(res.data.plugins);
      }
    } catch (err) {
      console.error("Failed to load installed plugins", err);
    } finally {
      setLoadingInstalled(false);
    }
  };

  useEffect(() => {
    fetchInstalledPlugins();
  }, [serverId, isProxy]);

  // Search plugins on Modrinth
  const searchPlugins = async (searchQuery: string = "viaversion") => {
    if (isProxy) return;
    try {
      setLoading(true);
      const q = searchQuery.trim() || "viaversion";

      // Query Modrinth for plugins
      const externalAxios = axios.create();
      delete externalAxios.defaults.headers.common["Authorization"];

      const res = await externalAxios.get("https://api.modrinth.com/v2/search", {
        params: {
          query: q,
          facets: JSON.stringify([["project_type:plugin"]]),
          limit: 20,
        },
      });

      if (res.data && Array.isArray(res.data.hits)) {
        setPlugins(res.data.hits);
      } else {
        setPlugins([]);
      }
    } catch (err) {
      console.error("Error searching plugins:", err);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPlugins("viaversion");
  }, [isProxy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchPlugins(query);
  };

  // 1-Click Auto Install (Auto-detects matching version & file)
  const handleAutoInstall = async (plugin: ModrinthHit) => {
    setStatusMsg(null);
    try {
      setIsInstallingId(plugin.project_id);

      const res = await axios.post(`/api/servers/${serverId}/plugins/install`, {
        source: "modrinth",
        pluginId: plugin.project_id,
        pluginName: plugin.title,
      });

      setStatusMsg({
        text: res.data.message || `Successfully installed ${plugin.title} into plugins folder!`,
        type: "success",
      });

      // Refresh installed plugins
      await fetchInstalledPlugins();
    } catch (err: any) {
      setStatusMsg({
        text: err.response?.data?.error || `Failed to auto-install ${plugin.title}.`,
        type: "error",
      });
    } finally {
      setIsInstallingId(null);
    }
  };

  // Uninstall plugin
  const handleDeletePlugin = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to uninstall and remove "${filename}" from your server?`)) {
      return;
    }

    try {
      setDeletingPlugin(filename);
      const res = await axios.delete(`/api/servers/${serverId}/plugins/${encodeURIComponent(filename)}`);
      setStatusMsg({
        text: res.data.message || `Uninstalled ${filename}. Restart server to apply.`,
        type: "success",
      });
      await fetchInstalledPlugins();
    } catch (err: any) {
      setStatusMsg({
        text: err.response?.data?.error || `Failed to delete ${filename}.`,
        type: "error",
      });
    } finally {
      setDeletingPlugin(null);
    }
  };

  // If proxy server, show strict notice
  if (isProxy) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8 text-foreground">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-amber-200">
                  Plugin Manager Disabled for Proxy Servers
                </h3>
                <p className="text-sm mt-1 text-amber-300/90 leading-relaxed">
                  You are currently running <strong>{serverType}</strong>. Proxy networks (Velocity, BungeeCord, and Waterfall) do not use standard Bukkit/Spigot plugins and require dedicated proxy jars.
                </p>
                <p className="text-xs mt-3 text-amber-400">
                  To install proxy plugins, upload your proxy-specific jars directly to the <code>plugins</code> folder using the <strong>File Manager</strong> or <strong>SFTP</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const installedFileNames = installedPlugins.map((p) => p.filename);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 text-foreground bg-transparent">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title & Navigation Tabs */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <Puzzle className="w-7 h-7 text-emerald-500" />
              <span>Plugin Manager</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Search and install Paper & Spigot plugins powered by <strong>Modrinth</strong> with auto-version detection.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === "search"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Discover & Install
            </button>
            <button
              onClick={() => {
                setActiveTab("installed");
                fetchInstalledPlugins();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === "installed"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              Installed ({installedPlugins.length})
            </button>
          </div>
        </div>

        {/* Server Context / Auto-detect Info Banner */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              {serverType}
            </span>
            <span className="text-zinc-400">Target Game Version:</span>
            <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold">
              {normalizedGameVer}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">Supported Loaders:</span>
            <span className="text-zinc-300 font-medium">Paper, Spigot, Purpur, Bukkit</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Auto-Detection Active</span>
          </div>
        </div>

        {/* Global Toast Alert */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl border text-sm flex items-center justify-between transition-all ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-xs opacity-70 hover:opacity-100 ml-4 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: Discover & Search */}
        {activeTab === "search" && (
          <div className="space-y-4">
            {/* Search Input and Popular Tags */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 md:p-5 shadow-lg space-y-3">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search plugins on Modrinth (e.g. via version, luckperms, essentials, worldedit)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shrink-0 shadow-sm flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search Modrinth
                </button>
              </form>

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs text-zinc-400">
                <span className="text-zinc-500 font-medium mr-1">Popular:</span>
                {[
                  "via version",
                  "luckperms",
                  "essentialsx",
                  "worldedit",
                  "vault",
                  "geyser",
                  "chunky",
                  "spark",
                ].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setQuery(name);
                      searchPlugins(name);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200 text-[11px] transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden divide-y divide-zinc-800/70">
              {loading ? (
                <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
                  <RefreshCw className="w-7 h-7 animate-spin mb-3 text-emerald-500" />
                  <span className="font-medium">Searching Modrinth plugin catalog...</span>
                </div>
              ) : plugins.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
                  <AlertCircle className="w-8 h-8 mb-3 text-zinc-500" />
                  <p className="font-semibold text-zinc-200">No plugins found</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Try searching with another keyword like &quot;viaversion&quot; or &quot;luckperms&quot;.
                  </p>
                </div>
              ) : (
                plugins.map((plugin) => {
                  const isInstallingThis = isInstallingId === plugin.project_id;

                  return (
                    <div
                      key={plugin.project_id}
                      className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors"
                    >
                      {/* Left: Icon & Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          {plugin.icon_url ? (
                            <img
                              src={plugin.icon_url}
                              alt={plugin.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Puzzle className="w-6 h-6 text-emerald-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-zinc-100 text-sm md:text-base truncate">
                              {plugin.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Modrinth
                            </span>
                            {plugin.author && (
                              <span className="text-xs text-zinc-500">
                                by <span className="text-zinc-400 font-medium">{plugin.author}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {plugin.description}
                          </p>

                          {/* Stats and categories */}
                          <div className="flex items-center gap-4 mt-2.5 text-[11px] text-zinc-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Download className="w-3.5 h-3.5 text-zinc-500" />
                              {plugin.downloads.toLocaleString()}
                            </span>

                            <div className="flex items-center gap-1">
                              {plugin.categories?.slice(0, 4).map((cat) => (
                                <span
                                  key={cat}
                                  className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[10px] capitalize"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
                        {/* Choose Version & File button */}
                        <button
                          onClick={() => setModalProject(plugin)}
                          className="flex-1 md:flex-initial px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          title="View all versions and select specific uploaded files"
                        >
                          <Layers className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Versions & Files</span>
                        </button>

                        {/* Quick Auto-Install button */}
                        <button
                          onClick={() => handleAutoInstall(plugin)}
                          disabled={isInstallingThis}
                          className="flex-1 md:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          {isInstallingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Auto-Installing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Auto-Install</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Installed Plugins */}
        {activeTab === "installed" && (
          <div className="space-y-4">
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-lg">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <FolderDown className="w-5 h-5 text-emerald-400" />
                    <span>Installed Plugins in <code>plugins/</code></span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Managing <strong>{installedPlugins.length}</strong> plugin jar files.
                  </p>
                </div>

                <button
                  onClick={fetchInstalledPlugins}
                  disabled={loadingInstalled}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingInstalled ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <div className="divide-y divide-zinc-800/80 mt-2">
                {loadingInstalled ? (
                  <div className="p-8 text-center text-zinc-400 flex flex-col items-center">
                    <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-500" />
                    <span>Scanning plugins directory...</span>
                  </div>
                ) : installedPlugins.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 flex flex-col items-center">
                    <Puzzle className="w-8 h-8 mb-2 text-zinc-600" />
                    <p className="font-semibold text-zinc-300">No plugins installed yet</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Use the &quot;Discover & Install&quot; tab to search and install plugins.
                    </p>
                    <button
                      onClick={() => setActiveTab("search")}
                      className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Browse Modrinth Plugins
                    </button>
                  </div>
                ) : (
                  installedPlugins.map((plugin) => (
                    <div
                      key={plugin.filename}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-emerald-400">
                          <Puzzle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs md:text-sm font-semibold text-zinc-200 truncate">
                            {plugin.filename}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                            <span>{formatFileSize(plugin.size)}</span>
                            {plugin.modified > 0 && (
                              <span>Installed: {new Date(plugin.modified).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePlugin(plugin.filename)}
                        disabled={deletingPlugin === plugin.filename}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                      >
                        {deletingPlugin === plugin.filename ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Removing...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Uninstall</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {installedPlugins.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-800/80 text-xs text-amber-400/90 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Remember to restart your server from the Console to load any newly installed or removed plugins.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Version Explorer & Dedicated File Modal */}
        {modalProject && (
          <ModrinthVersionModal
            isOpen={Boolean(modalProject)}
            onClose={() => setModalProject(null)}
            serverId={serverId}
            projectId={modalProject.project_id}
            projectTitle={modalProject.title}
            projectIcon={modalProject.icon_url}
            serverType={serverType}
            serverVersion={serverVersion}
            itemType="plugin"
            installedFiles={installedFileNames}
            onInstallSuccess={async (filename, version) => {
              setStatusMsg({
                text: `Successfully installed ${filename} (Version: ${version}) into plugins folder!`,
                type: "success",
              });
              await fetchInstalledPlugins();
            }}
          />
        )}
      </div>

      {isInstallingId !== null && <LoadingOverlay message="Auto-detecting version and installing plugin jar..." />}
    </div>
  );
}
