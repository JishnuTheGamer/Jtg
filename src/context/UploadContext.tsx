import React, { createContext, useContext, useState, ReactNode, useRef } from "react";
import axios from "axios";
import { UploadCloud, X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface UploadTask {
  id: string;
  totalBytes?: number;
  loadedBytes?: number;
  serverId: string;
  fileName: string;
  path: string;
  progress: number;
  status: "uploading" | "assembling" | "completed" | "error" | "paused";
  error?: string;
  file?: File;
  totalChunks?: number;
  uploadedChunks?: number;
}

interface UploadContextType {
  uploads: UploadTask[];
  startUpload: (file: File, serverId: string, path: string) => void;
  
  removeUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error("useUpload must be used within an UploadProvider");
  return context;
};

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const cancelTokens = useRef<Record<string, import("axios").CancelTokenSource>>({});

  const updateTask = (id: string, updates: Partial<UploadTask>) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  

  const processUpload = async (task: UploadTask) => {
    const { id, serverId, file, path } = task;
    if (!file) return;

    const cancelTokenSource = axios.CancelToken.source();
    cancelTokens.current[id] = cancelTokenSource;

    

    try {
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
      const totalChunks = task.totalChunks || Math.ceil(file.size / CHUNK_SIZE);
      let uploadedChunks = task.uploadedChunks || 0;

      updateTask(id, { status: "uploading", totalChunks, error: undefined, totalBytes: file.size, loadedBytes: uploadedChunks * CHUNK_SIZE });

      for (let i = uploadedChunks; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("uploadId", id);
        formData.append("chunkIndex", String(i));
        formData.append("fileName", file.name);
        formData.append("path", path);

        await axios.post(`/api/servers/${serverId}/files/upload-chunk`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          cancelToken: cancelTokenSource.token,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const chunkProgress = progressEvent.loaded / progressEvent.total;
              const overallProgress = Math.round(((i + chunkProgress) / totalChunks) * 100);
              updateTask(id, { 
                progress: Math.min(overallProgress, 99),
                loadedBytes: (i * CHUNK_SIZE) + progressEvent.loaded
              });
            }
          }
        });
        
        uploadedChunks = i + 1;
        updateTask(id, { uploadedChunks, loadedBytes: (i + 1) * CHUNK_SIZE });
        
      }

      // All chunks uploaded, assemble them
      updateTask(id, { status: "assembling" });
      
      await axios.post(`/api/servers/${serverId}/files/upload-complete`, {
        uploadId: id,
        fileName: file.name,
        path,
        totalChunks
      }, {
        cancelToken: cancelTokenSource.token
      });

      updateTask(id, { status: "completed", progress: 100, loadedBytes: file.size });
      
      delete cancelTokens.current[id];
    } catch (err: any) {
      if (axios.isCancel(err)) {
        updateTask(id, { status: "paused" });
      } else {
        updateTask(id, { status: "error", error: "Upload failed" });
      }
      delete cancelTokens.current[id];
    }
  };

  const startUpload = (file: File, serverId: string, path: string) => {
    // 1. Check if already in UI
    const existing = uploads.find(u => u.serverId === serverId && u.path === path && u.fileName === file.name);
    if (existing) {
      if (existing.status !== 'uploading' && existing.status !== 'assembling' && existing.status !== 'completed') {
        const taskToResume = { ...existing, file };
        updateTask(existing.id, { file }); // Ensure file is attached if it was dropped
        processUpload(taskToResume);
      }
      return;
    }

    const uploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / (10 * 1024 * 1024));

    const newTask: UploadTask = {
      id: uploadId,
      serverId,
      fileName: file.name,
      path,
      progress: 0,
      status: "uploading",
      file,
      uploadedChunks: 0,
      totalChunks,
      totalBytes: file.size,
      loadedBytes: 0
    };
    
    setUploads((prev) => [...prev, newTask]);
    processUpload(newTask);
  };

  const removeUpload = (id: string) => {
    if (cancelTokens.current[id]) {
      cancelTokens.current[id].cancel("User removed upload");
      delete cancelTokens.current[id];
    }
    
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <UploadContext.Provider value={{ uploads, startUpload, removeUpload }}>
      {children}
      <UploadOverlay 
        uploads={uploads} 
        removeUpload={removeUpload} 
         
      />
    </UploadContext.Provider>
  );
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const UploadOverlay: React.FC<{
  uploads: UploadTask[];
  removeUpload: (id: string) => void;
  
}> = ({ uploads, removeUpload }) => {
  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 w-80">
      <AnimatePresence>
        {uploads.map((upload) => (
          <motion.div
            key={upload.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            className="bg-panel border border-line rounded-xl shadow-xl overflow-hidden backdrop-blur-md"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="mt-1">
                {upload.status === "uploading" && <Loader2 className="w-5 h-5 text-theme-500 animate-spin" />}
                {upload.status === "assembling" && <Loader2 className="w-5 h-5 text-theme-700 animate-spin" />}
                {upload.status === "completed" && <Check className="w-5 h-5 text-green-400" />}
                {upload.status === "error" && <X className="w-5 h-5 text-theme-400" />}
                
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate" title={upload.fileName}>
                  {upload.fileName}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-foreground-muted">
                    {upload.status === "uploading" && `${formatSize(upload.loadedBytes || 0)} / ${formatSize(upload.totalBytes || 0)} (${upload.progress}%)`}
                    {upload.status === "assembling" && "Finalizing..."}
                    {upload.status === "completed" && "Upload complete"}
                    {upload.status === "error" && "Upload failed"}
                    
                  </p>
                </div>
                
                {(upload.status === "uploading" || upload.status === "assembling") && (
                  <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-theme-600 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => removeUpload(upload.id)}
                  className="p-1 hover:bg-muted rounded text-foreground-muted hover:text-white transition-colors"
                  title="Cancel & Remove"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
