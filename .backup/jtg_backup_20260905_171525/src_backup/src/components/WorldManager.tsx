import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  XCircle,
  Info,
  Archive,
  Loader2,
  FileCheck,
  RefreshCw,
  FolderTree,
  Trash2,
  Square,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function WorldManager({
  serverId,
  server,
  onNavigateToFileManager,
}: {
  serverId: string;
  server: any;
  onNavigateToFileManager?: () => void;
}) {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const [worldInfo, setWorldInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [targetFolderName, setTargetFolderName] = useState<string>("world");
  const [autoUpdateProperties, setAutoUpdateProperties] = useState(true);
  const [lastImportedFolder, setLastImportedFolder] = useState<string | null>(null);

  const fetchWorldInfo = async () => {
    try {
      const res = await axios.get(`/api/servers/${serverId}/world/info`);
      setWorldInfo(res.data);
      if (res.data?.levelName && !targetFolderName) {
        setTargetFolderName(res.data.levelName);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorldInfo();
  }, [serverId]);

  const isServerRunning =
    server?.status === "online" ||
    server?.status === "running" ||
    server?.status === "starting";

  const handleAutoImport = async () => {
    if (!uploadFile) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // Step 1: If server is running, stop it first
      if (isServerRunning) {
        setProcessStep("Stopping server to safely replace world files...");
        try {
          await axios.post(`/api/servers/${serverId}/stop`);
          // Wait briefly for process to gracefully release locks
          await new Promise((r) => setTimeout(r, 1500));
        } catch (stopErr) {
          console.warn("Stop server warning:", stopErr);
        }
      }

      // Step 2: Upload archive file directly to root
      setProcessStep("Uploading world archive...");
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("path", "/"); // Crucial: upload directly to server root

      await axios.post(`/api/servers/${serverId}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          }
        },
      });

      setUploadProgress(null);

      // Step 3: Extract archive and locate world structure
      setProcessStep("Scanning archive for Minecraft world structure (advancements, data, datapacks, region)...");
      const chosenName = targetFolderName.trim() || "world";

      const importRes = await axios.post(`/api/servers/${serverId}/world/import`, {
        zipPath: uploadFile.name,
        targetFolderName: chosenName,
        autoUpdateProperties,
      });

      setLastImportedFolder(importRes.data?.worldFolder || chosenName);
      showToast(
        importRes.data?.message || `World placed directly into '/${chosenName}' and zip file deleted!`,
        "success"
      );

      setUploadFile(null);
      await fetchWorldInfo();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || err.message || "Failed to process and import world.",
        "error"
      );
    } finally {
      setIsProcessing(false);
      setProcessStep("");
      setUploadProgress(null);
    }
  };

  const handleStopServer = async () => {
    try {
      await axios.post(`/api/servers/${serverId}/stop`);
      showToast("Stopping server...", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-6 sm:p-8 text-center text-slate-400 flex items-center justify-center gap-2 font-mono min-h-[250px]">
        <Loader2 className="w-5 h-5 animate-spin text-theme-400" />
        <span>Loading world data...</span>
      </div>
    );
  }

  const serverVersion = server?.version || "Unknown";
  const worldVersion = worldInfo?.worldVersion || "Unknown";
  const worldExists = worldInfo?.exists;

  let compatibilityStatus = "Unknown";
  let statusColor = "text-amber-400";
  let StatusIcon = Info;

  if (!worldExists) {
    compatibilityStatus = "No active world folder found. A new one will generate upon starting.";
    statusColor = "text-sky-400";
  } else if (worldVersion !== "Unknown" && serverVersion !== "Unknown") {
    const wvMatch = worldVersion.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    const svMatch = serverVersion.match(/(\d+)\.(\d+)(?:\.(\d+))?/);

    if (wvMatch && svMatch) {
      const wvMinor = parseInt(wvMatch[2]);
      const svMinor = parseInt(svMatch[2]);
      if (wvMinor === svMinor) {
        compatibilityStatus = "Compatible with current server version";
        statusColor = "text-emerald-400";
        StatusIcon = CheckCircle2;
      } else if (wvMinor < svMinor) {
        compatibilityStatus = "World is from an older version. Minecraft will automatically convert chunks upon startup.";
        statusColor = "text-amber-400";
        StatusIcon = AlertTriangle;
      } else {
        compatibilityStatus = "World is newer than current server software! Please upgrade your server version to prevent corruption.";
        statusColor = "text-rose-400";
        StatusIcon = XCircle;
      }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-3.5 sm:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold z-50 animate-in fade-in slide-in-from-bottom-5 border backdrop-blur-md ${
            toast.type === "error"
              ? "bg-rose-950/95 text-rose-200 border-rose-500/40"
              : "bg-emerald-950/95 text-emerald-200 border-emerald-500/40"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-white/5 sm:border-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white font-mono">
              World Manager
            </h2>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-theme-500/10 text-theme-400 border border-theme-500/20 font-mono font-medium">
              Direct Root Extraction
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Auto-detects world folders inside uploaded archives, places the world directly into the root File Manager, and removes the zip file.
          </p>
        </div>
        <button
          onClick={fetchWorldInfo}
          className="self-end sm:self-auto p-2 min-h-[38px] min-w-[38px] rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors flex items-center justify-center shrink-0"
          title="Refresh World Status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isServerRunning && (
        <div className="p-3 sm:p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm text-amber-200">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-snug">
              <strong>Server is Online:</strong> Server will stop automatically during import to prevent file lock conflicts.
            </span>
          </div>
          <button
            onClick={handleStopServer}
            className="self-end sm:self-auto px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[36px]"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop Server</span>
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Active World in Root */}
        <div className="qx-glass border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="font-semibold flex items-center text-white text-sm sm:text-base">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-theme-400 shrink-0" />
              <span>Active World in File Manager</span>
            </h3>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 gap-2">
                <span className="text-slate-400 font-mono">Folder Name in Root</span>
                <span className="font-bold text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-xs truncate max-w-[180px]">
                  /{worldInfo?.levelName || "world"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 gap-2">
                <span className="text-slate-400 font-mono">World Version</span>
                <span className="font-medium text-slate-200 font-mono text-xs truncate">
                  {worldVersion}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 gap-2">
                <span className="text-slate-400 font-mono">Server Version</span>
                <span className="font-medium text-slate-200 font-mono text-xs truncate">
                  {serverVersion}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 text-[11px] font-mono block mb-1.5 uppercase tracking-wider">
                  Compatibility Status
                </span>
                <div
                  className={`flex items-start space-x-2.5 ${statusColor} bg-black/40 p-2.5 sm:p-3 rounded-xl border border-white/10`}
                >
                  <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                    {compatibilityStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {lastImportedFolder && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2 mt-4">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Placed into <strong>/{lastImportedFolder}</strong>
                </span>
              </div>
              {onNavigateToFileManager && (
                <button
                  onClick={onNavigateToFileManager}
                  className="font-mono underline text-emerald-200 hover:text-white flex items-center gap-1 min-h-[32px] px-2 py-1 bg-emerald-500/10 rounded-lg shrink-0"
                >
                  <span>Open in Files</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Upload & Direct Root Placement */}
        <div className="qx-glass border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <h3 className="font-semibold flex items-center text-white text-sm sm:text-base">
            <Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-theme-400 shrink-0" />
            <span>Upload & Place World in Root</span>
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your archive (<code className="text-theme-300">world.zip</code> containing e.g. <code className="text-theme-300">jdj</code> with <code className="text-theme-300">region, data, datapacks, advancements</code>). The system automatically places the world directly into <code className="text-theme-300">/{targetFolderName || "world"}</code> and deletes the zip.
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono uppercase font-bold mb-1.5 text-slate-300">
                Select World Archive (.zip, .tar, .gz)
              </label>
              <input
                type="file"
                accept=".zip,.tar,.gz,.tgz"
                onChange={(e) => {
                  setUploadFile(e.target.files ? e.target.files[0] : null);
                  setUploadProgress(null);
                }}
                disabled={isProcessing}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs sm:text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:font-mono file:bg-theme-500 file:text-black hover:file:bg-theme-400 transition-all text-slate-200 cursor-pointer disabled:opacity-50 min-h-[44px]"
              />
            </div>

            {/* Target Folder Name Settings */}
            <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
              <label className="block text-xs font-mono font-bold text-slate-300">
                Destination Folder in Root File Manager:
              </label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-500 font-mono text-sm shrink-0">/</span>
                <input
                  type="text"
                  value={targetFolderName}
                  onChange={(e) => setTargetFolderName(e.target.value)}
                  disabled={isProcessing}
                  placeholder="world"
                  className="flex-1 min-w-0 bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-theme-400 disabled:opacity-50 min-h-[38px]"
                />
                <button
                  type="button"
                  onClick={() => setTargetFolderName("world")}
                  className="px-2.5 py-1.5 text-[11px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg transition-colors shrink-0 min-h-[38px]"
                  title="Reset to 'world'"
                >
                  world
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                All world files (<code className="text-theme-300">advancements, data, datapacks, region</code>) will be moved into this folder in root.
              </p>
            </div>

            {uploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Uploading World Archive...</span>
                  <span className="text-theme-400 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-theme-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {isProcessing && processStep && (
              <div className="p-3 rounded-xl bg-theme-500/10 border border-theme-500/20 text-xs font-mono text-theme-300 flex items-start gap-2 animate-pulse leading-tight">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-theme-400 mt-0.5" />
                <span className="break-words">{processStep}</span>
              </div>
            )}

            <button
              onClick={handleAutoImport}
              disabled={!uploadFile || isProcessing}
              className="w-full min-h-[44px] flex items-center justify-center px-4 py-2.5 bg-theme-500 hover:bg-theme-400 text-black font-mono font-bold rounded-xl transition-all shadow-lg shadow-theme-500/20 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Processing World...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Place World in Root & Remove Zip</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3 Step Visual Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start space-x-2.5">
          <FolderTree className="w-4 h-4 text-theme-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-snug">
            <span className="font-bold text-white font-mono block mb-0.5">1. Deep Auto-Detection</span>
            Recursively scans all archive levels to pinpoint the world folder with <code className="text-theme-300">region, data, datapacks, advancements</code>.
          </div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-snug">
            <span className="font-bold text-white font-mono block mb-0.5">2. Direct Root Placement</span>
            Places all contents directly inside <code className="text-emerald-300">/{targetFolderName || "world"}</code> in File Manager & sets <code className="text-emerald-300">level-name</code>.
          </div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start space-x-2.5">
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-snug">
            <span className="font-bold text-white font-mono block mb-0.5">3. Cleans Up Zip Archive</span>
            Deletes the uploaded <code className="text-rose-300">.zip</code> archive and temporary extraction folders immediately to keep disk clean.
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-2.5 sm:space-x-3 text-xs text-amber-200/80 leading-relaxed">
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300">Automatic Backup Protection:</strong> Before replacing world files, an automatic safety backup of your server is created in <code className="text-amber-300 font-mono">.data/backups/</code>.
        </div>
      </div>
    </div>
  );
}
