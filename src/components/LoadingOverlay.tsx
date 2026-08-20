import React, { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
  progress?: number; // 0 to 100
  showPercentage?: boolean;
  stages?: { threshold: number; label: string }[];
}

export function LoadingOverlay({
  message = "Processing...",
  subMessage,
  progress: explicitProgress,
  showPercentage = true,
  stages
}: LoadingOverlayProps) {
  const [simulatedProgress, setSimulatedProgress] = useState(10);
  const [activeStage, setActiveStage] = useState<string>("");

  const isExplicit = typeof explicitProgress === "number";
  const currentProgress = isExplicit ? Math.min(100, Math.max(0, explicitProgress)) : simulatedProgress;

  // Auto-progress simulation when explicit progress is not passed
  useEffect(() => {
    if (isExplicit) return;

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev < 30) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 65) return prev + Math.floor(Math.random() * 6) + 3;
        if (prev < 85) return prev + Math.floor(Math.random() * 4) + 2;
        if (prev < 94) return prev + 1;
        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isExplicit]);

  // Stage label resolution
  useEffect(() => {
    if (subMessage) {
      setActiveStage(subMessage);
      return;
    }

    if (stages && stages.length > 0) {
      const match = [...stages].reverse().find((s) => currentProgress >= s.threshold);
      if (match) {
        setActiveStage(match.label);
        return;
      }
    }

    // Default intelligent stage descriptions based on progress
    if (currentProgress < 25) {
      setActiveStage("Initializing process...");
    } else if (currentProgress < 50) {
      setActiveStage("Executing operations...");
    } else if (currentProgress < 75) {
      setActiveStage("Applying changes to system...");
    } else if (currentProgress < 95) {
      setActiveStage("Finalizing task...");
    } else {
      setActiveStage("Complete!");
    }
  }, [currentProgress, stages, subMessage]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-card/95 backdrop-blur-2xl border border-border-subtle p-6 md:p-8 rounded-3xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] ring-1 ring-border-subtle max-w-md w-full relative overflow-hidden flex flex-col items-center text-center"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-theme-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-theme-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Spinner with pulse ring */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-theme-600/20 blur-md animate-pulse" />
          <div className="w-14 h-14 rounded-2xl bg-theme-600/10 border border-theme-600/30 flex items-center justify-center relative">
            <Loader2 className="w-7 h-7 text-theme-500 animate-spin" />
          </div>
        </div>

        {/* Primary Message */}
        <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight">
          {message}
        </h3>

        {/* Sub-step / Stage Description */}
        <p className="text-xs text-muted-foreground font-medium mb-6 min-h-[18px] transition-all">
          {activeStage}
        </p>

        {/* Progress Bar & Percentage Container */}
        <div className="w-full space-y-2">
          <div className="w-full bg-muted/80 rounded-full h-3 p-0.5 border border-border-subtle overflow-hidden relative shadow-inner">
            <motion.div
              className="bg-gradient-to-r from-theme-600 via-theme-500 to-theme-400 h-full rounded-full relative overflow-hidden shadow-md"
              initial={{ width: "5%" }}
              animate={{ width: `${currentProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            >
              {/* Shimmer light effect across the bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            </motion.div>
          </div>

          {showPercentage && (
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold px-1">
              <span className="text-muted-foreground/70 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-theme-500" />
                Working in background
              </span>
              <span className="text-theme-500 font-bold">
                {Math.round(currentProgress)}%
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
