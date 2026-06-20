import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateServer() {
  const [name, setName] = useState("");
  const [ram, setRam] = useState<string>("2");
  const [cpu, setCpu] = useState<string>("100");
  const [disk, setDisk] = useState<string>("10");
  const [port, setPort] = useState<string>("25565");
  const [version, setVersion] = useState("1.21.1");
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/api/system/paper-versions").then(res => {
      setVersions(res.data);
      if(res.data.length > 0) setVersion(res.data[0]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/servers", { 
        name, 
        ram: Number(ram), 
        cpu: Number(cpu),
        disk: Number(disk),
        port: Number(port), 
        version 
      });
      navigate("/servers");
    } catch (e) {
      alert("Error creating server");
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Create Minecraft Server</h1>
      
      <form onSubmit={handleSubmit} className="bg-gray-950 p-6 md:p-8 rounded-2xl border border-gray-800 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Server Name</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Survival 1.21"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">RAM (GB)</label>
            <input 
              type="number" 
              required 
              min={1}
              value={ram} 
              onChange={e => setRam(e.target.value)} 
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">CPU Limit (%)</label>
            <input 
              type="number" 
              required 
              min={10}
              value={cpu} 
              onChange={e => setCpu(e.target.value)} 
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Disk Limit (GB)</label>
            <input 
              type="number" 
              required 
              min={1}
              value={disk} 
              onChange={e => setDisk(e.target.value)} 
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Port</label>
            <input 
              type="number" 
              required 
              value={port} 
              onChange={e => setPort(e.target.value)} 
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">PaperMC Version</label>
          <select 
            value={version} 
            onChange={e => setVersion(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 font-medium text-white rounded-xl transition-colors mt-4 disabled:opacity-50"
        >
          {loading ? "Creating container..." : "Create Server"}
        </button>
      </form>
    </div>
  );
}
