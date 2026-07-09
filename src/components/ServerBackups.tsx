import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { Archive, Download, Trash2, RefreshCw, Plus, Clock, FileArchive } from "lucide-react";
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
    try {
      setIsCreating(true);
      await axios.post(`/api/servers/${serverId}/backups`);
      await fetchBackups();
    } catch (e) {
      alert("Failed to create backup.");
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm("Are you sure you want to delete this backup?")) return;
    try {
      await axios.delete(`/api/servers/${serverId}/backups/${filename}`);
      fetchBackups();
    } catch (e) {
      alert("Failed to delete backup.");
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-1">Server Backups</h2>
            <p className="text-sm text-zinc-400">Create, download, and manage your server archives.</p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-0.5">Create Backup</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">All files on the server will be converted into a single zip file. This process may take some time depending on your server's size.</p>
            </div>
          </div>
          <button 
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="w-full md:w-auto px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400/50 text-white font-medium rounded-lg transition-all shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isCreating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Zipping files...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Create Backup</>
            )}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center">
            <Clock className="w-4 h-4 mr-2" /> Recent Backups
          </h3>
          
          <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Archive className="w-12 h-12 text-zinc-600 mb-4 opacity-50" />
                <h4 className="text-zinc-300 font-medium mb-1">No backups found</h4>
                <p className="text-zinc-500 text-sm">Create a backup above to secure your files.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {backups.map((backup) => (
                  <div key={backup.filename} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Archive className="w-5 h-5 text-zinc-300" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium text-zinc-200">{backup.filename}</p>
                        <div className="flex items-center text-xs text-zinc-500 mt-1 gap-3">
                          <span>{formatSize(backup.size)}</span>
                          <span>•</span>
                          <span>{new Date(backup.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleDownload(backup.filename)}
                        className="flex-1 md:flex-none flex justify-center items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                      </button>
                      {(user?.role === "admin" || user) && (
                        <button 
                          onClick={() => handleDelete(backup.filename)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
