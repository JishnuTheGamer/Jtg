// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Globe, Play, Square, Loader2, Link as LinkIcon, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

export default function PlayitTunnel({ serverId }: { serverId: string }) {
  const [status, setStatus] = useState<"running" | "stopped" | "checking">("checking");
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverRuntimeType, setServerRuntimeType] = useState<string>("docker");

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const serverRes = await axios.get(`/api/servers/${serverId}`);
      setServerRuntimeType(serverRes.data.runtimeType || "docker");
      const res = await axios.get(`/api/servers/${serverId}/playit`);
      setStatus(res.data.status);
      setClaimLink(res.data.claimLink || null);
      if (res.data.logs !== undefined) {
        setLogs(res.data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch Playit status", e);
    }
  };

  const generateTunnel = async () => {
    setIsProcessing(true);
    setLogs("");
    setClaimLink(null);
    try {
      await axios.post(`/api/servers/${serverId}/playit/start`);
      setStatus("running");
      fetchStatus();
    } catch (e) {
      console.error("Failed to start tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const stopTunnel = async () => {
    setIsProcessing(true);
    try {
      await axios.post(`/api/servers/${serverId}/playit/stop`);
      setStatus("stopped");
      setClaimLink(null);
      setLogs("");
      fetchStatus();
    } catch (e) {
      console.error("Failed to stop tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTunnel = async () => {
    setShowResetConfirm(false);
    setIsProcessing(true);
    setLogs("");
    setClaimLink(null);
    try {
      await axios.post(`/api/servers/${serverId}/playit/reset`);
      await axios.post(`/api/servers/${serverId}/playit/start`);
      setStatus("running");
      fetchStatus();
    } catch (e) {
      console.error("Failed to reset tunnel", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 h-full overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Globe className="w-6 h-6 text-theme-500" />
            Playit Tunnel
          </h1>
          <p className="text-muted-foreground">
            Generate and manage your global Playit tunnel to expose services directly from the panel.
          </p>
        </div>

        {serverRuntimeType === 'local' ? (
          <div className="bg-theme-600/10 border border-theme-600/30 rounded-xl p-6 mb-6">
            <h3 className="text-theme-600 font-bold mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5" /> Local Node (Beta Version)
            </h3>
            <p className="text-theme-600/80 text-sm">Playit Tunnel integration for Local Process servers is currently in beta testing.</p>
          </div>
        ) : null}
        <div className={`bg-muted-subtle border border-border-subtle rounded-xl p-6 shadow-sm ${serverRuntimeType === 'local' ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Tunnel Status</h2>
              <div className="flex items-center gap-2">
                {status === "checking" ? (
                  <><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /><span className="text-muted-foreground">Checking...</span></>
                ) : status === "running" ? (
                  <><span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-theme-600"></span></span><span className="text-theme-500 font-medium">Running</span></>
                ) : (
                  <><span className="flex h-2.5 w-2.5 relative"><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-600"></span></span><span className="text-muted-foreground font-medium">Stopped</span></>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {status !== "running" ? (
                <button 
                  onClick={generateTunnel}
                  disabled={isProcessing || status === "checking"}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-theme-600 hover:bg-theme-700 text-foreground font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Generate Tunnel</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={stopTunnel}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-theme-500/10 hover:bg-theme-500/20 text-theme-500 border border-theme-500/20 font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    <span>Stop Tunnel</span>
                  </button>
                  <button 
                    onClick={generateTunnel}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Restart</span>
                  </button>
                  {!showResetConfirm ? (
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isProcessing}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-theme-600/10 hover:bg-theme-600/20 text-theme-600 border border-theme-600/20 font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>Reset Agent</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-theme-600/10 border border-theme-600/30 px-3 py-1.5 rounded-lg text-xs">
                      <span className="text-theme-400">Reset agent & IP?</span>
                      <button
                        onClick={resetTunnel}
                        disabled={isProcessing}
                        className="bg-theme-600 hover:bg-theme-500 text-white font-bold px-2 py-1 rounded text-xs transition-all active:scale-95"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="bg-muted hover:bg-muted-hover text-muted-foreground px-2 py-1 rounded text-xs transition-all"
                      >
                        No
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {claimLink && (
            <div className="mt-6 p-4 bg-theme-600/10 border border-theme-600/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-theme-500 font-semibold mb-1 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Claim Link Generated
                </h3>
                <p className="text-sm text-theme-500/80">Click the link to add this agent to your Playit.gg account.</p>
              </div>
              <a 
                href={claimLink} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-theme-600 text-foreground font-medium rounded-lg text-sm hover:bg-theme-700 transition-colors shrink-0 text-center shadow-sm"
              >
                Claim Agent
              </a>
            </div>
          )}
        </div>

        <div className="bg-card border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            Terminal Output
          </h3>
          <div className="flex-1 bg-background rounded-lg p-3 font-mono text-[13px] text-foreground-muted overflow-y-auto whitespace-pre-wrap border border-border-subtle">
            {logs || "Waiting for output..."}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
