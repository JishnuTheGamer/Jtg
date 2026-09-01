// @ts-nocheck
// @ts-nocheck
import AdminControls from '../components/AdminControls';
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import PageHeader from "../components/PageHeader";
import { motion } from "framer-motion";
import { Shield, User, Trash2, Layout, Upload, RefreshCw, Key, CheckCircle2, AlertCircle, Globe, Sparkles, ExternalLink, Cpu, Image, Settings } from "lucide-react";
import { ImageCropper } from "../components/ImageCropper";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { initializeApp, deleteApp, getApps } from "firebase/app";




export default function AccountPage(): React.ReactElement {
  const { user, logout, updateUser } = useAuth();
  const { 
    panelName, panelLogo, panelBackgroundImage, panelBackgroundBlur, 
    enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme, 
    enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, 
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId, defaultRuntime, 
    fetchSettings 
  } = useSettings();
  
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  // Username Change State
  const [newCustomUsername, setNewCustomUsername] = useState(user?.username || "");
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (user?.username) {
      setNewCustomUsername(user.username);
    }
  }, [user?.username]);

  const isDevPort3000 = true; // Enabled for port 3000, port 6767, and all production environments

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomUsername || newCustomUsername.trim().length < 3) {
      setUsernameMsg({ text: "Username must be at least 3 characters", type: "error" });
      return;
    }
    setIsChangingUsername(true);
    setUsernameMsg(null);
    try {
      const res = await axios.put("/api/auth/username", { newUsername: newCustomUsername.trim() });
      if (updateUser) {
        updateUser({ username: res.data.username });
      }
      setUsernameMsg({ text: "Username updated successfully!", type: "success" });
      if ((user.role === "admin" || user.role === "owner")) {
        fetchUsers();
      }
    } catch (err: any) {
      setUsernameMsg({ text: err.response?.data?.error || "Failed to update username", type: "error" });
    } finally {
      setIsChangingUsername(false);
    }
  };
  const [newPanelName, setNewPanelName] = useState(panelName);
  const [newEnablePlayit, setNewEnablePlayit] = useState(enablePlayit);
  const [newEnableTutorial, setNewEnableTutorial] = useState(enableTutorial);
  const [newEnableLoginAnimation, setNewEnableLoginAnimation] = useState(enableLoginAnimation);
  const [newEnableRegistration, setNewEnableRegistration] = useState(enableRegistration);
  const [newTheme, setNewTheme] = useState(theme);
  const [newDefaultRuntime, setNewDefaultRuntime] = useState(defaultRuntime || 'docker');

  // Firebase Config Local State
  const [fbEnableGoogleLogin, setFbEnableGoogleLogin] = useState<boolean>(enableGoogleLogin || false);
  const [fbApiKey, setFbApiKey] = useState<string>(firebaseApiKey || "");
  const [fbAuthDomain, setFbAuthDomain] = useState<string>(firebaseAuthDomain || "");
  const [fbProjectId, setFbProjectId] = useState<string>(firebaseProjectId || "");
  const [fbStorageBucket, setFbStorageBucket] = useState<string>(firebaseStorageBucket || "");
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState<string>(firebaseMessagingSenderId || "");
  const [fbAppId, setFbAppId] = useState<string>(firebaseAppId || "");
  const [isSavingFirebase, setIsSavingFirebase] = useState(false);
  const [fbStatusMsg, setFbStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppingType, setCroppingType] = useState<"logo" | "background" | null>(null);
  const [bgAspectRatio, setBgAspectRatio] = useState<number>(16/9);
  const [tempBgBlur, setTempBgBlur] = useState<number>(10);
  const [customBgUrlInput, setCustomBgUrlInput] = useState<string>("");
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [adminUserNewPassword, setAdminUserNewPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpdatingSystem, setIsUpdatingSystem] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSystemUpdate = async () => {
    try {
      setIsUpdatingSystem(true);
      await axios.post("/api/system/update");
      setIsUpdatingSystem(false);
    } catch (e) {
      alert("Failed to update system. Please check logs.");
      setIsUpdatingSystem(false);
    }
  };

  useEffect(() => {
    setNewPanelName(panelName);
    setNewEnablePlayit(enablePlayit);
    setNewEnableTutorial(enableTutorial);
    setNewEnableLoginAnimation(enableLoginAnimation);
    setNewEnableRegistration(enableRegistration);
    setNewTheme(theme);
    setFbEnableGoogleLogin(enableGoogleLogin || false);
    setFbApiKey(firebaseApiKey || "");
    setFbAuthDomain(firebaseAuthDomain || "");
    setFbProjectId(firebaseProjectId || "");
    setFbStorageBucket(firebaseStorageBucket || "");
    setFbMessagingSenderId(firebaseMessagingSenderId || "");
    setFbAppId(firebaseAppId || "");
    setCustomBgUrlInput(panelBackgroundImage || "");
    setNewDefaultRuntime(defaultRuntime || 'docker');
  }, [defaultRuntime, panelName, panelBackgroundImage, enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme, enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId]);

  const handleSaveFirebaseSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingFirebase(true);
    setFbStatusMsg(null);
    try {
      await axios.put("/api/system/settings", {
        enableGoogleLogin: fbEnableGoogleLogin,
        firebaseApiKey: fbApiKey,
        firebaseAuthDomain: fbAuthDomain,
        firebaseProjectId: fbProjectId,
        firebaseStorageBucket: fbStorageBucket,
        firebaseMessagingSenderId: fbMessagingSenderId,
        firebaseAppId: fbAppId
      });
      await fetchSettings();
      setFbStatusMsg({ text: "Firebase & Google Login settings saved successfully!", type: "success" });
    } catch (err: any) {
      setFbStatusMsg({ text: err.response?.data?.error || "Failed to save Firebase config", type: "error" });
    } finally {
      setIsSavingFirebase(false);
    }
  };

  const handleTestFirebaseConfig = async () => {
    setFbStatusMsg(null);
    if (!fbApiKey || !fbProjectId) {
      setFbStatusMsg({ text: "Please enter at least API Key and Project ID to test.", type: "error" });
      return;
    }
    try {
      const testAppName = "test-fb-app-" + Date.now();
      const testApp = initializeApp({
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        projectId: fbProjectId,
        storageBucket: fbStorageBucket,
        messagingSenderId: fbMessagingSenderId,
        appId: fbAppId
      }, testAppName);
      
      await deleteApp(testApp);
      setFbStatusMsg({ text: "Firebase Configuration verified valid!", type: "success" });
    } catch (err: any) {
      setFbStatusMsg({ text: "Firebase config error: " + (err.message || String(err)), type: "error" });
    }
  };

  const fetchUsers = async () => {
    if (user.role !== "admin") return;
    try {
      const res = await axios.get("/api/system/users");
      setUsers(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUsers();
    if (panelBackgroundBlur !== undefined) setTempBgBlur(panelBackgroundBlur);
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "background" = "logo") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', async () => {
        const base64 = reader.result?.toString() || null;
        if (base64) {
          if (type === "logo") {
            setSelectedImage(base64);
            setCroppingType(type);
          } else if (type === "background") {
            setIsProcessing(true);
            try {
              await axios.put("/api/system/settings", { panelBackgroundImage: base64 });
              await fetchSettings();
            } catch(err) {
              console.error(err);
            } finally {
              setIsProcessing(false);
            }
          }
        }
      });
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (bgFileInputRef.current) bgFileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedImageBase64: string) => {
    const type = croppingType;
    setSelectedImage(null);
    setCroppingType(null);
    if (type === "logo") {
      setIsUpdatingLogo(true);
      try {
        await axios.put("/api/system/settings", { panelLogo: croppedImageBase64 });
        await fetchSettings();
      } catch (err: any) {
        alert(err.response?.data?.error || "Error updating logo");
      } finally {
        setIsUpdatingLogo(false);
      }
    } else if (type === "background") {
      setIsProcessing(true);
      try {
        await axios.put("/api/system/settings", { panelBackgroundImage: croppedImageBase64 });
        await fetchSettings();
      } catch (err: any) {
        alert(err.response?.data?.error || "Error updating background");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await axios.post("/api/system/users", { username, password, role });
      setUsername("");
      setPassword("");
      fetchUsers();
      alert("User created successfully");
    } catch (e: any) {
      alert(e.response?.data?.error || "Error creating user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const changeUserPassword = async (id: string) => {
    try {
      if (adminUserNewPassword.length < 8) {
         alert("Password must be at least 8 characters");
         return;
      }
      await axios.put(`/api/system/users/${id}/password`, { newPassword: adminUserNewPassword });
      alert("Password changed successfully");
      setEditingUserId(null);
      setAdminUserNewPassword("");
      if (user.id === id) {
        logout();
      }
    } catch(e: any) {
      alert(e.response?.data?.error || "Error changing password");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await axios.delete(`/api/system/users/${id}`);
      fetchUsers();
    } catch (e) {}
  };


  


  const renderGoogleFirebase = () => (
    <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10 border-b border-border-subtle pb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center text-foreground">
            <Key className="mr-3 text-theme-500 w-6 h-6" /> Google & Firebase Authentication
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure Firebase API Keys to enable 1-click Google Sign-In for admins and users.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted p-2 rounded-xl border border-border">
          <span className="text-xs font-semibold text-muted-foreground">Enable Google Login:</span>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input 
              type="checkbox" 
              checked={fbEnableGoogleLogin} 
              onChange={(e: any) => setFbEnableGoogleLogin(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-600"></div>
          </label>
        </div>
      </div>

      {/* Quick Guide Banner */}
      <div className="p-4 rounded-xl bg-theme-600/10 border border-theme-600/20 mb-6 text-xs text-amber-200/90 leading-relaxed">
        <div className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
          <Sparkles size={16} /> How to Setup Google Login in 1 Minute (No Code Needed!):
        </div>
        <ol className="list-decimal list-inside space-y-1 mt-2 text-muted-foreground">
          <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-theme-500 underline font-medium hover:text-amber-300 inline-flex items-center gap-1">Firebase Console <ExternalLink size={12} /></a> and create a free project.</li>
          <li>Go to <strong>Authentication &rarr; Sign-in method</strong> and enable <strong>Google</strong>.</li>
          <li>Under <strong>Settings &rarr; Authorized Domains</strong>, add your panel's domain or IP address.</li>
          <li>Go to <strong>Project Settings &rarr; General &rarr; Your apps</strong>, create a Web App and copy the Firebase config credentials below!</li>
        </ol>
      </div>

      {fbStatusMsg && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium ${fbStatusMsg.type === "success" ? "bg-theme-600/10 border border-theme-600/30 text-theme-500" : "bg-theme-500/10 border border-theme-500/30 text-theme-400"}`}>
          {fbStatusMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{fbStatusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveFirebaseSettings} className="space-y-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Firebase API Key <span className="text-theme-400">*</span>
            </label>
            <input 
              type="text" 
              placeholder="AIzaSy..." 
              value={fbApiKey} 
              onChange={(e: any) => setFbApiKey(e.target.value)} 
              className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Auth Domain <span className="text-theme-400">*</span>
            </label>
            <input 
              type="text" 
              placeholder="your-project.firebaseapp.com" 
              value={fbAuthDomain} 
              onChange={(e: any) => setFbAuthDomain(e.target.value)} 
              className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Project ID <span className="text-theme-400">*</span>
            </label>
            <input 
              type="text" 
              placeholder="your-project-id" 
              value={fbProjectId} 
              onChange={(e: any) => setFbProjectId(e.target.value)} 
              className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Storage Bucket (Optional)
            </label>
            <input 
              type="text" 
              placeholder="your-project.appspot.com" 
              value={fbStorageBucket} 
              onChange={(e: any) => setFbStorageBucket(e.target.value)} 
              className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Messaging Sender ID (Optional)
            </label>
            <input 
              type="text" 
              placeholder="1234567890" 
              value={fbMessagingSenderId} 
              onChange={(e: any) => setFbMessagingSenderId(e.target.value)} 
              className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              App ID (Optional)
            </label>
            <input 
              type="text" 
              placeholder="1:1234567890:web:abcdef" 
              value={fbAppId} 
              onChange={(e: any) => setFbAppId(e.target.value)} 
              className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4">
          <button 
            type="submit" 
            disabled={isSavingFirebase}
            className="bg-theme-600 hover:bg-amber-600 text-zinc-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {isSavingFirebase ? "Saving Config..." : "Save Firebase Credentials"}
          </button>

          <button 
            type="button" 
            onClick={handleTestFirebaseConfig}
            className="bg-muted hover:bg-muted/80 border border-border text-foreground font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            Test Connection
          </button>
        </div>
      </form>
    </div>
  );


  

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full relative z-10 h-full flex flex-col"
    >
      <PageHeader 
        title="Account" 
        subtitle="PREFERENCES" 
      />

      <div className="mx-auto max-w-7xl space-y-8 pb-12 px-4 md:px-0 mt-8 w-full">
        <section className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
            <User className="mr-3 text-theme-500 w-5 h-5" /> Account
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-8">
            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-5 rounded-2xl shadow-[0_0_30px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle">
              <p className="text-sm font-medium text-muted-foreground mb-1">Username</p>
              <p className="text-lg font-semibold text-foreground-muted">{user.username}</p>
            </div>
            <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-5 rounded-2xl shadow-[0_0_30px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle">
              <p className="text-sm font-medium text-muted-foreground mb-1">Access Role</p>
              <p className="text-lg font-semibold text-foreground-muted capitalize flex items-center gap-2">
                {user.role}
                {(user.role === 'admin' || user.role === 'owner') && <Shield size={14} className="text-theme-700" />}
              </p>
            </div>
          </div>

          {(user.isGoogleUser || user.googleId) && (
            <div className="relative z-10 border-t border-border-subtle pt-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-3">Change Display Username</h3>
              {usernameMsg && (
                <div className={`p-3.5 rounded-xl mb-4 flex items-center gap-2.5 text-sm font-medium \${usernameMsg.type === "success" ? "bg-theme-600/10 border border-theme-600/30 text-theme-500" : "bg-theme-500/10 border border-theme-500/30 text-theme-400"}`}>
                  {usernameMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{usernameMsg.text}</span>
                </div>
              )}
              <form onSubmit={handleChangeUsername} className="max-w-md">
                <div className="flex gap-3">
                  <input 
                    required 
                    minLength={3}
                    value={newCustomUsername} 
                    onChange={(e: any) => setNewCustomUsername(e.target.value)} 
                    type="text" 
                    placeholder="Enter new username"
                    className="flex-1 bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" 
                  />
                  <button 
                    type="submit" 
                    disabled={isChangingUsername || user.username === "admin" || newCustomUsername.trim() === user.username}
                    className="bg-theme-600 hover:bg-theme-700 disabled:opacity-50 text-foreground font-semibold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(var(--theme-rgb-600),0.3)] active:scale-[0.98] whitespace-nowrap"
                  >
                    {isChangingUsername ? "Saving..." : "Save Username"}
                  </button>
                </div>
              </form>
              <p className="text-xs text-theme-500/90 mt-2">
                Google Authenticated Users can update their display username at any time without impacting their Google login credentials.
              </p>
            </div>
          )}

          {(!user.isGoogleUser && !user.googleId) && (
            <form onSubmit={async (e) => {
                e.preventDefault();
                if (newPassword.length < 8) {
                  alert("Password must be at least 8 characters");
                  return;
                }
                setIsChangingPassword(true);
                try {
                  await axios.put("/api/auth/password", { oldPassword, newPassword });
                  setOldPassword("");
                  setNewPassword("");
                  alert("Password changed successfully. You will be logged out.");
                  logout();
                } catch (err) {
                  alert(err.response?.data?.error || "Error changing password");
                } finally {
                  setIsChangingPassword(false);
                }
              }} className="relative z-10 border-t border-border-subtle pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
              <div className="flex flex-col gap-4 max-w-md">
                <input 
                  required 
                  value={oldPassword} 
                  onChange={(e: any) => setOldPassword(e.target.value)} 
                  type="password" 
                  placeholder="Current password"
                  className="w-full bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" 
                />
                <div className="flex gap-3">
                  <input 
                    required 
                    minLength={8}
                    value={newPassword} 
                    onChange={(e: any) => setNewPassword(e.target.value)} 
                    type="password" 
                    placeholder="New password (min 8 chars)"
                    className="flex-1 bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" 
                  />
                  <button 
                    type="submit" 
                    disabled={isChangingPassword || user.username === "admin"}
                    className="bg-theme-600 hover:bg-theme-700 disabled:opacity-50 text-foreground font-semibold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(var(--theme-rgb-600),0.3)] active:scale-[0.98] whitespace-nowrap"
                  >
                    {isChangingPassword ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
              {user.username === "admin" && (
                <p className="text-xs text-theme-400 mt-2">Default admin password cannot be changed.</p>
              )}
            </form>
          )}
        
        </section>
      </div>

      {(isChangingUsername || isChangingPassword) && <LoadingOverlay />}
    </motion.div>
  );
}
