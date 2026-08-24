// @ts-nocheck
import React, { useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, Link } from "react-router-dom";
import { Server, ArrowRight, Mail, Lock, User } from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { panelName, panelLogo, enableRegistration } = useSettings();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (enableRegistration === false) {
      setError("User registration is currently disabled by administrator.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("/api/auth/register", { username, password, confirmPassword });
      setSuccess("Account created successfully! Redirecting to sign in...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground selection:bg-indigo-500/30">
      {/* Left side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-card relative overflow-hidden items-center justify-center border-r border-border">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full max-h-[800px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-lg p-12 text-right">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 ml-auto">
            <Server className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-4xl font-bold mb-6 leading-tight">Join the next generation of hosting.</h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Create an account to start deploying high-performance game servers instantly.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-xl bg-background/50 border border-border-subtle backdrop-blur-sm">
              <div className="font-bold text-lg text-foreground mb-1">Instant Setup</div>
              <div className="text-xs text-muted-foreground">Servers deploy in seconds</div>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-border-subtle backdrop-blur-sm">
              <div className="font-bold text-lg text-foreground mb-1">Full Control</div>
              <div className="text-xs text-muted-foreground">Console, files & advanced config</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Right side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="flex items-center gap-3 mb-10">
            {panelLogo ? (
              <img src={panelLogo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Server size={20} />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{panelName}</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Create account</h2>
            <p className="text-muted-foreground">Sign up to start managing your servers.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {enableRegistration === false && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg">
                User registration is currently disabled by administrator.
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg">
                {success}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input 
                  type="text" 
                  name="username"
                  required
                  placeholder="Choose a username"
                  className="w-full bg-card border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input 
                  type="password" 
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-card border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Confirm Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input 
                  type="password" 
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  className="w-full bg-card border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 pl-10 pr-4 outline-none transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !!success || enableRegistration === false}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
            >
              {isLoading ? "Creating account..." : "Create account"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>

      {isLoading && <LoadingOverlay message="Processing..." />}
    </div>
  );
}
