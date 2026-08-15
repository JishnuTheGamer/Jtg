import React, { useState, useEffect } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Network, Copy, Check, Key, RefreshCw, Eye, EyeOff, AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import { LoadingOverlay } from "./LoadingOverlay";

export default function ServerSFTP({ serverId, server }: { serverId: string, server: any }) {
  const [sftpInfo, setSftpInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchSftpInfo();
  }, [serverId]);

  const fetchSftpInfo = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/servers/${serverId}/sftp`);
      setSftpInfo(res.data);
      setError(null);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setSftpInfo(null);
      } else {
        setError("Failed to fetch SFTP details. The SFTP service might be unavailable.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const createSftpAccount = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`/api/servers/${serverId}/sftp/create`);
      setSftpInfo(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to create SFTP account");
    } finally {
      setLoading(false);
    }
  };

  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const executeResetPassword = async () => {
    try {
      setIsResetting(true);
      setShowConfirmReset(false);
      const res = await axios.post(`/api/servers/${serverId}/sftp/reset-password`);
      setSftpInfo(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const resetPassword = () => {
    setShowConfirmReset(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-theme-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center">
            <Network className="w-6 h-6 mr-3 text-theme-500" />
            SFTP Details
          </h2>
          <p className="text-muted-foreground">Manage your secure file transfer protocol (SFTP) access credentials.</p>
        </div>

        {error && (
          <div className="p-4 bg-theme-500/10 border border-theme-500/20 rounded-xl flex items-start text-theme-400">
            <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!sftpInfo ? (
          <div className="qx-glass border border-border-subtle p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-theme-600/10 rounded-2xl flex items-center justify-center mb-4 border border-theme-600/20">
              <ShieldCheck className="w-8 h-8 text-theme-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No SFTP Account Found</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              An SFTP account has not been provisioned for this server yet. Create one now to securely manage your server files.
            </p>
            <button
              onClick={createSftpAccount}
              className="px-6 py-3 bg-theme-600 hover:bg-theme-700 text-foreground font-bold rounded-xl transition-colors shadow-lg shadow-theme-600/20"
            >
              Generate SFTP Credentials
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="qx-glass border border-border-subtle rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-theme-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center">
                  <Key className="w-5 h-5 mr-2 text-theme-500" /> Connection Info
                </h3>
                
                <div className="space-y-5 relative z-10">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Host</label>
                    <div className="flex">
                      <div className="flex-1 bg-muted border border-border border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm text-foreground-muted truncate">
                        {sftpInfo.host}
                      </div>
                      <button 
                        onClick={() => handleCopy(sftpInfo.host, 'host')}
                        className="px-4 bg-muted border border-border rounded-r-xl hover:bg-muted-hover transition-colors flex items-center justify-center"
                      >
                        {copiedField === 'host' ? <Check className="w-4 h-4 text-theme-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Port</label>
                    <div className="flex">
                      <div className="flex-1 bg-muted border border-border border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm text-foreground-muted">
                        {sftpInfo.port}
                      </div>
                      <button 
                        onClick={() => handleCopy(sftpInfo.port.toString(), 'port')}
                        className="px-4 bg-muted border border-border rounded-r-xl hover:bg-muted-hover transition-colors flex items-center justify-center"
                      >
                        {copiedField === 'port' ? <Check className="w-4 h-4 text-theme-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Username</label>
                    <div className="flex">
                      <div className="flex-1 bg-muted border border-border border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm text-foreground-muted truncate">
                        {sftpInfo.username}
                      </div>
                      <button 
                        onClick={() => handleCopy(sftpInfo.username, 'username')}
                        className="px-4 bg-muted border border-border rounded-r-xl hover:bg-muted-hover transition-colors flex items-center justify-center"
                      >
                        {copiedField === 'username' ? <Check className="w-4 h-4 text-theme-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password</label>
                    {sftpInfo.password.startsWith("(Hidden") ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 font-mono text-sm text-muted-foreground italic flex items-center justify-between">
                          <span>••••••••••••••••</span>
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <button
                          onClick={resetPassword}
                          disabled={isResetting}
                          className="px-5 py-3 bg-theme-600 hover:bg-theme-700 text-foreground font-bold rounded-xl transition-colors shadow-lg shadow-theme-600/20 flex items-center justify-center shrink-0 disabled:opacity-50"
                        >
                          {isResetting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                          Generate Password
                        </button>
                      </div>
                    ) : (
                      <div className="flex">
                        <div className="flex-1 bg-muted border border-border border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm truncate text-theme-500 font-bold bg-theme-600/5">
                          {showPassword ? sftpInfo.password : "••••••••••••••••"}
                        </div>
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="px-4 bg-muted border border-theme-600/20 border-r-0 hover:bg-muted-hover transition-colors flex items-center justify-center text-theme-500"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleCopy(sftpInfo.password, 'password')}
                          className="px-4 bg-theme-600/10 border border-theme-600/20 rounded-r-xl hover:bg-theme-600/20 transition-colors flex items-center justify-center text-theme-500"
                        >
                          {copiedField === 'password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    {sftpInfo.password.startsWith("(Hidden") && (
                      <p className="text-[11px] text-muted-foreground mt-2 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> For security, passwords are not stored. Generate a new one to connect.
                      </p>
                    )}
                    {!sftpInfo.password.startsWith("(Hidden") && (
                      <p className="text-[11px] text-theme-600/80 mt-2 flex items-center">
                        <Check className="w-3 h-3 mr-1" /> Password generated successfully. Copy it now, it won't be shown again.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
                <h3 className="text-orange-400 font-bold mb-2 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" /> Security
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  If you believe your SFTP credentials have been compromised, you can generate a new secure password. This will immediately disconnect any active sessions.
                </p>
                <button
                  onClick={resetPassword}
                  disabled={isResetting}
                  className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  {isResetting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Reset Password
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="qx-glass border border-border-subtle rounded-2xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">How to connect</h3>
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    You can connect to your server's files using an SFTP client such as <a href="https://filezilla-project.org/" target="_blank" rel="noreferrer" className="text-theme-500 hover:underline">FileZilla</a>, <a href="https://winscp.net/" target="_blank" rel="noreferrer" className="text-theme-500 hover:underline">WinSCP</a>, or <a href="https://cyberduck.io/" target="_blank" rel="noreferrer" className="text-theme-500 hover:underline">Cyberduck</a>.
                  </p>
                  <div className="p-4 bg-black/40 dark:bg-black/40 border border-border-subtle rounded-xl">
                    <p className="font-semibold text-foreground-muted mb-2">Quick steps:</p>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Open your preferred SFTP client.</li>
                      <li>Copy and paste the <strong>Host</strong> and <strong>Port</strong>.</li>
                      <li>Enter your generated <strong>Username</strong>.</li>
                      <li>Copy the <strong>Password</strong> and paste it into the password field.</li>
                      <li>Click Connect. You may be asked to trust the host key on your first connection.</li>
                    </ol>
                  </div>
                  <div className="p-4 bg-theme-600/5 border border-theme-600/20 rounded-xl text-theme-200/70">
                    <strong className="text-theme-500">Note:</strong> Your SFTP access is isolated. You can only view and modify files within this specific server's directory.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {isResetting && <LoadingOverlay message="Resetting SFTP credentials..." />}
      
      <AnimatePresence>
        {showConfirmReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#121214] border border-orange-500/30 shadow-2xl shadow-orange-500/10 rounded-2xl p-6 max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-theme-500" />
              <div className="flex items-start mb-4">
                <div className="bg-orange-500/10 p-3 rounded-full mr-4">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Reset SFTP Password</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Are you sure you want to reset your SFTP password? The old password will immediately become invalid and any active sessions will be disconnected.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted-hover text-foreground font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeResetPassword}
                  className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-bold rounded-xl transition-colors border border-orange-500/30"
                >
                  Reset Password
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
