import React, { useState, useEffect } from "react";
import { Trash2, AlertTriangle, CheckCircle2, Loader2, Sparkles, Server, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

export interface DeleteServerModalProps {
  isOpen: boolean;
  server: {
    id: string;
    name: string;
    runtimeType?: string;
    port?: number;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DELETION_STAGES = [
  { threshold: 0, label: "Initiating server deletion..." },
  { threshold: 20, label: "Stopping active container & process..." },
  { threshold: 45, label: "Dismantling network routes & Playit tunnel..." },
  { threshold: 70, label: "Purging filesystem volumes and SFTP credentials..." },
  { threshold: 90, label: "Finalizing database records..." },
  { threshold: 100, label: "Server deleted successfully!" }
];

export default function DeleteServerModal({
  isOpen,
  server,
  onClose,
  onSuccess
}: DeleteServerModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(DELETION_STAGES[0].label);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setProgress(0);
      setCurrentStage(DELETION_STAGES[0].label);
      setErrorMsg(null);
      setIsComplete(false);
    }
  }, [isOpen]);

  if (!isOpen || !server) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    setProgress(5);
    setCurrentStage("Initializing server deletion...");

    let intervalId: NodeJS.Timeout | null = null;

    intervalId = setInterval(() => {
      setProgress((prev) => {
        let next = prev;
        if (prev < 25) {
          next = prev + 5;
        } else if (prev < 50) {
          next = prev + 4;
        } else if (prev < 75) {
          next = prev + 3;
        } else if (prev < 92) {
          next = prev + 1;
        }

        const match = [...DELETION_STAGES].reverse().find((s) => next >= s.threshold);
        if (match) setCurrentStage(match.label);

        return next;
      });
    }, 200);

    try {
      await axios.delete(`/api/servers/${server.id}`);

      if (intervalId) clearInterval(intervalId);
      setProgress(100);
      setCurrentStage("Server deleted successfully!");
      setIsComplete(true);

      // Brief pause to show 100% completion before closing
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: any) {
      if (intervalId) clearInterval(intervalId);
      setIsDeleting(false);
      setErrorMsg(err.response?.data?.error || err.message || "Failed to delete server");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        className="bg-[#121214] border border-border rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden ring-1 ring-border-subtle"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-theme-500 to-red-500" />

        {!isDeleting ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Delete Server?</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Permanent destruction of instance & files</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message if previous attempt failed */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Server Card Preview */}
            <div className="p-4 rounded-2xl bg-muted/60 border border-border-subtle mb-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Server className="w-4 h-4 text-theme-500" />
                  {server.name}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-background border border-border-subtle text-muted-foreground">
                  ID: {server.id}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This action is <strong className="text-red-400">irreversible</strong>. All world saves, player data, configurations, backups, and tunnel credentials associated with this server will be permanently destroyed.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-muted hover:bg-muted-hover text-foreground font-semibold text-xs rounded-xl border border-border-subtle transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Server</span>
              </button>
            </div>
          </>
        ) : (
          /* Active In-Modal Loading Bar & Progress Display */
          <div className="py-4 space-y-5 text-center">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-red-500/20 blur-md animate-pulse" />
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center relative">
                  {isComplete ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">
                {isComplete ? "Server Deleted" : `Deleting "${server.name}"`}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-medium min-h-[18px]">
                {currentStage}
              </p>
            </div>

            {/* Loading Bar with Percentage */}
            <div className="space-y-2 text-left">
              <div className="w-full bg-muted/80 rounded-full h-3.5 p-0.5 border border-border-subtle overflow-hidden relative shadow-inner">
                <motion.div
                  className={`h-full rounded-full relative overflow-hidden transition-all duration-200 shadow-md ${
                    isComplete
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-red-600 via-orange-500 to-theme-500"
                  }`}
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </motion.div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-bold px-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-theme-500" />
                  Processing deletion
                </span>
                <span className={isComplete ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/80 italic pt-1">
              Please do not close this window while server resources are being released.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
