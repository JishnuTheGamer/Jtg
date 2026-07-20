import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Network, Copy, Check, Key, RefreshCw, Eye, EyeOff, AlertTriangle, ShieldCheck } from "lucide-react";
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
      await axios.post(`/api/servers/${serverId}/sftp/create`);
      await fetchSftpInfo();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to create SFTP account");
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!confirm("Are you sure you want to reset the SFTP password? The old password will immediately become invalid.")) return;
    
    try {
      setIsResetting(true);
      await axios.post(`/api/servers/${serverId}/sftp/reset-password`);
      await fetchSftpInfo();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Network className="w-6 h-6 mr-3 text-indigo-400" />
            SFTP Details
          </h2>
          <p className="text-zinc-400">Manage your secure file transfer protocol (SFTP) access credentials.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start text-red-400">
            <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!sftpInfo ? (
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/20">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No SFTP Account Found</h3>
            <p className="text-zinc-400 max-w-md mb-6">
              An SFTP account has not been provisioned for this server yet. Create one now to securely manage your server files.
            </p>
            <button
              onClick={createSftpAccount}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
              Generate SFTP Credentials
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                  <Key className="w-5 h-5 mr-2 text-indigo-400" /> Connection Info
                </h3>
                
                <div className="space-y-5 relative z-10">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Host</label>
                    <div className="flex">
                      <div className="flex-1 bg-black/40 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm text-zinc-200 truncate">
                        {sftpInfo.host}
                      </div>
                      <button 
                        onClick={() => handleCopy(sftpInfo.host, 'host')}
                        className="px-4 bg-white/5 border border-white/10 rounded-r-xl hover:bg-white/10 transition-colors flex items-center justify-center"
                      >
                        {copiedField === 'host' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Port</label>
                    <div className="flex">
                      <div className="flex-1 bg-black/40 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm text-zinc-200">
                        {sftpInfo.port}
                      </div>
                      <button 
                        onClick={() => handleCopy(sftpInfo.port.toString(), 'port')}
                        className="px-4 bg-white/5 border border-white/10 rounded-r-xl hover:bg-white/10 transition-colors flex items-center justify-center"
                      >
                        {copiedField === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Username</label>
                    <div className="flex">
                      <div className="flex-1 bg-black/40 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm text-zinc-200 truncate">
                        {sftpInfo.username}
                      </div>
                      <button 
                        onClick={() => handleCopy(sftpInfo.username, 'username')}
                        className="px-4 bg-white/5 border border-white/10 rounded-r-xl hover:bg-white/10 transition-colors flex items-center justify-center"
                      >
                        {copiedField === 'username' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="flex">
                      <div className={`flex-1 bg-black/40 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 font-mono text-sm truncate ${sftpInfo.password.startsWith("(Hidden") ? "text-zinc-500 italic" : "text-zinc-200"}`}>
                        {sftpInfo.password.startsWith("(Hidden") ? sftpInfo.password : (showPassword ? sftpInfo.password : "••••••••••••••••")}
                      </div>
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={sftpInfo.password.startsWith("(Hidden")}
                        className="px-4 bg-white/5 border border-white/10 border-r-0 hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
                      </button>
                      <button 
                        onClick={() => handleCopy(sftpInfo.password, 'password')}
                        disabled={sftpInfo.password.startsWith("(Hidden")}
                        className="px-4 bg-white/5 border border-white/10 rounded-r-xl hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {copiedField === 'password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
                <h3 className="text-orange-400 font-bold mb-2 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" /> Security
                </h3>
                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
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
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">How to connect</h3>
                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <p>
                    You can connect to your server's files using an SFTP client such as <a href="https://filezilla-project.org/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">FileZilla</a>, <a href="https://winscp.net/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">WinSCP</a>, or <a href="https://cyberduck.io/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Cyberduck</a>.
                  </p>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                    <p className="font-semibold text-zinc-300 mb-2">Quick steps:</p>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>Open your preferred SFTP client.</li>
                      <li>Copy and paste the <strong>Host</strong> and <strong>Port</strong>.</li>
                      <li>Enter your generated <strong>Username</strong>.</li>
                      <li>Copy the <strong>Password</strong> and paste it into the password field.</li>
                      <li>Click Connect. You may be asked to trust the host key on your first connection.</li>
                    </ol>
                  </div>
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-indigo-200/70">
                    <strong className="text-indigo-400">Note:</strong> Your SFTP access is isolated. You can only view and modify files within this specific server's directory.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {isResetting && <LoadingOverlay message="Resetting SFTP credentials..." />}
    </div>
  );
}
