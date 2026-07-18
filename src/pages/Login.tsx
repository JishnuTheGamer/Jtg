import React, { useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Shield,
  Zap,
  Activity,
  User,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Box,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const { panelName } = useSettings();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await axios.post("/api/auth/login", {
        username,
        password,
      });

      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid username or password.");
    } finally {
      setIsLoading(false);
    }
  };

  // Staggered animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05020a] flex items-center justify-center p-6">
      {/* ==========================================
          BEST MINECRAFT PURPLE BACKGROUND ANIMATION
      ========================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep Purple Ambient Glows (Nether Portal / End Gateway Vibe) */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15],
            x: [0, 40, 0],
            y: [0, -40, 0],
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.25, 0.1],
            x: [0, -60, 0],
            y: [0, 60, 0],
          }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-fuchsia-600/15 rounded-full blur-[160px]"
        />
        <motion.div
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]"
        />

        {/* Animated Grid (Minecraft Chunk-like) */}
        <motion.div
          animate={{ backgroundPosition: ["0px 0px", "60px 60px"] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
        />

        {/* Floating XP Orb Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -200, 0],
              x: [0, Math.sin(i) * 40, 0],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0.5],
              rotate: [0, 180, 360],
            }}
            transition={{
              repeat: Infinity,
              duration: 10 + Math.random() * 10,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
            className={`absolute w-2 h-2 rounded-sm ${
              i % 3 === 0
                ? "bg-purple-400"
                : i % 3 === 1
                ? "bg-fuchsia-400"
                : "bg-emerald-400"
            } blur-[1px] shadow-[0_0_10px_currentColor]`}
            style={{
              left: `${5 + ((i * 5) % 90)}%`,
              top: `${50 + ((i * 7) % 50)}%`,
            }}
          />
        ))}
      </div>

      {/* ==========================================
          MAIN LOGIN CARD (Obsidian Glassmorphism)
      ========================================== */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Outer Glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 rounded-3xl blur opacity-30 animate-pulse" />

        <div className="relative bg-[#0d0618]/80 backdrop-blur-2xl rounded-3xl border border-purple-500/20 shadow-[0_0_80px_-20px_rgba(168,85,247,0.3)] overflow-hidden">
          {/* Top Accent Line (End Portal Vibe) */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />

          <div className="p-8 md:p-10">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Logo & Dynamic Panel Name */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col items-center"
              >
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.05 }}
                  className="relative group mb-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-purple-700 via-fuchsia-700 to-purple-900 rounded-2xl flex items-center justify-center shadow-2xl border border-purple-400/30">
                    <Box className="w-9 h-9 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 bg-[#0d0618] rounded-full p-1.5 border border-purple-500/30"
                  >
                    <Sparkles className="w-4 h-4 text-fuchsia-400" />
                  </motion.div>
                </motion.div>

                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg text-center">
                  {panelName || "Minecraft Panel"}
                </h1>
                <p className="text-purple-200/60 text-sm mt-2 font-medium text-center">
                  Sign in to manage your Minecraft servers
                </p>
              </motion.div>

              {/* Stats Row */}
              <motion.div variants={itemVariants} className="flex gap-3">
                <div className="flex-1 px-4 py-3 rounded-xl bg-purple-900/20 border border-purple-500/20 backdrop-blur-sm flex flex-col items-center justify-center group hover:bg-purple-900/30 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="text-base font-bold text-white">
                      99.9%
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300/60 uppercase tracking-widest mt-1 font-semibold">
                    Uptime
                  </span>
                </div>
                <div className="flex-1 px-4 py-3 rounded-xl bg-purple-900/20 border border-purple-500/20 backdrop-blur-sm flex flex-col items-center justify-center group hover:bg-purple-900/30 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.5)]" />
                    <span className="text-base font-bold text-white">
                      &lt;15ms
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300/60 uppercase tracking-widest mt-1 font-semibold">
                    Latency
                  </span>
                </div>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2 overflow-hidden backdrop-blur-sm"
                  >
                    <Shield className="w-4 h-4 flex-shrink-0 text-red-400" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username Field */}
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-purple-300/70 uppercase tracking-widest mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <User
                      className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                        focusedField === "username"
                          ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]"
                          : "text-purple-400/50"
                      }`}
                    />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your username"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-purple-500/20 rounded-xl text-white text-sm placeholder:text-purple-300/30 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all duration-300"
                      required
                    />
                  </div>
                </motion.div>

                {/* Password Field */}
                <motion.div variants={itemVariants}>
                  <label className="block text-xs font-bold text-purple-300/70 uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock
                      className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                        focusedField === "password"
                          ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]"
                          : "text-purple-400/50"
                      }`}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-purple-500/20 rounded-xl text-white text-sm placeholder:text-purple-300/30 focus:outline-none focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 transition-all duration-300"
                      required
                    />
                  </div>
                </motion.div>

                {/* Remember Me */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-center"
                >
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 border border-purple-500/40 rounded bg-black/40 peer-checked:bg-fuchsia-600 peer-checked:border-fuchsia-500 transition-all duration-300 flex items-center justify-center shadow-[0_0_10px_rgba(192,38,211,0)] peer-checked:shadow-[0_0_10px_rgba(192,38,211,0.5)]">
                        <CheckCircle2 className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="ml-2.5 text-xs text-purple-300/60 group-hover:text-purple-200 transition-colors font-medium">
                      Remember me
                    </span>
                  </label>
                </motion.div>

                {/* Submit Button */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full py-4 px-6 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700 text-white font-bold rounded-xl shadow-[0_0_30px_-5px_rgba(192,38,211,0.4)] hover:shadow-[0_0_40px_-5px_rgba(192,38,211,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden border border-fuchsia-400/30"
                  >
                    {/* Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.7 }}
                    />
                    <span className="relative flex items-center justify-center gap-2 text-sm tracking-wide">
                      <Shield className="w-4 h-4" />
                      {isLoading ? "AUTHENTICATING..." : "ENTER PANEL"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                </motion.div>
              </form>

              {/* Footer */}
              <motion.div
                variants={itemVariants}
                className="pt-4 border-t border-purple-500/10 flex items-center justify-center gap-2 text-[10px] text-purple-300/40 uppercase tracking-widest font-semibold"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                >
                  <Shield className="w-3 h-3 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                </motion.div>
                <span>End-to-End Encrypted</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {isLoading && <LoadingOverlay message="Authenticating..." />}
    </div>
  );
}
