// @ts-nocheck
// @ts-nocheck
import AdminControls from '../components/AdminControls';
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { motion } from "framer-motion";
import { Shield, User, Trash2, Layout, Upload, RefreshCw, Key, CheckCircle2, AlertCircle, Globe, Sparkles, ExternalLink } from "lucide-react";
import { ImageCropper } from "../components/ImageCropper";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { initializeApp, deleteApp, getApps } from "firebase/app";




export default function SettingsPage(): React.ReactElement {
  const { user, logout, updateUser } = useAuth();
  const { 
    panelName, panelLogo, panelBackgroundImage, panelBackgroundBlur, 
    enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme, 
    enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, 
    firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId, 
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
      if (user.role === "admin") {
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
  }, [panelName, panelBackgroundImage, enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme, enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId]);

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
    <>
    {user.role === "admin" && (
        
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10 border-b border-border-subtle pb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center text-foreground">
                  <Key className="mr-3 text-amber-400 w-6 h-6" /> Google & Firebase Authentication
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
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            {/* Quick Guide Banner */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 text-xs text-amber-200/90 leading-relaxed">
              <div className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2">
                <Sparkles size={16} /> How to Setup Google Login in 1 Minute (No Code Needed!):
              </div>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-muted-foreground">
                <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline font-medium hover:text-amber-300 inline-flex items-center gap-1">Firebase Console <ExternalLink size={12} /></a> and create a free project.</li>
                <li>Go to <strong>Authentication &rarr; Sign-in method</strong> and enable <strong>Google</strong>.</li>
                <li>Under <strong>Settings &rarr; Authorized Domains</strong>, add your panel's domain or IP address.</li>
                <li>Go to <strong>Project Settings &rarr; General &rarr; Your apps</strong>, create a Web App and copy the Firebase config credentials below!</li>
              </ol>
            </div>

            {fbStatusMsg && (
              <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium ${fbStatusMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                {fbStatusMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{fbStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveFirebaseSettings} className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Firebase API Key <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="AIzaSy..." 
                    value={fbApiKey} 
                    onChange={(e: any) => setFbApiKey(e.target.value)} 
                    className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Auth Domain <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="your-project.firebaseapp.com" 
                    value={fbAuthDomain} 
                    onChange={(e: any) => setFbAuthDomain(e.target.value)} 
                    className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Project ID <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="your-project-id" 
                    value={fbProjectId} 
                    onChange={(e: any) => setFbProjectId(e.target.value)} 
                    className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
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
                    className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
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
                    className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
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
                    className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-foreground font-mono transition-all shadow-inner outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isSavingFirebase}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
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
      )}
    </>
  );


  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full relative z-10"
    >
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2 drop-shadow-lg">Settings</h1>
        <p className="text-indigo-400/80 font-bold uppercase tracking-widest text-sm mt-2">Configure your account and platform preferences.</p>
      </div>

      <div className="bg-black/40 dark:bg-black/40 backdrop-blur-2xl border border-border rounded-3xl p-6 md:p-10 mb-8 shadow-[0_0_50px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
          <User className="mr-3 text-indigo-400 w-5 h-5" /> Account Details
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
              {user.role === 'admin' && <Shield size={14} className="text-purple-400" />}
            </p>
          </div>
        </div>

        {(user.isGoogleUser || user.googleId) && (
          <div className="relative z-10 border-t border-border-subtle pt-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Change Display Username</h3>
            {usernameMsg && (
              <div className={`p-3.5 rounded-xl mb-4 flex items-center gap-2.5 text-sm font-medium ${usernameMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
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
                  className="flex-1 bg-muted border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" 
                />
                <button 
                  type="submit" 
                  disabled={isChangingUsername || user.username === "admin" || newCustomUsername.trim() === user.username}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-foreground font-semibold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-[0.98] whitespace-nowrap"
                >
                  {isChangingUsername ? "Saving..." : "Save Username"}
                </button>
              </div>
            </form>
            <p className="text-xs text-amber-400/90 mt-2">
              Google Authenticated Users can update their display username at any time without impacting their Google login credentials.
            </p>
          </div>
        )}

        <div className="relative z-10 border-t border-border-subtle pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
          {user.isGoogleUser || user.googleId ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium flex items-center gap-3 max-w-md">
              <Shield size={20} className="text-amber-400 flex-shrink-0" />
              <span>Password change is disabled because you signed in with your Google account.</span>
            </div>
          ) : (
            <form 
              onSubmit={async (e: any) => {
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
                } catch (err: any) {
                  alert(err.response?.data?.error || "Error changing password");
                } finally {
                  setIsChangingPassword(false);
                }
              }}
              className="max-w-md"
            >
              <div className="flex flex-col gap-3">
                <input 
                  required 
                  value={oldPassword} 
                  onChange={(e: any) => setOldPassword(e.target.value)} 
                  type="password" 
                  placeholder="Current password"
                  className="w-full bg-muted border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" 
                />
                <div className="flex gap-3">
                  <input 
                    required 
                    minLength={8}
                    value={newPassword} 
                    onChange={(e: any) => setNewPassword(e.target.value)} 
                    type="password" 
                    placeholder="New password (min 8 chars)"
                    className="flex-1 bg-muted border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none" 
                  />
                  <button 
                    type="submit" 
                    disabled={isChangingPassword || user.username === "admin"}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-foreground font-semibold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-[0.98] whitespace-nowrap"
                  >
                    {isChangingPassword ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
              {user.username === "admin" && (
                <p className="text-xs text-red-400 mt-2">Default admin password cannot be changed.</p>
              )}
            </form>
          )}
        </div>
      </div>

      {user.role === "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-10">
          
          {/* Branding & Identity */}
          <div className="bg-card border border-border-subtle rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground">
              <Layout className="mr-3 text-indigo-400 w-5 h-5" /> Branding & Identity
            </h2>
            <div className="flex flex-col gap-8">
              <form 
                onSubmit={async (e: any) => {
                  e.preventDefault();
                  setIsSavingSettings(true);
                  try {
                    await axios.put("/api/system/settings", { panelName: newPanelName });
                    fetchSettings();
                  } catch (err: any) {
                    alert(err.response?.data?.error || "Error updating settings");
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
              >
                <label className="block text-sm font-medium text-muted-foreground mb-2">Panel Name</label>
                <div className="flex gap-3">
                  <input 
                    required 
                    value={newPanelName} 
                    onChange={(e: any) => setNewPanelName(e.target.value)} 
                    type="text" 
                    placeholder="Enter panel name"
                  />
                  <button disabled={isSavingSettings} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] whitespace-nowrap disabled:opacity-50">
                    {isSavingSettings ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-3">Panel Logo</label>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-muted border border-border-subtle flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-inner">
                    {panelLogo ? (
                      <img src={panelLogo} alt="Panel Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Layout className="w-8 h-8 text-muted-foreground/50" />
                    )}
                    {panelLogo && (
                      <button 
                        onClick={async () => {
                          try {
                            await axios.put("/api/system/settings", { panelLogo: "" });
                            fetchSettings();
                          } catch(e) {}
                        }}
                        className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                        title="Remove logo"
                      >
                        <Trash2 size={20} className="text-white" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full text-center sm:text-left">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e: any) => handleFileChange(e, "logo")}
                    />
                    <button 
                      disabled={isUpdatingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted-hover text-foreground border border-border font-medium px-5 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 w-full sm:w-auto mb-2"
                    >
                      {isUpdatingLogo ? <div className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin"></div> : <Upload size={18} />}
                      {isUpdatingLogo ? "Uploading..." : (panelLogo ? "Replace Logo" : "Upload Logo")}
                    </button>
                    <p className="text-xs text-muted-foreground">We recommend a square image, PNG or JPG format, at least 256x256px.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Features */}
          <div className="bg-card border border-border-subtle rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground">
              <RefreshCw className="mr-3 text-emerald-400 w-5 h-5" /> Platform Features
            </h2>
            <div className="flex flex-col gap-6">
              
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Playit Tunnel Integration</h3>
                  <p className="text-xs text-muted-foreground mt-1">Allow users to expose their local servers to the internet using playit.gg tunnels.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    checked={newEnablePlayit} 
                    onChange={async (e: any) => {
                      const val = e.target.checked;
                      setNewEnablePlayit(val);
                      try {
                        await axios.put("/api/system/settings", { enablePlayit: val });
                        fetchSettings();
                      } catch (err) { console.error(err); }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Onboarding Tutorial</h3>
                  <p className="text-xs text-muted-foreground mt-1">Show a guided tour to new users when they log in for the first time.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    checked={newEnableTutorial} 
                    onChange={async (e: any) => {
                      const val = e.target.checked;
                      setNewEnableTutorial(val);
                      try {
                        await axios.put("/api/system/settings", { enableTutorial: val });
                        fetchSettings();
                      } catch (err) { console.error(err); }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Cinematic Login Intro</h3>
                  <p className="text-xs text-muted-foreground mt-1">Enable the animated sequence on the login screen.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    checked={newEnableLoginAnimation} 
                    onChange={async (e: any) => {
                      const val = e.target.checked;
                      setNewEnableLoginAnimation(val);
                      try {
                        await axios.put("/api/system/settings", { enableLoginAnimation: val });
                        fetchSettings();
                      } catch (err) { console.error(err); }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/50 border border-border-subtle">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">User Registration</h3>
                  <p className="text-xs text-muted-foreground mt-1">Allow new users to register an account on the panel.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    checked={newEnableRegistration} 
                    onChange={async (e: any) => {
                      const val = e.target.checked;
                      setNewEnableRegistration(val);
                      try {
                        await axios.put("/api/system/settings", { enableRegistration: val });
                        fetchSettings();
                      } catch (err) { console.error(err); }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

            </div>
          </div>
        </div>
      )}

      {renderGoogleFirebase()}
      {user.role === "admin" && (
        <div className="bg-card/80 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-8">
          <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
            <Layout className="mr-3 text-indigo-400 w-5 h-5" /> Custom Dashboard Background
          </h2>
          <div className="max-w-4xl relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Preview & Upload Controls */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-foreground">Background Preview</label>
                <div className="w-full h-48 rounded-xl bg-slate-900 border border-border flex items-center justify-center overflow-hidden relative group">
                  {panelBackgroundImage ? (
                    <img src={panelBackgroundImage} alt="Dashboard Background" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                      <Layout className="w-10 h-10 opacity-60" />
                      <span className="text-xs">Default Animated Gradient Active</span>
                    </div>
                  )}
                  {panelBackgroundImage && (
                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await axios.put("/api/system/settings", { panelBackgroundImage: "" });
                          setCustomBgUrlInput("");
                          await fetchSettings();
                        } catch(e) {} finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2 text-white font-medium"
                    >
                      <Trash2 size={20} /> Remove Background
                    </button>
                  )}
                </div>

                {/* Upload Button */}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={bgFileInputRef}
                  onChange={(e: any) => handleFileChange(e, "background")}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => bgFileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm"
                  >
                    <Upload size={16} /> Upload Image File
                  </button>
                  <button 
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        await axios.put("/api/system/settings", { panelBackgroundImage: "" });
                        setCustomBgUrlInput("");
                        await fetchSettings();
                      } catch(e) {} finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-muted hover:bg-muted-hover text-foreground border border-border font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm"
                  >
                    Reset
                  </button>
                </div>

                {/* Custom URL Input */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-medium text-muted-foreground">Or Enter Custom Image URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="https://example.com/wallpaper.jpg"
                      value={customBgUrlInput}
                      onChange={(e) => setCustomBgUrlInput(e.target.value)}
                      className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={async () => {
                        if (!customBgUrlInput.trim()) return;
                        setIsProcessing(true);
                        try {
                          await axios.put("/api/system/settings", { panelBackgroundImage: customBgUrlInput.trim() });
                          await fetchSettings();
                        } catch(e) {} finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium px-4 py-2 rounded-xl text-sm border border-indigo-500/30 transition-all"
                    >
                      Apply URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Blur Slider & Presets */}
              <div className="space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Background Blur ({tempBgBlur}px)</label>
                    <span className="text-xs text-muted-foreground">{tempBgBlur === 0 ? "Sharp" : tempBgBlur > 20 ? "Heavy Blur" : "Soft Blur"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Adjust background blur for crisp dashboard readability.</p>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    value={tempBgBlur}
                    onChange={(e: any) => setTempBgBlur(Number(e.target.value))}
                    onMouseUp={async () => {
                      setIsProcessing(true);
                      try {
                        await axios.put("/api/system/settings", { panelBackgroundBlur: tempBgBlur });
                        await fetchSettings();
                      } catch(e) {} finally {
                        setIsProcessing(false);
                      }
                    }}
                    onTouchEnd={async () => {
                      setIsProcessing(true);
                      try {
                        await axios.put("/api/system/settings", { panelBackgroundBlur: tempBgBlur });
                        await fetchSettings();
                      } catch(e) {} finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Preset Themes */}
                <div className="space-y-3 pt-2 border-t border-border-subtle">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Quick Wallpaper Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Deep Space", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1600&auto=format&fit=crop" },
                      { name: "Cyberpunk City", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop" },
                      { name: "Dark Abstract", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop" },
                      { name: "Neon Horizon", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1600&auto=format&fit=crop" },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={async () => {
                          setIsProcessing(true);
                          setCustomBgUrlInput(preset.url);
                          try {
                            await axios.put("/api/system/settings", { panelBackgroundImage: preset.url });
                            await fetchSettings();
                          } catch(e) {} finally {
                            setIsProcessing(false);
                          }
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border hover:border-indigo-500/50 hover:bg-muted/50 transition-all text-left group"
                      >
                        <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform" />
                        <span className="text-xs font-medium text-foreground group-hover:text-indigo-400">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => { setSelectedImage(null); setCroppingType(null); }}
          aspectRatio={croppingType === "background" ? bgAspectRatio : 1}
          title={croppingType === "background" ? "Crop Background" : "Crop Logo"}
        />
      )}

      {user.role === "admin" && (
        <AdminControls user={user} users={users} username={username} setUsername={setUsername} password={password} setPassword={setPassword} role={role} setRole={setRole} isCreatingUser={isCreatingUser} createUser={createUser} editingUserId={editingUserId} setEditingUserId={setEditingUserId} adminUserNewPassword={adminUserNewPassword} setAdminUserNewPassword={setAdminUserNewPassword} changeUserPassword={changeUserPassword} deleteUser={deleteUser} />
      )}

      {user.role === "admin" && (
        <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center text-foreground">
            <RefreshCw className="mr-3 text-emerald-400 w-5 h-5" /> System Update
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
            Trigger an automatic update of the JTG Panel. This will run git pull and rebuild the system. The panel will be unavailable for a few seconds during this process.
          </p>
          <button 
            onClick={handleSystemUpdate}
            disabled={isUpdatingSystem}
            className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium rounded-xl border border-emerald-500/20 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isUpdatingSystem ? "animate-spin" : ""}`} />
            {isUpdatingSystem ? "Updating System..." : "Update Panel"}
          </button>
        </div>
      )}

      {(isProcessing || isUpdatingLogo || isSavingSettings || isChangingPassword || isCreatingUser || isUpdatingSystem) && <LoadingOverlay />}
    </motion.div>
  );
}
