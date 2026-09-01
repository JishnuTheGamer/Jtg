// @ts-nocheck
// @ts-nocheck
import AdminControls from '../components/AdminControls';
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import PageHeader from "../components/PageHeader";
import { motion } from "framer-motion";
import { Check, Shield, User, Trash2, Layout, Upload, RefreshCw, Key, CheckCircle2, AlertCircle, Globe, Sparkles, ExternalLink, Cpu, Image, Settings, ArrowLeft, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ImageCropper } from "../components/ImageCropper";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { initializeApp, deleteApp, getApps } from "firebase/app";




export default function AdminSettingsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState("branding");
  const [mobileOpen, setMobileOpen] = useState(false);
  const adminTabs = [
    { id: "branding", label: "Branding", icon: <Layout size={20} /> },
    { id: "features", label: "Features", icon: <Settings size={20} /> },
    { id: "runtime", label: "Runtime", icon: <Cpu size={20} /> },
    { id: "appearance", label: "Appearance", icon: <Image size={20} /> },
    { id: "auth", label: "Authentication", icon: <Key size={20} /> },
    { id: "users", label: "Users", icon: <User size={20} /> },
    { id: "system", label: "System", icon: <RefreshCw size={20} /> },
  ];
  const { user, logout, updateUser } = useAuth();
  const { 
    panelName, panelLogo, panelBackgroundImage, panelBackgroundBlur, 
    enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme, setTheme, 
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
  const [newDefaultRuntime, setNewDefaultRuntime] = useState(defaultRuntime || 'docker');
  const [isUpdatingRuntime, setIsUpdatingRuntime] = useState(false);
  const [runtimeStatusMsg, setRuntimeStatusMsg] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

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
  }, [defaultRuntime, panelName, panelBackgroundImage, enablePlayit, enableTutorial, enableLoginAnimation, enableRegistration, theme, setTheme, enableGoogleLogin, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, firebaseStorageBucket, firebaseMessagingSenderId, firebaseAppId]);

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


  



  if (!user || user.role !== "admin") {
    return (
        <div className="w-full flex items-center justify-center py-20 text-muted-foreground">
            You do not have permission to view this page.
        </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-transparent text-foreground font-sans overflow-hidden selection:bg-theme-600/30">
      
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar for Admin Settings */}
      <div className={`fixed inset-y-0 left-0 z-[70] transform flex-shrink-0 bg-ink backdrop-blur-md text-white font-body border-r border-line transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 h-full flex flex-col`}>
         <div className="h-16 flex items-center justify-between border-b border-line px-6 flex-shrink-0">
            <span className="font-display font-bold text-lg tracking-wide uppercase text-white">ADMIN <span className="text-dim font-medium">PANEL</span></span>
            <button onClick={() => setMobileOpen(false)} className="md:hidden text-dim hover:text-white transition-colors">
              <X size={20} />
            </button>
         </div>
    
         <nav className="flex-1 w-full px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
           <p className="px-3 mb-4 font-mono text-[10px] text-faint tracking-widest uppercase">Settings</p>
           
           {adminTabs.map(tab => {
               const isActive = activeTab === tab.id;
               return (
                   <button
                       key={tab.id}
                       onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
                       className={`relative flex w-full items-center px-3 py-3 rounded transition-colors group overflow-hidden`}
                   >
                       {isActive && (
                           <motion.div 
                               layoutId="activeAdminTab" 
                               className="absolute inset-0 bg-white/[0.05]" 
                               initial={false} 
                               transition={{ type: "spring", stiffness: 300, damping: 30 }}
                           />
                       )}
                       {isActive && (
                           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-white" />
                       )}
                       <div className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-dim group-hover:text-white'}`}>
                           {tab.icon}
                       </div>
                       <span className={`ml-3 relative z-10 font-mono text-xs tracking-wider transition-colors duration-200 ${isActive ? 'text-white font-semibold' : 'text-dim group-hover:text-white'}`}>
                           {tab.label.toUpperCase()}
                       </span>
                   </button>
               );
           })}
    
           <div className="mt-8 pt-4">
              <Link to="/" className="relative flex items-center px-3 py-3 rounded transition-colors group overflow-hidden">
                 <div className="relative z-10 text-dim group-hover:text-white transition-colors duration-200">
                     <ArrowLeft size={20} />
                 </div>
                 <span className="ml-3 font-mono text-xs tracking-wider transition-colors duration-200 text-dim group-hover:text-white">BACK TO APP</span>
              </Link>
           </div>
         </nav>
      </div>
    
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-transparent">
         <header className="sticky top-0 z-40 border-b border-line bg-ink backdrop-blur-md flex-shrink-0 h-16 flex items-center px-4 md:px-8">
            <button 
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 -ml-2 mr-3 text-dim hover:text-white hover:bg-line/50 rounded-lg transition-colors flex items-center justify-center"
            >
                <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-xl uppercase text-white tracking-wide">
               {adminTabs.find(t => t.id === activeTab)?.label}
            </h1>
         </header>
    
         <main className="flex-1 w-full h-full relative z-0 overflow-x-hidden overflow-y-auto pb-safe custom-scrollbar p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto w-full pb-12">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                  {activeTab === "branding" && (
                    <section className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                        <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Layout className="mr-3 text-theme-500 w-5 h-5" /> Branding
            </h2>
            <div className="flex flex-col gap-8 relative z-10">
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
                    className="flex-1 bg-muted border border-border focus:border-theme-600 focus:ring-1 focus:ring-theme-600/50 rounded-xl px-4 py-2.5 text-foreground transition-all shadow-inner outline-none"
                  />
                  <button disabled={isSavingSettings} type="submit" className="bg-theme-700 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] whitespace-nowrap disabled:opacity-50">
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
                        className="absolute inset-0 bg-theme-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
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
          
            
                    
                    </section>
                  )}
        
                  {activeTab === "features" && (
                    <section className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                        <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Settings className="mr-3 text-theme-500 w-5 h-5" /> Features
            </h2>
            <div className="flex flex-col gap-6 relative z-10">
              
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
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-600"></div>
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
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-600"></div>
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
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-600"></div>
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
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-600"></div>
                </label>
              </div>
            </div>
          
            
                    
                    </section>
                  )}
        
                  {activeTab === "runtime" && (
                    <section className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                      <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
                        <Cpu className="mr-3 text-theme-500 w-5 h-5" /> Runtime Engine
                      </h2>
                      <div className="relative z-10 space-y-6">
                        <div>
                          <h4 className="font-semibold text-foreground flex items-center gap-2">Default Server Runtime</h4>
                          <p className="text-xs text-muted-foreground mt-1 mb-4">
                            Choose the execution environment for <strong className="text-foreground">newly created servers</strong>.
                          </p>

                          {runtimeStatusMsg && (
                            <div className={`mb-4 p-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${
                              runtimeStatusMsg.type === "success" 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                : runtimeStatusMsg.type === "warning"
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            }`}>
                              {runtimeStatusMsg.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                              {runtimeStatusMsg.type === "warning" && <AlertCircle className="w-4 h-4 shrink-0" />}
                              {runtimeStatusMsg.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
                              <span>{runtimeStatusMsg.text}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                              type="button"
                              disabled={isUpdatingRuntime}
                              onClick={async () => {
                                setIsUpdatingRuntime(true);
                                setRuntimeStatusMsg(null);
                                setNewDefaultRuntime("docker");
                                if (setDefaultRuntime) setDefaultRuntime("docker");
                                try {
                                  const token = localStorage.getItem("jtg_token") || localStorage.getItem("token");
                                  const headers: any = {};
                                  if (token) headers["Authorization"] = `Bearer ${token}`;
                                  await axios.put("/api/system/settings", { defaultRuntime: "docker" }, { headers });
                                  await fetchSettings();
                                  setRuntimeStatusMsg({ text: "Default runtime updated to Docker (Container Isolation).", type: "success" });
                                } catch(err: any) {
                                  setRuntimeStatusMsg({ text: err.response?.data?.error || err.message || "Failed to update runtime", type: "error" });
                                } finally {
                                  setIsUpdatingRuntime(false);
                                }
                              }}
                              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                newDefaultRuntime === 'docker' 
                                  ? 'bg-theme-500/10 border-theme-500 shadow-lg shadow-theme-500/10 ring-1 ring-theme-500' 
                                  : 'bg-muted/50 border-border hover:border-border-subtle hover:bg-muted'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-base font-bold flex items-center gap-2 ${newDefaultRuntime === 'docker' ? 'text-theme-400' : 'text-foreground'}`}>
                                    Docker (Container Isolation)
                                  </span>
                                  {newDefaultRuntime === 'docker' && (
                                    <span className="text-[10px] font-mono uppercase bg-theme-500 text-white px-2 py-0.5 rounded-full font-semibold">Active</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Runs server workloads in sandboxed Docker containers. Full port isolation, PTY terminal support, high security.
                                </p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-border-subtle/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Engine: Docker Engine</span>
                                <span className="font-mono text-emerald-400 font-semibold">Isolated</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              disabled={isUpdatingRuntime}
                              onClick={async () => {
                                setIsUpdatingRuntime(true);
                                setRuntimeStatusMsg(null);
                                setNewDefaultRuntime("local");
                                if (setDefaultRuntime) setDefaultRuntime("local");
                                try {
                                  const token = localStorage.getItem("jtg_token") || localStorage.getItem("token");
                                  const headers: any = {};
                                  if (token) headers["Authorization"] = `Bearer ${token}`;
                                  await axios.put("/api/system/settings", { defaultRuntime: "local" }, { headers });
                                  await fetchSettings();
                                  setRuntimeStatusMsg({ text: "Default runtime updated to Local Process (Node.js Direct).", type: "success" });
                                } catch(err: any) {
                                  setRuntimeStatusMsg({ text: err.response?.data?.error || err.message || "Failed to update runtime", type: "error" });
                                } finally {
                                  setIsUpdatingRuntime(false);
                                }
                              }}
                              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                                newDefaultRuntime === 'local' 
                                  ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500' 
                                  : 'bg-muted/50 border-border hover:border-border-subtle hover:bg-muted'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-base font-bold flex items-center gap-2 ${newDefaultRuntime === 'local' ? 'text-amber-400' : 'text-foreground'}`}>
                                    Local Process (Direct Process)
                                  </span>
                                  {newDefaultRuntime === 'local' && (
                                    <span className="text-[10px] font-mono uppercase bg-amber-500 text-black px-2 py-0.5 rounded-full font-semibold">Active</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Runs server workloads directly on the host system via Node.js process spawning. Ideal for environments without Docker.
                                </p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-border-subtle/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Host Java / Node Execution</span>
                                <span className="font-mono text-amber-400 font-semibold">Direct Host</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-card border border-border-subtle text-xs text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">💡 How Runtime Switching Works:</p>
                          <p>• Setting the default runtime here determines what environment is chosen automatically when creating new servers.</p>
                          <p>• Existing servers can also be migrated individually between Docker and Local Process under each server's <strong>Settings &gt; Runtime Migration</strong> tab.</p>
                        </div>
                      </div>
                    </section>
                  )}
        
                  {activeTab === "appearance" && (
                    <section className="bg-card/80 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                        <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Image className="mr-3 text-theme-500 w-5 h-5" /> Appearance
            </h2>
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Image Upload/URL */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-3">Custom Dashboard Background</label>
                    <div className="flex gap-4 items-end">
                      <div className="w-32 h-20 rounded-xl border-2 border-dashed border-border-subtle bg-muted overflow-hidden relative group flex-shrink-0 flex items-center justify-center">
                        {panelBackgroundImage ? (
                          <img src={panelBackgroundImage} alt="Background Preview" className="w-full h-full object-cover" style={{ filter: `blur(\${panelBackgroundBlur}px)` }} />
                        ) : (
                          <Image className="w-6 h-6 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={bgFileInputRef}
                          onChange={(e: any) => handleFileChange(e, "background")}
                        />
                        <button 
                          disabled={isProcessing}
                          onClick={() => bgFileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 bg-theme-600 hover:bg-theme-700 text-white font-medium px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-sm"
                        >
                          {isProcessing ? <div className="w-4 h-4 rounded-full border-2 border-theme-200 border-t-white animate-spin"></div> : <Upload size={16} />}
                          {isProcessing ? "Uploading..." : "Upload Image"}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                    <button 
                      disabled={isProcessing}
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await axios.put("/api/system/settings", { panelBackgroundImage: "", panelBackgroundBlur: 0 });
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
                        className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-theme-600"
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
                        className="bg-theme-600/20 hover:bg-theme-600/30 text-theme-300 font-medium px-4 py-2 rounded-xl text-sm border border-theme-600/30 transition-all"
                      >
                        Apply URL
                      </button>
                    </div>
                  </div>
                </div>

                
                  {/* Theme Selector */}
                  <div className="pt-6 border-t border-border-subtle mt-6">
                    <label className="block text-sm font-medium text-muted-foreground mb-3">Accent Color Theme</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { name: "red", color: "#ef4444" },
                        { name: "blue", color: "#3b82f6" },
                        { name: "orange", color: "#f97316" },
                        { name: "green", color: "#10b981" },
                        { name: "white", color: "#e4e4e7" }
                      ].map(t => (
                        <button
                          key={t.name}
                          onClick={async () => {
                            try {
                              setTheme(t.name);
                              document.documentElement.setAttribute('data-theme', t.name);
                              await axios.put("/api/system/settings", { theme: t.name });
                            } catch(e) {}
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme === t.name ? 'ring-2 ring-offset-2 ring-offset-card ring-theme-500 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                          style={{ backgroundColor: t.color }}
                          title={t.name.charAt(0).toUpperCase() + t.name.slice(1)}
                        >
                           {theme === t.name && <Check size={16} className={t.name === 'white' ? 'text-zinc-900' : 'text-white'} />}
                        </button>
                      ))}
                    </div>
                  </div>

                {/* Right Column: Blur Slider & Presets */}
                <div className="space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-theme-300 uppercase tracking-widest">Background Blur ({tempBgBlur}px)</label>
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
                      className="w-full accent-theme-600"
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
                          className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border hover:border-theme-600/50 hover:bg-muted/50 transition-all text-left group"
                        >
                          <img src={preset.url} alt={preset.name} className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform" />
                          <span className="text-xs font-medium text-foreground group-hover:text-theme-500">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          
            
                    
                    </section>
                  )}
        
                  {activeTab === "auth" && (
                    <div>
                        {renderGoogleFirebase()}
                    </div>
                  )}
        
                  {activeTab === "users" && (
                    <div>
                        <AdminControls 
                            user={user}
                            users={users}
                            username={username}
                            setUsername={setUsername}
                            password={password}
                            setPassword={setPassword}
                            role={role}
                            setRole={setRole}
                            isCreatingUser={isCreatingUser}
                            createUser={createUser}
                            editingUserId={editingUserId}
                            setEditingUserId={setEditingUserId}
                            adminUserNewPassword={adminUserNewPassword}
                            setAdminUserNewPassword={setAdminUserNewPassword}
                            changeUserPassword={changeUserPassword}
                            deleteUser={deleteUser}
                        />
                    </div>
                  )}
        
                  {activeTab === "system" && (
                    <section className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl">
                        <h2 className="text-xl font-bold mb-4 flex items-center text-foreground">
              <RefreshCw className="mr-3 text-theme-500 w-5 h-5" /> System Update
            </h2>
            <div className="relative z-10">
              <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
                Trigger an automatic update of the JTG Panel. This will run git pull and rebuild the system. The panel will be unavailable for a few seconds during this process.
              </p>
              <button 
                onClick={handleSystemUpdate}
                disabled={isUpdatingSystem}
                className="px-6 py-2.5 bg-theme-600/10 hover:bg-theme-600/20 text-theme-500 font-medium rounded-xl border border-theme-600/20 transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 \${isUpdatingSystem ? "animate-spin" : ""}`} />
                {isUpdatingSystem ? "Updating System..." : "Update Panel"}
              </button>
            </div>
          
            
                    
                    </section>
                  )}
              </motion.div>
            </div>
         </main>
      </div>
    
      {selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => { setSelectedImage(null); setCroppingType(null); }}
          aspectRatio={croppingType === "background" ? bgAspectRatio : 1}
          title={croppingType === "background" ? "Crop Background" : "Crop Logo"}
        />
      )}
    
      {(isProcessing || isUpdatingLogo || isSavingSettings || isChangingPassword || isCreatingUser || isUpdatingSystem) && <LoadingOverlay />}
    </div>
  );
}
