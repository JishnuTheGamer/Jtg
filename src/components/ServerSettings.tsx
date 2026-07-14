import React, { useState, useEffect } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import { Trash2, AlertTriangle, User, Save, Globe } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchableDropdown from "./SearchableDropdown";

export default function ServerSettings({ serverId, server }: { serverId: string, server: any }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAction, setIsDeletingAction] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [owner, setOwner] = useState(server?.owner || "");
  const [ipAlias, setIpAlias] = useState(server?.ipAlias || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(server?.version || "");
  const [selectedType, setSelectedType] = useState(server?.type || "PAPER");
  const [isChangingVersion, setIsChangingVersion] = useState(false);
  const [versionProgress, setVersionProgress] = useState(0);
  const [showDowngradeRestartPopup, setShowDowngradeRestartPopup] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    // Fetch software versions
    axios.get(`/api/system/versions?type=${selectedType}`).then((res) => {
      if (Array.isArray(res.data)) {
        setVersions(res.data);
        if (!res.data.includes(selectedVersion)) {
          setSelectedVersion(res.data[0]);
        }
      } else {
        setVersions([]);
      }
    }).catch(() => {});

    if (user?.role === "admin") {
      axios.get("/api/auth/users").then(res => {
        setUsers(res.data);
      }).catch(() => {});
    }
  }, [user, selectedType]);

  if (!server) return null;
  const canManage = user?.role === "admin" || server.owner === user?.id;

  const handleDelete = async () => {
    try {
      setIsDeletingAction(true);
      await axios.delete(`/api/servers/${serverId}`);
      navigate("/servers");
    } catch(e) {
      alert("Failed to delete server");
      setIsDeletingAction(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangeVersion = async () => {
    try {
      setIsChangingVersion(true);
      setVersionProgress(0);
      
      // Simulate progress up to 90%
      const interval = setInterval(() => {
        setVersionProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      await axios.put(`/api/servers/${serverId}/version`, { version: selectedVersion, type: selectedType });
      clearInterval(interval);
      setVersionProgress(100);
      
      setTimeout(() => {
        setShowDowngradeRestartPopup(true);
        setIsChangingVersion(false);
        setVersionProgress(0);
      }, 500);
    } catch(e: any) {
      alert(e.response?.data?.error || "Failed to update server version. Ensure the server is stopped.");
      setIsChangingVersion(false);
      setVersionProgress(0);
    }
  };

  const handleDowngradeRestart = async () => {
    try {
      setIsRestarting(true);
      await axios.post(`/api/servers/${serverId}/restart`);
      setShowDowngradeRestartPopup(false);
    } catch (e: any) {
      alert("Failed to restart server: " + (e.response?.data?.error || e.message));
    } finally {
      setIsRestarting(false);
    }
  };

  const handleUpdateOwner = async () => {
    try {
      setIsSaving(true);
      await axios.put(`/api/servers/${serverId}/owner`, { owner });
      alert("Owner updated successfully");
    } catch(e) {
      alert("Failed to update owner");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateIpAlias = async () => {
    try {
      setIsSavingAlias(true);
      await axios.put(`/api/servers/${serverId}/ipalias`, { ipAlias });
      alert("IP Alias updated successfully");
    } catch(e) {
      alert("Failed to update IP Alias");
    } finally {
      setIsSavingAlias(false);
    }
  };

  return (
    <>
      {showDowngradeRestartPopup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-600 to-amber-400"></div>
            <div className="flex items-start mb-4">
              <div className="bg-amber-500/20 p-3 rounded-xl mr-4 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Restart Required</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Restart the server to ensure files are processed correctly.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={handleDowngradeRestart}
                disabled={isRestarting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isRestarting ? "Restarting..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar text-white bg-transparent">
      <div className="max-w-3xl space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-2">Settings</h2>
          <p className="text-zinc-400 text-sm mb-6">Manage advanced configuration and dangerous actions for this unit.</p>
        </div>

        {canManage ? (
          <>
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative z-30 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-amber-400 font-bold mb-2 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" /> Change Server Version
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Update the server version (server.jar). 
                <span className="text-amber-400/80 block mt-1">
                  WARNING: The server MUST be stopped before changing the version. Do this at your own risk. Your world backup might be affected. If you have not taken a backup, please take a backup first. Changing the version will delete the old server.jar and download the new one.
                </span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Software Type</label>
                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    disabled={isChangingVersion}
                    className="w-full bg-[#0a0a0c] border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                  >
                    <option value="PAPER">Paper (Performance Minecraft)</option>
                    <option value="VELOCITY">Velocity (Proxy)</option>
                    <option value="BUNGEECORD">BungeeCord (Proxy)</option>
                    <option value="FORGE">Forge (Modded)</option>
                    <option value="FABRIC">Fabric (Modded)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Software Version</label>
                  <SearchableDropdown
                    value={selectedVersion}
                    onChange={setSelectedVersion}
                    options={versions.map(v => ({ value: v, label: v }))}
                    placeholder="Select Version"
                    searchPlaceholder="Search versions..."
                    disabled={isChangingVersion}
                    className="font-mono bg-[#0a0a0c]"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleChangeVersion}
                    disabled={isChangingVersion || (selectedVersion === server.version && selectedType === server.type)}
                    className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium rounded-xl border border-amber-500/20 transition-all disabled:opacity-50 flex items-center min-w-[160px] justify-center h-[50px]"
                  >
                    {isChangingVersion ? "Updating..." : "Update Server"}
                  </button>
                </div>
              </div>

              {isChangingVersion && (
                <div className="mt-6 p-4 border border-zinc-800 bg-black/20 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-amber-400">Downloading {selectedVersion} and recreating server...</span>
                        <span className="text-sm font-mono text-amber-400/80">{versionProgress}% downloading</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-2.5 overflow-hidden">
                        <div 
                           className="bg-amber-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                           style={{ width: `${versionProgress}%` }}
                        ></div>
                    </div>
                </div>
              )}
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative z-20 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-indigo-400 font-bold mb-2 flex items-center">
                <Globe className="w-5 h-5 mr-2" /> Server IP Alias
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Set a custom domain or IP to display on the console page.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={ipAlias} 
                    onChange={e => setIpAlias(e.target.value)} 
                    placeholder="e.g. play.example.com"
                    className="w-full bg-[#0a0a0c] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2 text-white transition-all shadow-inner outline-none font-mono"
                  />
                </div>
                <button 
                  onClick={handleUpdateIpAlias}
                  disabled={isSavingAlias || ipAlias === (server.ipAlias || "")}
                  className="px-6 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium rounded-xl border border-indigo-500/20 transition-all disabled:opacity-50 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" /> Save
                </button>
              </div>
            </div>

            {user?.role === "admin" ? (
              <>

                <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative z-10 group hover:bg-black/60 transition-colors">
                  <h3 className="text-indigo-400 font-bold mb-2 flex items-center">
                    <User className="w-5 h-5 mr-2" /> Server Ownership
                  </h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Transfer the ownership of this server to another user.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <SearchableDropdown
                        value={owner}
                        onChange={setOwner}
                        options={users.map(u => ({ value: u.id, label: `${u.username} (${u.role})` }))}
                        placeholder="Select an owner..."
                        searchPlaceholder="Search users..."
                        className="bg-[#0a0a0c]"
                      />
                    </div>
                    <button 
                      onClick={handleUpdateOwner}
                      disabled={isSaving || owner === server.owner}
                      className="px-6 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium rounded-xl border border-indigo-500/20 transition-all disabled:opacity-50 flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                  </div>
                </div>

                <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6 mt-8">
                  <h3 className="text-red-400 font-bold mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" /> Danger Zone
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6">
                    Permanently delete this server instance and all of its data. This action cannot be undone.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-xl border border-red-500/20 transition-all flex items-center shadow-sm hover:shadow-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Server
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                       <span className="text-red-400 font-medium text-sm">Are you absolutely sure?</span>
                       <div className="flex space-x-2">
                         <button 
                           onClick={handleDelete}
                           className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors text-sm shadow-md"
                         >
                           Yes, Delete
                         </button>
                         <button 
                           onClick={() => setShowDeleteConfirm(false)}
                           className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors text-sm"
                         >
                           Cancel
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-sm p-4 bg-white/5 rounded-xl border border-white/5">
                Contact an administrator to manage advanced server settings or to request server deletion.
              </div>
            )}
          </>
        ) : (
           <div className="text-zinc-500 text-sm p-4 bg-white/5 rounded-xl border border-white/5">
             You do not have permission to manage this server's settings.
           </div>
        )}
      </div>
          {(isDeletingAction || isSaving || isSavingAlias || isChangingVersion || isRestarting) && <LoadingOverlay />}
    </div>
    </>
  );
}
