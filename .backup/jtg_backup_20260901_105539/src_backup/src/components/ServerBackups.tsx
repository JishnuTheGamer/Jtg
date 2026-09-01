import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { Archive, Download, Trash2, RefreshCw, Plus, Clock, FileArchive, RotateCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Backup {
  filename: string;
  size: number;
  createdAt: string;
}

export default function ServerBackups({ serverId }: { serverId: string }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deleteFilename, setDeleteFilename] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/servers/${serverId}/backups`);
      setBackups(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [serverId]);

  const handleCreateBackup = async () => {
    setStatusMsg(null);
    try {
      setIsCreating(true);
      await axios.post(`/api/servers/${serverId}/backups`);
      await fetchBackups();
      setStatusMsg({ text: "Backup created successfully.", type: "success" });
    } catch (e: any) {
      setStatusMsg({ text: e.response?.data?.error || "Failed to create backup.", type: "error" });
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleteFilename(null);
    setStatusMsg(null);
    try {
      await axios.delete(`/api/servers/${serverId}/backups/${filename}`);
      await fetchBackups();
      setStatusMsg({ text: "Backup deleted.", type: "success" });
    } catch (e: any) {
      setStatusMsg({ text: e.response?.data?.error || "Failed to delete backup.", type: "error" });
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await axios.get(`/api/servers/${serverId}/backups/${filename}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to download.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
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
            <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground-muted mb-1">Server Backups</h2>
            <p className="text-sm text-muted-foreground">Create, download, and manage your server archives.</p>
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-xs opacity-70 hover:opacity-100 ml-3">Dismiss</button>
          </div>
        )}

        <div className="bg-muted-subtle border border-border-subtle p-5 md:p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-theme-600/10 text-theme-500 rounded-lg shrink-0">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5">Create Backup</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">All files on the server will be converted into a single zip file. This process may take some time depending on your server's size.</p>
            </div>
          </div>
          <button 
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="w-full md:w-auto px-5 py-2.5 bg-theme-600 hover:bg-theme-700 border border-theme-500/50 text-foreground font-medium rounded-lg transition-all shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isCreating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Zipping files...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Create Backup</>
            )}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center">
            <Clock className="w-4 h-4 mr-2" /> Recent Backups
          </h3>
          
          <div className="bg-muted-subtle border border-border-subtle rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-theme-600 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Archive className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-foreground-muted font-medium mb-1">No backups found</h4>
                <p className="text-muted-foreground text-sm">Create a backup above to secure your files.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {backups.map((backup) => (
                  <div key={backup.filename} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted-subtle transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Archive className="w-5 h-5 text-foreground-muted" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium text-foreground-muted">{backup.filename}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-3">
                          <span>{formatSize(backup.size)}</span>
                          <span>•</span>
                          <span>{new Date(backup.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleDownload(backup.filename)}
                        className="flex-1 md:flex-none flex justify-center items-center px-3 py-1.5 bg-muted hover:bg-muted-hover text-foreground text-xs font-medium rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                      </button>
                      {(user?.role === "admin" || user) && (
                        deleteFilename === backup.filename ? (
                          <div className="flex items-center gap-1 bg-theme-500/10 border border-theme-500/30 px-2 py-1 rounded text-xs">
                            <span className="text-theme-400">Delete?</span>
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
                            className="p-1.5 bg-theme-500/10 hover:bg-theme-500/20 text-theme-400 rounded transition-colors"
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
          {(isCreating) && <LoadingOverlay />}
    </div>
  );
}
