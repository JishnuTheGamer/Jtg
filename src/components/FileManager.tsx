import React, { useEffect, useState, useRef } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { 
  Folder, File, ArrowLeft, Upload, Trash2, Edit2, Save, Archive, Search, X, 
  CheckSquare, Square, Download, FilePlus, FolderPlus, MoreVertical, FileText, 
  FileArchive, FileCode, Check, AlertTriangle, ChevronRight, FolderDown, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function FileManager({ serverId }: { serverId: string }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [path, setPath] = useState("/");
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active Menu row
  const [openMenuRow, setOpenMenuRow] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<Toast | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<"create_file" | "create_folder" | "rename" | "delete" | "zip" | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [targetItem, setTargetItem] = useState<{ name: string; isDirectory: boolean } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Close row menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
      if (res.data.isFile) {
        setFileContent(res.data.content);
      } else {
        setFiles(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e: any) {
      setFiles([]);
      showToast("Failed to fetch folder contents", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    setSelectedFiles(new Set());
    setSearchQuery("");
    setOpenMenuRow(null);
  }, [path, serverId]);

  const goUp = () => {
    if (editingFile) {
      setEditingFile(null);
      return;
    }
    if (path === "/") return;
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    setPath("/" + parts.join("/"));
  };

  const navigateToSegment = (index: number) => {
    if (editingFile) setEditingFile(null);
    const parts = path.split("/").filter(Boolean);
    if (index === -1) {
      setPath("/");
      return;
    }
    const newParts = parts.slice(0, index + 1);
    setPath("/" + newParts.join("/"));
  };

  const traverse = (dirName: string) => {
    setPath(path.endsWith("/") ? path + dirName : path + "/" + dirName);
  };

  const openFile = async (name: string) => {
    if (!name.match(/\.(txt|json|yml|yaml|properties|log|conf|ini|sh|bat|cmd|env|toml|xml|md)$/i)) {
      showToast("Binary format cannot be directly edited in text editor.", "error");
      return;
    }
    const fullPath = path.endsWith("/") ? path + name : path + "/" + name;
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/servers/${serverId}/files?path=${encodeURIComponent(fullPath)}`);
      if (res.data.isFile) {
        setEditingFile(name);
        setFileContent(res.data.content);
      }
    } catch (e) {
      showToast("Failed to load file contents", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!editingFile) return;
    setIsSaving(true);
    try {
      const fullPath = path.endsWith("/") ? path + editingFile : path + "/" + editingFile;
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: fullPath,
        content: fileContent
      });
      showToast(`Saved ${editingFile} successfully`, "success");
    } catch (e) {
      showToast("Failed to save file", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Actions ---

  // 1. Download File or Folder
  const handleDownload = (itemName: string, isDirectory: boolean) => {
    const p = path.endsWith("/") ? path : path + "/";
    const fullPath = p + itemName;
    const downloadUrl = `/api/servers/${serverId}/files/download?path=${encodeURIComponent(fullPath)}`;
    window.open(downloadUrl, "_blank");
    showToast(`Downloading ${isDirectory ? itemName + ".zip" : itemName}...`, "success");
    setOpenMenuRow(null);
  };

  // Bulk Download
  const handleDownloadSelected = () => {
    if (selectedFiles.size === 0) return;
    const p = path.endsWith("/") ? path : path + "/";
    const selectedList = Array.from(selectedFiles);
    
    if (selectedList.length === 1) {
      const item = files.find(f => f.name === selectedList[0]);
      handleDownload(selectedList[0], item?.isDirectory || false);
      return;
    }

    const queryPaths = selectedList.map(name => encodeURIComponent(p + name)).join("&paths=");
    const downloadUrl = `/api/servers/${serverId}/files/download?paths=${queryPaths}`;
    window.open(downloadUrl, "_blank");
    showToast(`Preparing download for ${selectedList.length} items...`, "success");
  };

  // 2. Create File
  const submitCreateFile = async () => {
    if (!modalInput.trim()) return;
    const fileName = modalInput.trim();
    try {
      const fullPath = path.endsWith("/") ? path + fileName : path + "/" + fileName;
      await axios.post(`/api/servers/${serverId}/files/create`, { filePath: fullPath });
      showToast(`Created file '${fileName}'`, "success");
      setActiveModal(null);
      setModalInput("");
      fetchFiles();
      if (fileName.match(/\.(txt|json|yml|yaml|properties|log|conf|ini|sh|bat|cmd|env|toml|xml|md)$/i)) {
        openFile(fileName);
      }
    } catch (e) {
      showToast("Failed to create file", "error");
    }
  };

  // 3. Create Folder
  const submitCreateFolder = async () => {
    if (!modalInput.trim()) return;
    const folderName = modalInput.trim();
    try {
      const fullPath = path.endsWith("/") ? path + folderName : path + "/" + folderName;
      await axios.post(`/api/servers/${serverId}/files/mkdir`, { filePath: fullPath });
      showToast(`Created folder '${folderName}'`, "success");
      setActiveModal(null);
      setModalInput("");
      fetchFiles();
    } catch (e) {
      showToast("Failed to create folder", "error");
    }
  };

  // 4. Rename File or Folder
  const openRenameModal = (item: { name: string; isDirectory: boolean }) => {
    setTargetItem(item);
    setModalInput(item.name);
    setActiveModal("rename");
    setOpenMenuRow(null);
  };

  const submitRename = async () => {
    if (!targetItem || !modalInput.trim() || modalInput.trim() === targetItem.name) {
      setActiveModal(null);
      return;
    }
    const newName = modalInput.trim();
    const p = path.endsWith("/") ? path : path + "/";
    try {
      await axios.post(`/api/servers/${serverId}/files/rename`, {
        oldPath: p + targetItem.name,
        newPath: p + newName
      });
      showToast(`Renamed ${targetItem.isDirectory ? "folder" : "file"} to '${newName}'`, "success");
      setActiveModal(null);
      setTargetItem(null);
      setModalInput("");
      fetchFiles();
    } catch (e) {
      showToast("Failed to rename item", "error");
    }
  };

  // 5. Delete File or Folder
  const openDeleteModal = (item?: { name: string; isDirectory: boolean }) => {
    if (item) {
      setTargetItem(item);
    } else {
      setTargetItem(null);
    }
    setActiveModal("delete");
    setOpenMenuRow(null);
  };

  const submitDelete = async () => {
    setIsDeleting(true);
    try {
      const p = path.endsWith("/") ? path : path + "/";
      let pathsToDelete: string[] = [];

      if (targetItem) {
        pathsToDelete = [p + targetItem.name];
      } else {
        pathsToDelete = Array.from(selectedFiles).map(name => p + name);
      }

      await axios.delete(`/api/servers/${serverId}/files`, {
        data: { paths: pathsToDelete }
      });

      showToast(`Deleted ${pathsToDelete.length} item(s)`, "success");
      setSelectedFiles(new Set());
      setActiveModal(null);
      setTargetItem(null);
      fetchFiles();
    } catch (e) {
      showToast("Failed to delete item(s)", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // 6. Zip File(s) / Folder(s)
  const openZipModal = (item?: { name: string; isDirectory: boolean }) => {
    if (item) {
      setSelectedFiles(new Set([item.name]));
      setModalInput(`${item.name}.zip`);
    } else {
      setModalInput("archive.zip");
    }
    setActiveModal("zip");
    setOpenMenuRow(null);
  };

  const submitZip = async () => {
    if (selectedFiles.size === 0 || !modalInput.trim()) return;
    const outputName = modalInput.trim().endsWith(".zip") ? modalInput.trim() : `${modalInput.trim()}.zip`;

    setIsZipping(true);
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/zip`, {
        dirPath: p,
        fileNames: Array.from(selectedFiles),
        outputName
      });
      showToast(`Compressed into '${outputName}'`, "success");
      setSelectedFiles(new Set());
      setActiveModal(null);
      fetchFiles();
    } catch (e) {
      showToast("Failed to zip items", "error");
    } finally {
      setIsZipping(false);
    }
  };

  // 7. Unzip File
  const handleUnzipItem = async (itemName: string) => {
    setIsUnzipping(true);
    setOpenMenuRow(null);
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/unzip`, {
        path: p + itemName
      });
      showToast(`Extracted '${itemName}' successfully`, "success");
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (e) {
      showToast("Failed to unzip file", "error");
    } finally {
      setIsUnzipping(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    try {
      setUploadProgress(0);
      await axios.post(`/api/servers/${serverId}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      showToast(`Uploaded '${file.name}'`, "success");
      fetchFiles();
    } catch (err) {
      showToast("Upload failed", "error");
    } finally {
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.name)));
    }
  };

  const toggleSelectFile = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedFiles);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedFiles(newSet);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Render File Type Icon
  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) {
      return <Folder className="text-amber-400 shrink-0 fill-amber-400/20" size={20} />;
    }
    const ext = item.name.split(".").pop()?.toLowerCase() || "";
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
      return <FileArchive className="text-purple-400 shrink-0" size={20} />;
    }
    if (["json", "yml", "yaml", "properties", "conf", "toml", "xml", "js", "ts", "py", "sh"].includes(ext)) {
      return <FileCode className="text-emerald-400 shrink-0" size={20} />;
    }
    if (["txt", "log", "md"].includes(ext)) {
      return <FileText className="text-sky-400 shrink-0" size={20} />;
    }
    return <File className="text-slate-400 shrink-0" size={20} />;
  };

  // Path segments for breadcrumbs
  const pathSegments = path.split("/").filter(Boolean);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 h-full w-full bg-transparent p-3 sm:p-5">
      
      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold backdrop-blur-xl ${
              toast.type === "success" 
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300" 
                : "bg-red-950/90 border-red-500/30 text-red-300"
            }`}
          >
            {toast.type === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Breadcrumb Bar */}
      <div className="p-4 md:p-5 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-border shrink-0 gap-4 shadow-lg">
        
        {/* Left: Back & Interactive Breadcrumbs */}
        <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar py-1">
          <button 
            onClick={goUp} 
            disabled={path === "/" && !editingFile} 
            className="p-2 bg-muted/80 hover:bg-muted rounded-xl text-foreground disabled:opacity-30 transition-colors shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Breadcrumb links */}
          <div className="flex items-center space-x-1 font-mono text-xs font-semibold text-foreground bg-slate-950/70 px-3 py-2 rounded-xl border border-border backdrop-blur-md shadow-inner">
            <button 
              onClick={() => navigateToSegment(-1)}
              className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
            >
              Root
            </button>
            {pathSegments.map((seg, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                <button
                  onClick={() => navigateToSegment(i)}
                  className={`max-w-[120px] truncate hover:underline ${
                    i === pathSegments.length - 1 ? "text-foreground font-bold" : "text-indigo-300 hover:text-indigo-200"
                  }`}
                >
                  {seg}
                </button>
              </React.Fragment>
            ))}
            {editingFile && (
              <>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                <span className="text-emerald-400 font-bold max-w-[140px] truncate">{editingFile}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        {!editingFile && (
          <div className="flex-1 w-full max-w-xs sm:max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search files & folders..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-background/80 border border-border rounded-xl py-2 pl-9 pr-4 text-xs text-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right: Actions (Create, Upload, Save) */}
        <div className="flex items-center space-x-2 shrink-0 justify-end">
          {!editingFile ? (
            <>
              {uploadProgress !== null ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-indigo-600/30 rounded-xl text-xs font-semibold border border-indigo-500/40 text-indigo-300">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-300 border-t-transparent animate-spin"></div>
                  <span>{uploadProgress === 100 ? "Processing..." : `${uploadProgress}%`}</span>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => { setModalInput(""); setActiveModal("create_file"); }} 
                    className="flex items-center space-x-1.5 px-3 py-2 bg-muted/80 hover:bg-muted rounded-xl text-xs font-semibold text-foreground border border-border hover:border-indigo-500/40 transition-all cursor-pointer"
                    title="New File"
                  >
                    <FilePlus size={15} className="text-indigo-400" />
                    <span className="hidden md:inline">File</span>
                  </button>
                  <button 
                    onClick={() => { setModalInput(""); setActiveModal("create_folder"); }} 
                    className="flex items-center space-x-1.5 px-3 py-2 bg-muted/80 hover:bg-muted rounded-xl text-xs font-semibold text-foreground border border-border hover:border-indigo-500/40 transition-all cursor-pointer"
                    title="New Folder"
                  >
                    <FolderPlus size={15} className="text-amber-400" />
                    <span className="hidden md:inline">Folder</span>
                  </button>
                  <label className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer">
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                    <Upload size={15} /> 
                    <span>Upload</span>
                  </label>
                  <button
                    onClick={fetchFiles}
                    className="p-2 bg-muted/80 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground border border-border transition-all"
                    title="Refresh Directory"
                  >
                    <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </>
              )}
            </>
          ) : (
            <button 
              disabled={isSaving} 
              onClick={saveFile} 
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main File Content / List Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar flex flex-col min-h-0 relative bg-slate-950/40 rounded-2xl border border-border-subtle">
        <AnimatePresence mode="wait">
          {editingFile ? (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <textarea 
                value={fileContent} 
                onChange={(e) => setFileContent(e.target.value)}
                className="flex-1 w-full h-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 font-mono text-xs sm:text-sm focus:outline-none focus:border-indigo-500/50 resize-none custom-scrollbar min-h-0 shadow-inner leading-relaxed"
                spellCheck={false}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="filelist"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1"
            >
              {/* Table Header */}
              {filteredFiles.length > 0 && (
                <div className="flex items-center px-4 py-2.5 mb-2 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button onClick={toggleSelectAll} className="mr-3 transition-colors hover:text-foreground">
                    {selectedFiles.size === filteredFiles.length ? (
                      <CheckSquare size={18} className="text-indigo-400" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                  <span className="flex-1">Name</span>
                  <span className="w-24 text-right hidden sm:block">Size</span>
                  <span className="w-32 text-right pr-2">Actions</span>
                </div>
              )}

              {filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                  <Folder className="w-12 h-12 stroke-[1.5] text-slate-600" />
                  <p>This directory is empty or no items match your filter.</p>
                </div>
              )}

              {/* Items List */}
              {filteredFiles.map(f => {
                const isSelected = selectedFiles.has(f.name);
                const isMenuOpen = openMenuRow === f.name;

                return (
                  <div 
                    key={f.name} 
                    onClick={(e) => toggleSelectFile(f.name, e)}
                    className={`flex items-center justify-between p-3 rounded-xl group transition-all cursor-pointer mb-1 border relative ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm' 
                        : 'bg-card/40 border-transparent hover:bg-card hover:border-border/60'
                    }`}
                  >
                    {/* Left: Checkbox & Icon & Name */}
                    <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                      <button 
                        onClick={(e) => toggleSelectFile(f.name, e)} 
                        className={`transition-colors shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      <div 
                        className="flex items-center space-x-3 flex-1 overflow-hidden" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (f.isDirectory) traverse(f.name); 
                          else openFile(f.name); 
                        }}
                      >
                        {getFileIcon(f)}
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground text-sm truncate hover:text-indigo-400 transition-colors">
                            {f.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: File Size & Quick Actions */}
                    <div className="flex items-center space-x-3 shrink-0 pl-2">
                      <span className="hidden sm:block text-xs font-mono text-muted-foreground w-20 text-right">
                        {f.isDirectory ? "Folder" : `${(f.size / 1024).toFixed(1)} KB`}
                      </span>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center space-x-1">
                        {/* Dropdown Options Button */}
                        <div className="relative" ref={isMenuOpen ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRow(isMenuOpen ? null : f.name);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {/* Row Options Context Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 py-1.5 backdrop-blur-xl">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(f.name, f.isDirectory); }}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 flex items-center gap-2.5 transition-colors"
                              >
                                <Download size={14} className="text-indigo-400" />
                                <span>Download {f.isDirectory ? "(as .zip)" : ""}</span>
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); openRenameModal(f); }}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-blue-600/20 hover:text-blue-300 flex items-center gap-2.5 transition-colors"
                              >
                                <Edit2 size={14} className="text-blue-400" />
                                <span>Rename {f.isDirectory ? "Folder" : "File"}</span>
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); openZipModal(f); }}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-emerald-600/20 hover:text-emerald-300 flex items-center gap-2.5 transition-colors"
                              >
                                <Archive size={14} className="text-emerald-400" />
                                <span>Compress to .ZIP</span>
                              </button>

                              {f.name.endsWith(".zip") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUnzipItem(f.name); }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-amber-600/20 hover:text-amber-300 flex items-center gap-2.5 transition-colors"
                                >
                                  <FolderDown size={14} className="text-amber-400" />
                                  <span>Extract Archive</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-800" />

                              <button
                                onClick={(e) => { e.stopPropagation(); openDeleteModal(f); }}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete {f.isDirectory ? "Folder" : "File"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Bar for Selected Items */}
        <AnimatePresence>
          {selectedFiles.size > 0 && !editingFile && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 px-4 flex items-center space-x-3 z-30"
            >
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                {selectedFiles.size} selected
              </span>

              <div className="h-5 w-px bg-slate-700" />

              {/* Download Selected */}
              <button 
                onClick={handleDownloadSelected} 
                className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium"
                title="Download Selected (Streams file or ZIP bundle)"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Download</span>
              </button>

              {/* Rename if 1 item selected */}
              {selectedFiles.size === 1 && (
                <button 
                  onClick={() => {
                    const name = Array.from(selectedFiles)[0];
                    const item = files.find(f => f.name === name);
                    if (item) openRenameModal(item);
                  }} 
                  className="p-2 text-slate-300 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium"
                  title="Rename"
                >
                  <Edit2 size={16} />
                  <span className="hidden sm:inline">Rename</span>
                </button>
              )}

              {/* Unzip if 1 zip selected */}
              {selectedFiles.size === 1 && (Array.from(selectedFiles)[0] as string).endsWith('.zip') && (
                <button 
                  onClick={() => handleUnzipItem(Array.from(selectedFiles)[0] as string)} 
                  disabled={isUnzipping} 
                  className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" 
                  title="Extract ZIP"
                >
                  {isUnzipping ? (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500/50 border-t-amber-500 animate-spin" />
                  ) : (
                    <FolderDown size={16} />
                  )}
                  <span className="hidden sm:inline">Extract</span>
                </button>
              )}

              {/* Zip selected */}
              <button 
                onClick={() => openZipModal()} 
                disabled={isZipping} 
                className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" 
                title="Compress Selected into ZIP"
              >
                {isZipping ? (
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500/50 border-t-emerald-500 animate-spin" />
                ) : (
                  <Archive size={16} />
                )}
                <span className="hidden sm:inline">Zip</span>
              </button>

              {/* Delete selected */}
              <button 
                onClick={() => openDeleteModal()} 
                disabled={isDeleting} 
                className="p-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" 
                title="Delete Selected"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-red-500/50 border-t-red-500 animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span className="hidden sm:inline">Delete</span>
              </button>

              <div className="h-5 w-px bg-slate-700" />

              <button 
                onClick={() => setSelectedFiles(new Set())} 
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all" 
                title="Clear Selection"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {activeModal === "create_file" && <><FilePlus size={18} className="text-indigo-400" /> Create New File</>}
                  {activeModal === "create_folder" && <><FolderPlus size={18} className="text-amber-400" /> Create New Folder</>}
                  {activeModal === "rename" && <><Edit2 size={18} className="text-blue-400" /> Rename {targetItem?.isDirectory ? "Folder" : "File"}</>}
                  {activeModal === "delete" && <><Trash2 size={18} className="text-red-400" /> Confirm Deletion</>}
                  {activeModal === "zip" && <><Archive size={18} className="text-emerald-400" /> Compress Selected Items</>}
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div>
                {activeModal === "create_file" && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground">File Name (including extension)</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. server.properties, config.yml"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitCreateFile()}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["config.yml", "server.properties", "settings.json", "eula.txt"].map(ext => (
                        <button
                          key={ext}
                          onClick={() => setModalInput(ext)}
                          className="text-[11px] bg-muted hover:bg-muted-hover text-indigo-300 px-2 py-1 rounded-lg border border-border transition-colors"
                        >
                          {ext}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeModal === "create_folder" && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground">Folder Name</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. plugins, mods, backups"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitCreateFolder()}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {activeModal === "rename" && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground">New Name</label>
                    <input
                      autoFocus
                      type="text"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitRename()}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {activeModal === "zip" && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground">Archive Name (.zip)</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="archive.zip"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitZip()}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {activeModal === "delete" && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      Are you sure you want to permanently delete {targetItem ? (
                        <strong className="text-white">'{targetItem.name}'</strong>
                      ) : (
                        <strong className="text-white">{selectedFiles.size} selected item(s)</strong>
                      )}? This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted-hover text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>

                {activeModal === "create_file" && (
                  <button onClick={submitCreateFile} className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md">
                    Create File
                  </button>
                )}
                {activeModal === "create_folder" && (
                  <button onClick={submitCreateFolder} className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md">
                    Create Folder
                  </button>
                )}
                {activeModal === "rename" && (
                  <button onClick={submitRename} className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md">
                    Rename
                  </button>
                )}
                {activeModal === "zip" && (
                  <button onClick={submitZip} className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md">
                    Compress
                  </button>
                )}
                {activeModal === "delete" && (
                  <button onClick={submitDelete} disabled={isDeleting} className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md disabled:opacity-50">
                    {isDeleting ? "Deleting..." : "Delete Permanently"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(isUnzipping || isZipping || isSaving || isDeleting) && <LoadingOverlay />}
    </div>
  );
}
