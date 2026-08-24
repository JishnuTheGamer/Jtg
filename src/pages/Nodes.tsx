// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Server as ServerIcon, Plus, Trash2, Key, Terminal, Globe, ServerCog, X, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Nodes() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupPort, setSetupPort] = useState("6768");
  const [cfToken, setCfToken] = useState("");
  const [formData, setFormData] = useState({ name: "", ip: "", port: "", key: "" });

  const fetchNodes = async () => {
    try {
      const res = await axios.get("/api/nodes");
      setNodes(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    let { name, ip, port, key } = formData;
    
    // Auto-detect domain and format as https if no protocol is given
    if (ip && !ip.startsWith("http://") && !ip.startsWith("https://") && ip.match(/[a-zA-Z]/) && !ip.match(/^[0-9.]+$/)) {
       ip = "https://" + ip;
    }

    try {
      await axios.post("/api/nodes", { name, ip, port, key });
      setIsAddModalOpen(false);
      setFormData({ name: "", ip: "", port: "", key: "" });
      fetchNodes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this node? Server containers on this node will no longer be accessible from the panel.")) return;
    try {
      await axios.delete(`/api/nodes/${id}`);
      fetchNodes();
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.role !== "admin" && user?.role !== "owner") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ServerCog className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>You do not have permission to manage nodes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Infrastructure Nodes</h1>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-500">
              BETA
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your connected VPS nodes and server resources (External node connections are currently in Beta).
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchNodes}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsSetupModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all"
          >
            <Terminal className="h-4 w-4" />
            Get Setup Command
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            Connect Node
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200 text-sm flex items-start gap-3">
        <span className="text-lg">🧪</span>
        <div>
          <strong className="font-semibold text-amber-400">Beta Testing Notice:</strong> Multi-node cluster feature & external VPS node setup (direct IP or Cloudflare Tunnels) are currently in <strong>Beta Testing</strong>. For the best stability, use the <strong>Local Node</strong> (built-in).
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map(node => (
            <div key={node.id} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${node.isLocal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                    <ServerIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{node.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {node.ip}{node.port !== 6768 && node.port !== 0 ? `:${node.port}` : ''}
                    </div>
                  </div>
                </div>
                {node.isLocal && (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-500">
                    Built-in
                  </span>
                )}
              </div>
              
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className={`h-2 w-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="capitalize">{node.status}</span>
                </div>
                
                {!node.isLocal && (
                  <button
                    onClick={() => handleDelete(node.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup Command Modal */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="text-xl font-bold">Node Setup Command</h2>
              <button onClick={() => setIsSetupModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                Run this command as root on your Ubuntu/Debian VPS to automatically install Docker, set up the agent, and generate a connection key.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Custom Port (e.g. 6768)</label>
                <input 
                  type="text" 
                  value={setupPort}
                  onChange={(e) => setSetupPort(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="6768"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Cloudflare Tunnel Token (Optional)</label>
                <input 
                  type="text" 
                  value={cfToken}
                  onChange={(e) => setCfToken(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="eyJh..."
                />
                <p className="text-xs text-muted-foreground mt-1">If provided, sets up HTTP connection using Cloudflare Tunnel (so you can use your own domain).</p>
              </div>

              <div className="relative">
                <pre className="overflow-x-auto rounded-xl bg-black/50 p-4 text-sm text-emerald-400 border border-white/5 whitespace-pre-wrap break-all">
                  <code>{`curl -sSL ${window.location.origin}/node.sh | bash -s -- --port ${setupPort || "6768"}${cfToken ? ` --cf-token ${cfToken}` : ""}`}</code>
                </pre>
                <button 
                  onClick={() => navigator.clipboard.writeText(`curl -sSL ${window.location.origin}/node.sh | bash -s -- --port ${setupPort || "6768"}${cfToken ? ` --cf-token ${cfToken}` : ""}`)}
                  className="absolute right-2 top-2 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                * Requires a fresh Ubuntu 20.04/22.04 installation. The script will output the Node Key upon completion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="text-xl font-bold">Connect Node</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddNode} className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Node Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. EU Node 01"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">IP or Domain/URL</label>
                  <input
                    required
                    type="text"
                    value={formData.ip}
                    onChange={e => setFormData({...formData, ip: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="192.168.1.100 or https://tunnel.yourdomain.com"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">For Cloudflare Tunnels, include <strong>https://</strong> in the URL, and leave Port blank (or 443).</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Port (Optional)</label>
                  <input
                    type="text"
                    value={formData.port}
                    onChange={e => setFormData({...formData, port: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 6768"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Connection Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="password"
                    value={formData.key}
                    onChange={e => setFormData({...formData, key: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Paste the key from node setup"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 p-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Connect Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
