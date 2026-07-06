import React, { useEffect, useState } from "react";
import axios from "axios";
import { Folder, File, ArrowLeft, Upload, Trash2, Edit2, Save, Archive, Search, X, CheckSquare, Square, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FileManager({ serverId }: { serverId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [path, setPath] = useState("/");
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
      if (res.data.isFile) {
         setFileContent(res.data.content);
      } else {
         setFiles(res.data);
      }
    } catch (e) {
      setFiles([]);
    }
  };

  useEffect(() => {
    fetchFiles();
    setSelectedFiles(new Set());
    setSearchQuery("");
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

  const traverse = (dirName: string) => {
    setPath(path.endsWith("/") ? path + dirName : path + "/" + dirName);
  };

  const openFile = async (name: string) => {
    if (!name.match(/\.(txt|json|yml|yaml|properties|log)$/)) {
      alert("Only text formats are supported for editing.");
      return;
    }
    const fullPath = path.endsWith("/") ? path + name : path + "/" + name;
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=${encodeURIComponent(fullPath)}`);
      if (res.data.isFile) {
         setEditingFile(name);
         setFileContent(res.data.content);
      }
    } catch (e) {
      alert("Failed to load file");
    }
  };

  const saveFile = async () => {
    try {
      const fullPath = path.endsWith("/") ? path + editingFile : path + "/" + editingFile;
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: fullPath,
        content: fileContent
      });
      console.log("File saved!");
    } catch(e) {
      console.error("Failed to save file.", e);
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.size} items?`)) return;
    
    try {
      const p = path.endsWith("/") ? path : path + "/";
      const pathsToDelete = Array.from(selectedFiles).map(name => p + name);
      
      setDeletingFile("multiple");
      await axios.delete(`/api/servers/${serverId}/files`, {
        data: { paths: pathsToDelete }
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch(e) {
      console.error("Failed to delete files", e);
      alert("Failed to delete files");
    } finally {
      setDeletingFile(null);
    }
  };

  const handleRenameSelected = () => {
    if (selectedFiles.size !== 1) return;
    const name = Array.from(selectedFiles)[0];
    setRenamingFile(name);
    setNewName(name);
  };

  const handleRename = async (oldName: string) => {
    if(!newName.trim() || newName === oldName) {
      setRenamingFile(null);
      return;
    }
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/rename`, {
        oldPath: p + oldName,
        newPath: p + newName
      });
      setRenamingFile(null);
      fetchFiles();
    } catch(e) {
      console.error("Failed to rename", e);
    }
  };

  const handleUnzipSelected = async () => {
    if (selectedFiles.size !== 1) return;
    const name = Array.from(selectedFiles)[0];
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/unzip`, {
        path: p + name
      });
      setSelectedFiles(new Set());
      fetchFiles();
      console.log("Unzipped successfully");
    } catch(e) {
      console.error("Failed to unzip", e);
    }
  };

  const handleZipSelected = async () => {
    if (selectedFiles.size === 0) return;
    const outputName = prompt("Enter archive name:", "archive.zip");
    if (!outputName) return;

    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/zip`, {
        dirPath: p,
        fileNames: Array.from(selectedFiles),
        outputName: outputName.endsWith(".zip") ? outputName : outputName + ".zip"
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (e) {
      console.error("Failed to zip files", e);
    }
  };

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
      fetchFiles();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadProgress(null);
      e.target.value = ""; // clear input
    }
  };

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

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl rounded-none md:rounded-2xl border-0 md:border border-gray-700/50 flex-1 flex flex-col overflow-hidden relative min-h-0 h-full shadow-2xl w-full">
      <div className="p-3 md:p-4 border-b border-gray-700/50 flex flex-col sm:flex-row items-center justify-between bg-gray-900/40 shrink-0 gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center space-x-3">
            <button onClick={goUp} disabled={path === "/" && !editingFile} className="p-2 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg text-gray-300 disabled:opacity-50 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="font-mono text-sm text-gray-200 bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/50 backdrop-blur-md max-w-[150px] sm:max-w-xs truncate">
              {editingFile ? `Editing: ${editingFile}` : path}
            </div>
          </div>
          
          <div className="flex sm:hidden items-center space-x-2">
            {!editingFile ? (
              <div className="relative">
                {uploadProgress !== null ? (
                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-600/50 rounded-lg border border-indigo-500/50 text-white">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-transparent animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="flex items-center justify-center w-8 h-8 bg-indigo-600/90 hover:bg-indigo-500/90 rounded-lg text-white transition-colors">
                      <Upload size={16} />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button onClick={saveFile} className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors">
                <Save size={16} />
              </button>
            )}
          </div>
        </div>
        
        {!editingFile && (
          <div className="flex-1 w-full px-0 sm:px-4 order-last sm:order-none">
            <div className="relative w-full max-w-2xl mx-auto shadow-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search files..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-full py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>
        )}

        {!editingFile ? (
          <div className="relative hidden sm:block">
            {uploadProgress !== null ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/50 rounded-lg text-sm font-medium border border-indigo-500/50 text-white">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-transparent animate-spin mr-1"></div>
                <span>{uploadProgress}%</span>
              </div>
            ) : (
              <>
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500/90 rounded-full text-sm font-medium text-white transition-colors backdrop-blur-sm shadow-lg shadow-indigo-500/20">
                  <Upload size={16} /> <span>Upload</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <button onClick={saveFile} className="hidden sm:flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-medium text-white transition-colors shadow-lg shadow-blue-500/20">
            <Save size={16} /> <span>Save</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col min-h-0 relative">
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
                className="flex-1 w-full h-full bg-gray-950/60 border border-gray-700/50 rounded-xl p-4 text-gray-200 font-mono text-sm focus:outline-none focus:border-blue-500/50 resize-none custom-scrollbar min-h-0 shadow-inner"
                spellCheck={false}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="filelist"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1"
            >
              {/* Header row with select all */}
              {filteredFiles.length > 0 && (
                <div className="flex items-center px-3 py-2 mb-2 border-b border-gray-700/50">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white mr-4 transition-colors">
                    {selectedFiles.size === filteredFiles.length ? <CheckSquare size={18} className="text-indigo-400" /> : <Square size={18} />}
                  </button>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Name</span>
                </div>
              )}

              {filteredFiles.length === 0 && <p className="text-gray-400 text-sm text-center py-10">Directory is empty or no files match search.</p>}
              
              {filteredFiles.map(f => {
                const isSelected = selectedFiles.has(f.name);
                return (
                  <div 
                    key={f.name} 
                    onClick={(e) => toggleSelectFile(f.name, e)}
                    className={`flex items-center justify-between p-3 rounded-xl group transition-all cursor-pointer mb-1 border ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-gray-800/20 border-transparent hover:bg-gray-800/60 hover:border-gray-700/50'}`}
                  >
                    <div className="flex items-center space-x-4 flex-1 overflow-hidden">
                      <button onClick={(e) => toggleSelectFile(f.name, e)} className={`transition-colors shrink-0 ${isSelected ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <div className="flex items-center space-x-3 flex-1 overflow-hidden hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); f.isDirectory ? traverse(f.name) : openFile(f.name); }}>
                        {f.isDirectory ? <Folder className="text-blue-400 shrink-0" size={20} /> : <File className="text-gray-400 shrink-0" size={20} />}
                        {renamingFile === f.name ? (
                          <input 
                            autoFocus
                            type="text" 
                            value={newName} 
                            onClick={e => e.stopPropagation()}
                            onChange={e => setNewName(e.target.value)}
                            onBlur={() => handleRename(f.name)}
                            onKeyDown={e => e.key === 'Enter' && handleRename(f.name)}
                            className="bg-gray-900/80 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500/50 w-full"
                          />
                        ) : (
                          <span className="font-medium text-gray-200 text-sm truncate">{f.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4 pl-4 shrink-0">
                      {!f.isDirectory && <span className="hidden sm:block text-xs text-gray-400 w-16 text-right">{(f.size/1024).toFixed(1)} KB</span>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Menu for Selected Files */}
        <AnimatePresence>
          {selectedFiles.size > 0 && !editingFile && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-2 flex items-center space-x-2 z-10"
            >
              <span className="px-3 text-sm font-medium text-gray-300">
                {selectedFiles.size} selected
              </span>
              <div className="h-6 w-px bg-gray-700"></div>
              
              {selectedFiles.size === 1 && (
                <>
                  <button onClick={handleRenameSelected} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded-lg transition-colors" title="Rename">
                    <Edit2 size={16} />
                  </button>
                  {(Array.from(selectedFiles)[0] as string).endsWith('.zip') && (
                    <button onClick={handleUnzipSelected} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700/50 rounded-lg transition-colors" title="Unzip">
                      <Archive size={16} />
                    </button>
                  )}
                </>
              )}
              
              <button onClick={handleZipSelected} className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 rounded-lg transition-colors" title="Zip Selected">
                <Download size={16} />
              </button>
              
              <button onClick={deleteSelectedFiles} disabled={deletingFile === "multiple"} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50" title="Delete Selected">
                {deletingFile === "multiple" ? (
                  <div className="w-4 h-4 rounded-full border-2 border-red-500/50 border-t-red-500 animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
              </button>

              <div className="h-6 w-px bg-gray-700"></div>
              <button onClick={() => setSelectedFiles(new Set())} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors" title="Clear Selection">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
