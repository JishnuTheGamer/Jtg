import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export function LoadingOverlay({ message = "Processing...", progress }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px] max-w-sm">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-foreground font-medium text-center">{message}</p>
        
        {progress !== undefined && (
          <div className="w-full mt-2">
             <div className="flex justify-between items-center mb-1.5 text-xs text-muted-foreground font-mono">
               <span>Progress</span>
               <span>{Math.round(progress)}%</span>
             </div>
             <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden border border-border-subtle">
               <div 
                 className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out" 
                 style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} 
               />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
