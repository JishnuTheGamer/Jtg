import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Tag,
  Calendar,
  Layers,
  Filter,
  Check
} from "lucide-react";
import {
  ModrinthFileVersion,
  formatFileSize,
  isVersionCompatible,
  normalizeMinecraftVersion
} from "../utils/modrinthHelper";

interface ModrinthVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  projectId: string;
  projectTitle: string;
  projectIcon: string | null;
  serverType: string;
  serverVersion: string;
  itemType: "plugin" | "mod";
  installedFiles: string[];
  onInstallSuccess: (filename: string, version: string) => void;
}

export default function ModrinthVersionModal({
  isOpen,
  onClose,
  serverId,
  projectId,
  projectTitle,
  projectIcon,
  serverType,
  serverVersion,
  itemType,
  installedFiles,
  onInstallSuccess,
}: ModrinthVersionModalProps) {
  const [versions, setVersions] = useState<ModrinthFileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCompatibleOnly, setFilterCompatibleOnly] = useState(false);
  const [channelFilter, setChannelFilter] = useState<"all" | "release" | "beta">("all");
  const [searchVersionQuery, setSearchVersionQuery] = useState("");
  const [installingFileUrl, setInstallingFileUrl] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<string | null>(null);

  const normalizedGameVer = normalizeMinecraftVersion(serverVersion);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setInstallError(null);
    setSuccessFile(null);

    // Fetch versions via panel backend or Modrinth public API
    const fetchVersions = async () => {
      try {
        const res = await axios.get(`/api/servers/${serverId}/modrinth/versions/${projectId}`);
        if (isMounted) {
          const data = res.data;
          if (Array.isArray(data)) {
            setVersions(data);
            // If there are compatible versions, default filter to true for convenience
            const hasCompatible = data.some((v) => isVersionCompatible(v, serverType, serverVersion));
            if (hasCompatible) {
              setFilterCompatibleOnly(true);
            }
          }
        }
      } catch (err: any) {
        // Fallback to direct public Modrinth API call
        try {
          const directRes = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, {
            headers: { "User-Agent": "JTG-Panel/1.0" }
          });
          if (isMounted && Array.isArray(directRes.data)) {
            setVersions(directRes.data);
            const hasCompatible = directRes.data.some((v) => isVersionCompatible(v, serverType, serverVersion));
            if (hasCompatible) {
              setFilterCompatibleOnly(true);
            }
          }
        } catch (fallbackErr: any) {
          if (isMounted) {
            setError(err.response?.data?.error || "Failed to load project versions from Modrinth.");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVersions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId, serverId, serverType, serverVersion]);

  if (!isOpen) return null;

  const handleInstallFile = async (version: ModrinthFileVersion, file: ModrinthFileVersion["files"][0]) => {
    try {
      setInstallError(null);
      setInstallingFileUrl(file.url);
      setSuccessFile(null);

      const endpoint = itemType === "plugin" 
        ? `/api/servers/${serverId}/plugins/install`
        : `/api/servers/${serverId}/mods/install`;

      const res = await axios.post(endpoint, {
        pluginId: projectId,
        pluginName: projectTitle,
        versionId: version.id,
        fileUrl: file.url,
        fileName: file.filename
      });

      const installedName = res.data.filename || file.filename;
      setSuccessFile(installedName);
      onInstallSuccess(installedName, version.version_number || version.name);
    } catch (err: any) {
      setInstallError(err.response?.data?.error || "Failed to install file into server.");
    } finally {
      setInstallingFileUrl(null);
    }
  };

  const filteredVersions = versions.filter((v) => {
    if (channelFilter !== "all" && v.version_type !== channelFilter) {
      return false;
    }
    if (filterCompatibleOnly && !isVersionCompatible(v, serverType, serverVersion)) {
      return false;
    }
    if (searchVersionQuery.trim()) {
      const q = searchVersionQuery.toLowerCase().trim();
      const matchNum = v.version_number?.toLowerCase().includes(q);
      const matchName = v.name?.toLowerCase().includes(q);
      const matchGame = v.game_versions?.some((gv) => gv.toLowerCase().includes(q));
      if (!matchNum && !matchName && !matchGame) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 overflow-hidden">
              {projectIcon ? (
                <img src={projectIcon} alt={projectTitle} className="w-full h-full object-cover" />
              ) : (
                <FileCode className="w-6 h-6 text-zinc-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-bold text-zinc-100 truncate">{projectTitle}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Modrinth
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Server: <strong className="text-zinc-200 font-semibold">{serverType}</strong></span>
                <span>•</span>
                <span>Minecraft Game Version: <strong className="text-zinc-200 font-semibold">{normalizedGameVer}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {successFile && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Installed <strong>{successFile}</strong> cleanly into the server!</span>
          </div>
        )}

        {installError && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{installError}</span>
            </div>
            <button onClick={() => setInstallError(null)} className="text-xs opacity-75 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterCompatibleOnly(!filterCompatibleOnly)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                filterCompatibleOnly
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${filterCompatibleOnly ? "text-emerald-400" : "opacity-30"}`} />
              Only Compatible with {serverType} {normalizedGameVer}
            </button>

            <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900 p-0.5">
              {(["all", "release", "beta"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChannelFilter(type)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    channelFilter === type
                      ? "bg-zinc-800 text-zinc-100 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter versions or MC version (e.g. 1.21)..."
              value={searchVersionQuery}
              onChange={(e) => setSearchVersionQuery(e.target.value)}
              className="w-full md:w-64 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Version List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
              <span>Loading versions and uploaded files from Modrinth...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 mb-3" />
              <span>{error}</span>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 mb-3 text-zinc-500" />
              <p className="font-semibold text-zinc-300">No matching versions found</p>
              <p className="text-xs text-zinc-500 mt-1">
                {filterCompatibleOnly 
                  ? `Try unchecking "Only Compatible with ${serverType} ${normalizedGameVer}" to view all releases.`
                  : "Try clearing your version search filter."}
              </p>
              {filterCompatibleOnly && (
                <button
                  onClick={() => setFilterCompatibleOnly(false)}
                  className="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium"
                >
                  Show All Versions
                </button>
              )}
            </div>
          ) : (
            filteredVersions.map((ver) => {
              const isCompatible = isVersionCompatible(ver, serverType, serverVersion);

              return (
                <div
                  key={ver.id}
                  className={`border rounded-xl p-4 transition-all bg-zinc-900/40 ${
                    isCompatible
                      ? "border-emerald-500/30 bg-emerald-950/10 shadow-[0_0_15px_-5px_rgba(16,185,129,0.15)]"
                      : "border-zinc-800/90 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/70">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-100 text-sm">
                          {ver.name || ver.version_number}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          v{ver.version_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ver.version_type === "release"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : ver.version_type === "beta"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {ver.version_type}
                        </span>

                        {isCompatible && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            Compatible
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-zinc-400 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {new Date(ver.date_published).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3 text-zinc-500" />
                          {ver.downloads.toLocaleString()} downloads
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 text-[11px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-zinc-500">MC:</span>
                        {ver.game_versions?.slice(0, 4).map((gv) => (
                          <span
                            key={gv}
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                              gv === normalizedGameVer
                                ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {gv}
                          </span>
                        ))}
                        {(ver.game_versions?.length || 0) > 4 && (
                          <span className="text-zinc-500 text-[10px]">
                            +{ver.game_versions.length - 4} more
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-zinc-500">Loaders:</span>
                        {ver.loaders?.map((ldr) => (
                          <span
                            key={ldr}
                            className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-zinc-800 text-zinc-300 capitalize"
                          >
                            {ldr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Dedicated Files list */}
                  <div className="mt-3 space-y-2">
                    <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      Uploaded Files ({ver.files?.length || 0}):
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {ver.files?.map((file, idx) => {
                        const isInstalled = installedFiles.some(
                          (name) => name.toLowerCase() === file.filename.toLowerCase()
                        );
                        const isDownloading = installingFileUrl === file.url;

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg flex items-center justify-between gap-3 border transition-colors ${
                              isInstalled
                                ? "bg-emerald-950/20 border-emerald-500/30"
                                : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-zinc-200 truncate font-medium">
                                    {file.filename}
                                  </span>
                                  {file.primary && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-zinc-500">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isInstalled && (
                                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Installed
                                </span>
                              )}

                              <button
                                onClick={() => handleInstallFile(ver, file)}
                                disabled={installingFileUrl !== null}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                                  isInstalled
                                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                                }`}
                              >
                                {isDownloading ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Installing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{isInstalled ? "Reinstall" : "Install File"}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing <strong>{filteredVersions.length}</strong> of <strong>{versions.length}</strong> versions
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
