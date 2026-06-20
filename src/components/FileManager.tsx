import { useEffect, useState } from "react";
import axios from "axios";
import { Folder, File, ArrowLeft, Upload, Trash2, Edit2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FileManager({ serverId }: { serverId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [path, setPath] = useState("/");
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

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
      alert("File saved!");
    } catch(e) {
      alert("Failed to save file.");
    }
  };

  const deleteFile = async (name: string) => {
    if(confirm("Delete this?")) {
      await axios.delete(`/api/servers/${serverId}/files`, {
        data: { path: path.endsWith("/") ? path + name : path + "/" + name }
      });
      fetchFiles();
    }
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
      alert("Failed to rename");
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden relative h-[50vh] min-h-[300px] max-h-[500px]">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950 shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={goUp} disabled={path === "/" && !editingFile} className="p-2 bg-gray-900 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-50">
            <ArrowLeft size={18} />
          </button>
          <div className="font-mono text-sm text-gray-300 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
            {editingFile ? `Editing: ${editingFile}` : path}
          </div>
        </div>
        {editingFile && (
          <button onClick={saveFile} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
            <Save size={16} /> <span>Save</span>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col min-h-0">
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
                className="flex-1 w-full h-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 font-mono text-sm focus:outline-none focus:border-blue-500/50 resize-none custom-scrollbar min-h-0"
                spellCheck={false}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="filelist"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1"
            >
              {files.length === 0 && <p className="text-gray-500 text-sm text-center py-10">Directory is empty.</p>}
              {files.map(f => (
                <div key={f.name} className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-xl group transition-colors">
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => f.isDirectory ? traverse(f.name) : openFile(f.name)}>
                    {f.isDirectory ? <Folder className="text-blue-400" size={20} /> : <File className="text-gray-400" size={20} />}
                    {renamingFile === f.name ? (
                      <input 
                        autoFocus
                        type="text" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        onBlur={() => handleRename(f.name)}
                        onKeyDown={e => e.key === 'Enter' && handleRename(f.name)}
                        className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
                      />
                    ) : (
                      <span className="font-medium text-gray-300 text-sm">{f.name}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {!f.isDirectory && <span className="text-xs text-gray-500 w-16 text-right">{(f.size/1024).toFixed(1)} KB</span>}
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex space-x-2">
                       <button onClick={() => { setRenamingFile(f.name); setNewName(f.name); }} className="text-gray-500 hover:text-blue-400 p-1">
                         <Edit2 size={16} />
                       </button>
                       <button onClick={() => deleteFile(f.name)} className="text-gray-500 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
