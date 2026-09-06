import React, { useState, useEffect } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import { Trash2, AlertTriangle, User, Save, Globe, RefreshCw, Sliders, Code2, TerminalSquare, Info, Lock } from "lucide-react";
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
  const [selectedType, setSelectedType] = useState((server?.type || "PAPER").toUpperCase());
  const [isChangingVersion, setIsChangingVersion] = useState(false);
  const [versionProgress, setVersionProgress] = useState(0);
  const [javaVersion, setJavaVersion] = useState(server?.javaVersion || "17");
  const [dockerImage, setDockerImage] = useState(server?.dockerImage || "");
  const [serverJar, setServerJar] = useState(server?.serverJar || "");
  const [startupCommand, setStartupCommand] = useState(server?.startupCommand || "");
  const [showDowngradeRestartPopup, setShowDowngradeRestartPopup] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isMigratingRuntime, setIsMigratingRuntime] = useState(false);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

    if ((user?.role === "admin" || user?.role === "owner")) {
      axios.get("/api/auth/users").then(res => {
        setUsers(res.data);
      }).catch(() => {});
    }
  }, [user, selectedType]);

  if (!server) return null;
  const canManage = (user?.role === "admin" || user?.role === "owner") || server.owner === user?.id;

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
    setIsChangingVersion(true);
    setVersionProgress(10);
    // Fake progress interval since server handles the real download synchronously for now
    // In a real app we'd use SSE or websockets to report download progress
    const interval = setInterval(() => {
        setVersionProgress(p => p < 90 ? p + 10 : p);
    }, 500);

    try {
      await axios.put(`/api/servers/${serverId}/version`, { version: selectedVersion, type: selectedType });
      setVersionProgress(100);
      setTimeout(() => {
         window.location.reload();
      }, 1000);
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to update version");
      setIsChangingVersion(false);
    } finally {
      clearInterval(interval);
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
          <div className="bg-black/60 backdrop-blur-2xl border border-border p-6 md:p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] ring-1 ring-border-subtle relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-theme-600/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-600 to-theme-500"></div>
            <div className="flex items-start mb-4">
              <div className="bg-theme-600/20 p-3 rounded-xl mr-4 text-theme-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Restart Required</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Restart the server to ensure files are processed correctly.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={handleDowngradeRestart}
                disabled={isRestarting}
                className="px-6 py-2.5 bg-theme-600 hover:bg-theme-500 text-black font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isRestarting ? "Restarting..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar text-foreground bg-transparent">
      <div className="max-w-3xl space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-2">Settings</h2>
          <p className="text-muted-foreground text-sm mb-6">Manage advanced configuration and dangerous actions for this unit.</p>
        </div>

        {canManage ? (
          <>

            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-foreground font-bold mb-2 flex items-center">
                <RefreshCw className={`w-5 h-5 mr-2 text-theme-500 ${isMigratingRuntime ? "animate-spin" : ""}`} /> Runtime Migration & Conversion
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Current execution runtime: <strong className="text-theme-400 uppercase font-mono">{server.runtimeType === 'local' ? 'Local Process' : 'Docker Container'}</strong>.
                <span className="text-zinc-400/80 block mt-1">
                  You can seamlessly switch this unit between Docker Container isolation and Node.js Local Process execution. Make sure the server is stopped before migrating.
                </span>
              </p>

              {migrationMessage && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium border ${migrationMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                  {migrationMessage.text}
                </div>
              )}
              
              <div className="space-y-3">
                {!showMigrateConfirm ? (
                  <button 
                    disabled={isMigratingRuntime}
                    onClick={() => setShowMigrateConfirm(true)}
                    className="bg-theme-600 hover:bg-theme-500 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 text-sm flex items-center gap-2 shadow-lg shadow-theme-600/20"
                  >
                    <RefreshCw className={`w-4 h-4 ${isMigratingRuntime ? "animate-spin" : ""}`} />
                    {isMigratingRuntime ? "Migrating Runtime..." : `Convert to ${server.runtimeType === 'local' ? 'Docker Container' : 'Local Process'}`}
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-theme-500/30 space-y-3">
                    <p className="text-sm text-zinc-200">
                      Convert this server to <strong className="text-theme-400">{server.runtimeType === 'local' ? 'Docker Container' : 'Local Process'}</strong>?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isMigratingRuntime}
                        onClick={async () => {
                          const target = server.runtimeType === 'local' ? 'docker' : 'local';
                          setIsMigratingRuntime(true);
                          setMigrationMessage(null);
                          setShowMigrateConfirm(false);
                          try {
                            const token = localStorage.getItem("jtg_token") || localStorage.getItem("token");
                            const headers: any = {};
                            if (token) headers["Authorization"] = `Bearer ${token}`;
                            const res = await axios.put(`/api/servers/${serverId}/migrate-runtime`, { targetRuntime: target }, { headers });
                            setMigrationMessage({
                              text: `Successfully converted runtime to ${target === 'local' ? 'Local Process' : 'Docker Container'}!`,
                              type: "success"
                            });
                            if (server) {
                              server.runtimeType = target;
                            }
                            setTimeout(() => {
                              window.location.reload();
                            }, 1000);
                          } catch (err: any) {
                            setMigrationMessage({
                              text: err.response?.data?.error || err.message || "Failed to migrate server runtime.",
                              type: "error"
                            });
                            setIsMigratingRuntime(false);
                          }
                        }}
                        className="bg-theme-600 hover:bg-theme-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                      >
                        {isMigratingRuntime ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                        Confirm Conversion
                      </button>
                      <button
                        disabled={isMigratingRuntime}
                        onClick={() => setShowMigrateConfirm(false)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            
            
            
            {/* RUNTIME CONFIGURATION */}
            {(() => {
              const upperType = (server?.type || "").toUpperCase();
              const isGeneric = ["NODEJS", "NODE", "PYTHON", "PYTHON3"].includes(upperType);
              const isNode = ["NODEJS", "NODE"].includes(upperType);
              const isPy = ["PYTHON", "PYTHON3"].includes(upperType);

              if (isGeneric) {
                return (
                  <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-theme-500 font-bold flex items-center gap-2">
                        {isNode ? <Code2 className="w-5 h-5 text-theme-500" /> : <TerminalSquare className="w-5 h-5 text-theme-500" />}
                        {isNode ? "Node.js Runtime Environment" : "Python Runtime Environment"}
                      </h3>
                      <span className="flex items-center gap-1.5 text-xs font-mono bg-white/10 text-white/90 px-2.5 py-1 rounded-full border border-white/10">
                        <Lock className="w-3 h-3 text-theme-400" /> Fixed Runtime
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      Dedicated standalone code runtime. Upload your project scripts, packages, and dependencies in the File Manager and start them in the Console.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Runtime Platform</label>
                        <div className="w-full bg-card/60 border border-border rounded-xl px-4 py-3 text-foreground font-mono text-sm flex items-center justify-between opacity-80 cursor-not-allowed">
                          <span>{isNode ? "Node.js (JavaScript / TypeScript)" : "Python (Python 3.x)"}</span>
                          <span className="text-xs text-muted-foreground">Fixed</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Runtime Version</label>
                        <SearchableDropdown
                          value={selectedVersion}
                          onChange={setSelectedVersion}
                          options={versions.map(v => ({ value: v, label: isNode ? `Node.js v${v}` : `Python ${v}` }))}
                          placeholder="Select Version"
                          searchPlaceholder="Search versions..."
                          disabled={isChangingVersion}
                          className="font-mono bg-card"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Startup Command</label>
                        <input
                          type="text"
                          value={startupCommand}
                          onChange={e => setStartupCommand(e.target.value)}
                          placeholder={isNode ? "e.g. node index.js or npm start" : "e.g. python3 -u main.py"}
                          disabled={isChangingVersion}
                          className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground font-mono mt-1.5">
                          {isNode ? "Leave empty to automatically execute index.js, app.js, or package.json start script." : "Leave empty to automatically execute main.py, app.py, or bot.py."}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Custom Docker Image (Optional)</label>
                        <input
                          type="text"
                          value={dockerImage}
                          onChange={e => setDockerImage(e.target.value)}
                          placeholder={isNode ? "node:20-alpine" : "python:3.11-slim"}
                          disabled={isChangingVersion}
                          className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={handleChangeVersion}
                        disabled={isChangingVersion}
                        className="px-6 py-3 bg-theme-600/10 hover:bg-theme-600/20 text-theme-600 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center min-w-[160px] justify-center h-[50px]"
                      >
                        {isChangingVersion ? "Updating..." : "Update Runtime"}
                      </button>
                    </div>

                    {isChangingVersion && (
                      <div className="mt-6 p-4 border border-zinc-800 bg-muted rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-theme-500">Updating runtime configuration...</span>
                          <span className="text-sm font-mono text-theme-500/80">{versionProgress}%</span>
                        </div>
                        <div className="w-full bg-zinc-800/50 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-theme-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${versionProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-30 group hover:bg-black/60 transition-colors mb-8">
                  <h3 className="text-theme-500 font-bold mb-2 flex items-center">
                    <Sliders className="w-5 h-5 mr-2" /> Minecraft Runtime
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Configure server software, Java version, and Docker image.
                    <span className="text-theme-500/80 block mt-1">
                      WARNING: The server MUST be stopped before changing the runtime. A backup will be created automatically.
                    </span>
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Software Type</label>
                      <select
                        value={selectedType}
                        onChange={e => setSelectedType(e.target.value)}
                        disabled={isChangingVersion}
                        className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none"
                      >
                        <option value="PAPER">Paper</option>
                        <option value="SPIGOT">Spigot</option>
                        <option value="FABRIC">Fabric</option>
                        <option value="FORGE">Forge</option>
                        <option value="BUNGEECORD">BungeeCord</option>
                        <option value="VELOCITY">Velocity</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Software Version</label>
                      <SearchableDropdown
                        value={selectedVersion}
                        onChange={setSelectedVersion}
                        options={versions.map(v => ({ value: v, label: v }))}
                        placeholder="Select Version"
                        searchPlaceholder="Search versions..."
                        disabled={isChangingVersion}
                        className="font-mono bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Java Version</label>
                      <select
                        value={javaVersion}
                        onChange={e => setJavaVersion(e.target.value)}
                        disabled={isChangingVersion}
                        className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none"
                      >
                        <option value="">Auto-detect</option>
                        <option value="8">Java 8</option>
                        <option value="11">Java 11</option>
                        <option value="16">Java 16</option>
                        <option value="17">Java 17</option>
                        <option value="21">Java 21</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Docker Image</label>
                      <input
                        type="text"
                        value={dockerImage}
                        onChange={e => setDockerImage(e.target.value)}
                        placeholder="e.g. ghcr.io/pterodactyl/yolks:java_17"
                        disabled={isChangingVersion}
                        className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Server JAR</label>
                      <input
                        type="text"
                        value={serverJar}
                        onChange={e => setServerJar(e.target.value)}
                        placeholder="e.g. server.jar"
                        disabled={isChangingVersion}
                        className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Startup Command</label>
                      <input
                        type="text"
                        value={startupCommand}
                        onChange={e => setStartupCommand(e.target.value)}
                        placeholder="e.g. java -Xms1G -Xmx4G -jar server.jar --nogui"
                        disabled={isChangingVersion}
                        className="w-full bg-card border border-border focus:border-theme-600 rounded-xl px-4 py-3 text-foreground transition-all outline-none font-mono text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button 
                      onClick={handleChangeVersion}
                      disabled={isChangingVersion}
                      className="px-6 py-3 bg-theme-600/10 hover:bg-theme-600/20 text-theme-600 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center min-w-[160px] justify-center h-[50px]"
                    >
                      {isChangingVersion ? "Updating..." : "Update Runtime"}
                    </button>
                  </div>
                  {isChangingVersion && (
                    <div className="mt-6 p-4 border border-zinc-800 bg-muted rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-theme-500">Updating runtime configuration...</span>
                        <span className="text-sm font-mono text-theme-500/80">{versionProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-theme-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${versionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
<div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-20 group hover:bg-black/60 transition-colors mb-8">
              <h3 className="text-theme-500 font-bold mb-2 flex items-center">
                <Globe className="w-5 h-5 mr-2" /> Server IP Alias
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Set a custom domain or IP to display on the console page.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={ipAlias} 
                    onChange={e => setIpAlias(e.target.value)} 
                    placeholder="e.g. play.example.com"
                    className="w-full bg-card border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2 text-foreground transition-all shadow-inner outline-none font-mono"
                  />
                </div>
                <button 
                  onClick={handleUpdateIpAlias}
                  disabled={isSavingAlias || ipAlias === (server.ipAlias || "")}
                  className="px-6 py-2 bg-theme-600/10 hover:bg-theme-600/20 text-theme-500 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" /> Save
                </button>
              </div>
            </div>

            {(user?.role === "admin" || user?.role === "owner") ? (
              <>

                <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-6 md:p-8 rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative z-10 group hover:bg-black/60 transition-colors">
                  <h3 className="text-theme-500 font-bold mb-2 flex items-center">
                    <User className="w-5 h-5 mr-2" /> Server Ownership
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
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
                        className="bg-card"
                      />
                    </div>
                    <button 
                      onClick={handleUpdateOwner}
                      disabled={isSaving || owner === server.owner}
                      className="px-6 py-2 bg-theme-600/10 hover:bg-theme-600/20 text-theme-500 font-medium rounded-xl border border-theme-600/20 transition-all disabled:opacity-50 flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : (
           <div className="text-muted-foreground text-sm p-4 bg-muted rounded-xl border border-border-subtle">
             You do not have permission to manage this server's settings.
           </div>
        )}
      </div>
          {(isDeletingAction || isSaving || isSavingAlias || isChangingVersion || isRestarting) && <LoadingOverlay />}
    </div>
    </>
  );
}
