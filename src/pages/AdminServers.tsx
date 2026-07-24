import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Server, Settings, Search, Trash2, Edit2, Play, Square, PauseCircle, MoreVertical, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingServer, setEditingServer] = useState<any>(null);
  const [ram, setRam] = useState("");
  const [cpu, setCpu] = useState("");
  const [disk, setDisk] = useState("");
  
  const [suspendingServer, setSuspendingServer] = useState<any>(null);
  const [suspendDuration, setSuspendDuration] = useState("null");

  const [deletingServer, setDeletingServer] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [serversRes, usersRes] = await Promise.all([
        axios.get("/api/servers"),
        axios.get("/api/system/users")
      ]);
      setServers(serversRes.data);
      setUsers(usersRes.data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUsername = (id: string) => {
    const u = users.find(u => u.id === id);
    return u ? u.username : "Unknown";
  };

  const handleUpdateResources = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/servers/${editingServer.id}/resources`, {
        ram: Number(ram),
        cpu: Number(cpu),
        disk: Number(disk)
      });
      setEditingServer(null);
      fetchData();
    } catch (e) {
      alert("Failed to update resources");
    }
  };

  const handleUpdateSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const duration = suspendDuration === "null" ? null : suspendDuration;
      await axios.put(`/api/servers/${suspendingServer.id}/suspend`, {
        suspendDuration: duration
      });
      setSuspendingServer(null);
      fetchData();
    } catch (e) {
      alert("Failed to update suspension");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/servers/${deletingServer.id}`);
      setDeletingServer(null);
      fetchData();
    } catch (e) {
      alert("Failed to delete server");
    }
  };

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manage Servers</h1>
        <p className="text-zinc-400">View and manage all instances across the panel.</p>
      </div>

      <div className="bg-black/20 border border-white/10 rounded-xl p-4 mb-6 flex items-center">
        <Search className="w-5 h-5 text-zinc-400 mr-3" />
        <input 
          type="text"
          placeholder="Search servers by name or ID..."
          className="bg-transparent outline-none flex-1 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredServers.map(server => (
            <div key={server.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <Server className="text-indigo-400 w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{server.name}</h3>
                  <div className="flex gap-3 text-sm text-zinc-400 mt-1">
                    <span>{server.type} • {server.version}</span>
                    <span>Owner: {getUsername(server.owner)}</span>
                    {server.suspended && <span className="text-red-400 font-bold ml-2">SUSPENDED</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <ActionMenu 
                  server={server} 
                  setEditingServer={setEditingServer} 
                  setRam={setRam} 
                  setCpu={setCpu} 
                  setDisk={setDisk} 
                  setSuspendingServer={setSuspendingServer} 
                  setSuspendDuration={setSuspendDuration} 
                  setDeletingServer={setDeletingServer} 
                />
                <Link 
                  to={`/servers/${server.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors sm:ml-2 border border-indigo-400/20 text-sm font-medium shadow-md shadow-indigo-500/20"
                >
                  <span className="hidden sm:inline">Console</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
          {filteredServers.length === 0 && (
            <div className="text-center py-10 text-zinc-500">
              No servers found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Edit Resources Modal */}
      <AnimatePresence>
        {editingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-white/10 rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-xl font-bold mb-4">Edit Resources for {editingServer.name}</h2>
              <form onSubmit={handleUpdateResources}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">RAM (GB)</label>
                    <input type="number" value={ram} onChange={e => setRam(e.target.value)} required min="1" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">CPU (%)</label>
                    <input type="number" value={cpu} onChange={e => setCpu(e.target.value)} required min="50" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Disk (GB)</label>
                    <input type="number" value={disk} onChange={e => setDisk(e.target.value)} required min="1" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingServer(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspend Modal */}
      <AnimatePresence>
        {suspendingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-white/10 rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-xl font-bold mb-4">Manage Suspension for {suspendingServer.name}</h2>
              <form onSubmit={handleUpdateSuspend}>
                <div className="mb-6">
                  <label className="block text-sm text-zinc-400 mb-2">Suspension Duration</label>
                  <select 
                    value={suspendDuration} 
                    onChange={e => setSuspendDuration(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none"
                  >
                    <option value="null">Not Suspended (Active)</option>
                    <option value="24_hours">24 Hours</option>
                    <option value="1_week">1 Week</option>
                    <option value="1_month">1 Month</option>
                    <option value="2_months">2 Months</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setSuspendingServer(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold">Apply</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deletingServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-red-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-xl font-bold mb-2 text-red-400">Delete Server?</h2>
              <p className="text-zinc-400 mb-6">Are you sure you want to permanently delete <strong>{deletingServer.name}</strong>? This action cannot be undone and will destroy all data.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeletingServer(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold">Yes, Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}


function ActionMenu({ server, setEditingServer, setRam, setCpu, setDisk, setSuspendingServer, setSuspendDuration, setDeletingServer }: any) {
  const [open, setOpen] = useState(false);
  
  // Close when clicking outside
  useEffect(() => {
    const handleClick = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setOpen(!open)}
        className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg transition-colors border border-white/5"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-[#1a1a1f] border border-white/10 rounded-xl shadow-xl z-40 overflow-hidden flex flex-col py-1"
          >
            <button 
              onClick={() => {
                setEditingServer(server);
                setRam(server.ram.toString());
                setCpu(server.cpu.toString());
                setDisk(server.disk.toString());
                setOpen(false);
              }}
              className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Edit2 className="w-4 h-4 mr-3 text-blue-400" />
              Edit Resources
            </button>
            <button 
              onClick={() => {
                setSuspendingServer(server);
                setSuspendDuration(server.suspendDuration || "null");
                setOpen(false);
              }}
              className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <PauseCircle className="w-4 h-4 mr-3 text-amber-400" />
              {server.suspended ? "Manage Suspension" : "Suspend Server"}
            </button>
            <div className="h-px bg-white/10 my-1 mx-2"></div>
            <button 
              onClick={() => {
                setDeletingServer(server);
                setOpen(false);
              }}
              className="flex items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Delete Server
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
