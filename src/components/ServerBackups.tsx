import React, { useEffect, useState } from "react";

import { safeStorage, safeSessionStorage } from "../utils/storage";
import axios from "axios";
import { 
  Archive, 
  Download, 
  Trash2, 
  RefreshCw, 
  Plus, 
  Clock, 
  FileArchive, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  Layers
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Backup {
  filename: string;
  size: number;
  createdAt: string;
}

export default function ServerBackups({ serverId }: { serverId: string }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [includeCache, setIncludeCache] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("Initializing backup...");
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deleteFilename, setDeleteFilename] = useState<string | null>(null);
  const [restoreFilename, setRestoreFilename] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStage, setRestoreStage] = useState("Initializing restore...");

  const { user } = useAuth();

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/servers/${serverId}/backups`);
      if (Array.isArray(res.data)) {
        setBackups(res.data);
      } else if (res.data && Array.isArray(res.data.backups)) {
        setBackups(res.data.backups);
      } else {
        setBackups([]);
      }
    } catch (e) {
      console.error("Fetch backups error:", e);
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [serverId]);

  const handleCreateBackup = async () => {
    setStatusMsg(null);
    setIsCreating(true);
    setBackupProgress(10);
    setProgressStage("Scanning worlds, plugins, and configs...");

    let intervalId: NodeJS.Timeout | null = null;

    try {
      intervalId = setInterval(() => {
        setBackupProgress((prev) => {
          if (prev < 35) {
            setProgressStage("Analyzing server directory structures...");
            return prev + 5;
          } else if (prev < 70) {
            setProgressStage(includeCache ? "Compressing full server files & runtime..." : "Compressing worlds, configurations, and plugins...");
            return prev + 4;
          } else if (prev < 92) {
            setProgressStage("Finalizing ZIP archive...");
            return prev + 2;
          }
          return prev;
        });
      }, 350);

      await axios.post(`/api/servers/${serverId}/backups`, { includeCache });

      if (intervalId) clearInterval(intervalId);
      setBackupProgress(100);
      setProgressStage("Backup generated successfully!");
      
      await new Promise((r) => setTimeout(r, 500));
      await fetchBackups();
      setStatusMsg({ text: "Backup created successfully.", type: "success" });
    } catch (e: any) {
      if (intervalId) clearInterval(intervalId);
      setStatusMsg({ text: e.response?.data?.error || "Failed to create backup.", type: "error" });
      console.error("Backup creation error:", e);
    } finally {
      setIsCreating(false);
      setBackupProgress(0);
      setProgressStage("");
    }
  };

  const handleDownload = async (filename: string) => {
    setStatusMsg({ text: `Downloading ${filename}... Please wait, this may take a moment.`, type: "success" });
    try {
      const response = await axios.get(`/api/servers/${serverId}/backups/${encodeURIComponent(filename)}`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setStatusMsg({ text: `Download complete: ${filename}`, type: "success" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: `Failed to download: ${err.message}`, type: "error" });
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleteFilename(null);
    setStatusMsg(null);
    try {
      await axios.delete(`/api/servers/${serverId}/backups/${encodeURIComponent(filename)}`);
      await fetchBackups();
      setStatusMsg({ text: "Backup deleted.", type: "success" });
    } catch (e: any) {
      setStatusMsg({ text: e.response?.data?.error || "Failed to delete backup.", type: "error" });
    }
  };

  const handleRestore = async (filename: string) => {
    setIsRestoring(true);
    setStatusMsg(null);
    setRestoreProgress(10);
    setRestoreStage("Stopping server & preparing filesystem...");

    let intervalId: NodeJS.Timeout | null = null;
    intervalId = setInterval(() => {
      setRestoreProgress((prev) => {
        if (prev < 30) {
          setRestoreStage("Unpacking compressed backup archive...");
          return prev + 5;
        } else if (prev < 70) {
          setRestoreStage("Restoring worlds, configs, and plugins...");
          return prev + 4;
        } else if (prev < 92) {
          setRestoreStage("Verifying permissions and file layout...");
          return prev + 2;
        }
        return prev;
      });
    }, 300);

    try {
      await axios.post(`/api/servers/${serverId}/backups/${encodeURIComponent(filename)}/restore`);
      if (intervalId) clearInterval(intervalId);
      setRestoreProgress(100);
      setRestoreStage("Server restored successfully!");
      setRestoreFilename(null);
      await new Promise((r) => setTimeout(r, 600));
      setStatusMsg({ text: "Server restored successfully from backup!", type: "success" });
    } catch (e: any) {
      if (intervalId) clearInterval(intervalId);
      setStatusMsg({ text: e.response?.data?.error || "Failed to restore backup.", type: "error" });
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreStage("");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 text-foreground">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground-muted mb-1">
              Server Backups
            </h2>
            <p className="text-sm text-muted-foreground">
              Create, download, and restore your Minecraft server archives.
            </p>
          </div>
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted-hover text-muted-foreground hover:text-foreground text-xs font-medium rounded-lg transition-colors border border-border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh List
          </button>
        </div>

        {statusMsg && (
          <div className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-md ${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100 ml-3 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Create Backup Box */}
        <div className="bg-muted-subtle border border-border-subtle p-5 md:p-6 rounded-xl relative overflow-hidden flex flex-col gap-4 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-theme-600/10 text-theme-500 rounded-lg shrink-0 border border-theme-500/20">
                <FileArchive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-0.5 flex items-center gap-2">
                  Create Backup
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-theme-500/10 text-theme-400 rounded-full border border-theme-500/20">
                    ZIP Archive
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Packages worlds, configurations, plugins, and player data into a single downloadable file.
                </p>
              </div>
            </div>

            <button 
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="w-full md:w-auto px-5 py-2.5 bg-theme-600 hover:bg-theme-700 border border-theme-500/50 text-foreground font-medium rounded-lg transition-all shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50 active:scale-95"
            >
              {isCreating ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Packaging Files...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Create Backup Now</>
              )}
            </button>
          </div>

          {/* Backup Option Toggles */}
          <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCache}
                onChange={(e) => setIncludeCache(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-theme-600 focus:ring-0"
              />
              <span>Include server engine binaries & runtime cache (increases backup size by ~100-200MB)</span>
            </label>
            <span className="text-[11px] text-zinc-500">
              {includeCache ? "Mode: Full System Snapshot" : "Mode: Fast Core Backup (Worlds & Plugins)"}
            </span>
          </div>
        </div>

        {/* Backups List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Recent Backups ({Array.isArray(backups) ? backups.length : 0})
            </h3>
          </div>
          
          <div className="bg-muted-subtle border border-border-subtle rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-theme-600 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading backup archive records...</span>
              </div>
            ) : !Array.isArray(backups) || backups.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Archive className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-foreground-muted font-medium mb-1">No backups found</h4>
                <p className="text-muted-foreground text-sm">Create a backup above to secure your world and server files.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {(Array.isArray(backups) ? backups : []).map((backup) => (
                  <div key={backup.filename} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted-subtle/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg shrink-0">
                        <Archive className="w-5 h-5 text-theme-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground-muted truncate" title={backup.filename}>
                          {backup.filename}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-3">
                          <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] border border-zinc-700/50 text-zinc-300">
                            {formatSize(backup.size)}
                          </span>
                          <span>•</span>
                          <span>{new Date(backup.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                      {/* Download Button */}
                      <button 
                        onClick={() => handleDownload(backup.filename)}
                        className="flex-1 md:flex-none flex justify-center items-center px-3.5 py-1.5 bg-theme-600 hover:bg-theme-500 text-foreground text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 active:scale-95"
                        title="Download ZIP archive directly to your device"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download (.zip)
                      </button>

                      {/* Restore Button */}
                      {(user?.role === "admin" || user?.role === "owner" || user) && (
                        restoreFilename === backup.filename ? (
                          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg text-xs">
                            <span className="text-amber-400 font-medium">Restore?</span>
                            <button
                              onClick={() => handleRestore(backup.filename)}
                              disabled={isRestoring}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2 py-0.5 rounded text-xs transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isRestoring ? "Restoring..." : "Yes"}
                            </button>
                            <button
                              onClick={() => setRestoreFilename(null)}
                              disabled={isRestoring}
                              className="bg-muted hover:bg-muted-hover text-muted-foreground px-2 py-0.5 rounded text-xs transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRestoreFilename(backup.filename)}
                            className="px-2.5 py-1.5 bg-muted hover:bg-muted-hover text-muted-foreground hover:text-amber-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border border-border"
                            title="Restore server from this backup archive"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </button>
                        )
                      )}

                      {/* Delete Button */}
                      {(user?.role === "admin" || user?.role === "owner" || user) && (
                        deleteFilename === backup.filename ? (
                          <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg text-xs">
                            <span className="text-rose-400 font-medium">Delete?</span>
                            <button
                              onClick={() => handleDelete(backup.filename)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded text-xs transition-all active:scale-95"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteFilename(null)}
                              className="bg-muted hover:bg-muted-hover text-muted-foreground px-2 py-0.5 rounded text-xs transition-all"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteFilename(backup.filename)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                            title="Delete Backup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Backup Creation Progress Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-theme-600/20 text-theme-400 rounded-xl">
                  <Archive className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Creating Server Backup</h3>
                  <p className="text-xs text-zinc-400">Packaging and compressing files into a ZIP archive...</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{progressStage}</span>
                  <span className="font-mono font-bold text-theme-400">{backupProgress}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-theme-600 to-theme-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${backupProgress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center text-[11px] text-zinc-500 gap-1.5 pt-1">
                <RefreshCw className="w-3 h-3 animate-spin text-theme-500" />
                <span>Do not close this window during archive compression</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Backup Restoration Progress Modal */}
        {isRestoring && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-theme-600/20 text-theme-400 rounded-xl">
                  <RotateCcw className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base">Restoring Server Backup</h3>
                  <p className="text-xs text-zinc-400">Extracting world data and restoring configurations...</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">{restoreStage}</span>
                  <span className="font-mono font-bold text-theme-400">{restoreProgress}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-theme-600 to-theme-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${restoreProgress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center text-[11px] text-zinc-500 gap-1.5 pt-1">
                <RefreshCw className="w-3 h-3 animate-spin text-theme-500" />
                <span>Do not restart or close the browser during restoration</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
