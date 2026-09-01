import React, { useState } from 'react';
import { Terminal, Copy, Check, Server, Shield, Database } from 'lucide-react';

export default function DeveloperPanel() {
  const [config, setConfig] = useState({
    name: 'mc-server',
    type: 'PAPER',
    memory: '2G',
    port: '25565',
    version: 'LATEST',
  });
  const [copied, setCopied] = useState(false);

  const generateCompose = () => {
    return `services:
  minecraft:
    image: itzg/minecraft-server
    container_name: ${config.name}
    ports:
      - "${config.port}:25565"
    environment:
      EULA: "TRUE"
      TYPE: "${config.type}"
      VERSION: "${config.version}"
      MEMORY: "${config.memory}"
      # Docker Rootless Compatibility:
      # By default, the image drops privileges to UID 1000. 
      # In rootless Docker, volume ownership gets mapped to your host user.
      # Setting UID=0 prevents the container from internally switching users,
      # avoiding permission errors when writing to the host volume mount.
      UID: "0"
      GID: "0"
    volumes:
      # The :Z flag labels the volume for SELinux (used on Fedora/RHEL).
      # This is crucial for rootless Docker to access the directory.
      - ./data:/data:Z
    # Keeps the console interactive
    stdin_open: true
    tty: true
    # Use docker-compose up/down to manage lifecycle. 
    # Optional restart policy if the server crashes:
    restart: on-failure:3
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCompose());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center space-x-4 border-b border-slate-800 pb-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Minecraft Docker Builder</h1>
            <p className="text-slate-500 text-sm mt-1">
              Generate rootless <code className="text-emerald-400/80">docker-compose</code> configurations for <code className="text-emerald-400/80">itzg/minecraft-server</code>.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Configuration Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
                <Database className="w-5 h-5 mr-2 text-slate-400" />
                Server Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Container Name</label>
                  <input
                    type="text"
                    name="name"
                    value={config.name}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Server Type</label>
                  <select
                    name="type"
                    value={config.type}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none"
                  >
                    <option value="VANILLA">Vanilla</option>
                    <option value="PAPER">Paper (Recommended)</option>
                    <option value="FABRIC">Fabric</option>
                    <option value="FORGE">Forge</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Memory Limit</label>
                    <input
                      type="text"
                      name="memory"
                      value={config.memory}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Host Port</label>
                    <input
                      type="text"
                      name="port"
                      value={config.port}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Minecraft Version</label>
                  <input
                    type="text"
                    name="version"
                    value={config.version}
                    onChange={handleChange}
                    placeholder="LATEST or e.g. 1.20.4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-6">
               <h3 className="text-emerald-400 font-semibold flex items-center mb-2">
                 <Shield className="w-5 h-5 mr-2" />
                 Rootless Mode Fixes
               </h3>
               <p className="text-sm text-emerald-200/70 leading-relaxed">
                 Using <strong>UID=0</strong> and <strong>GID=0</strong> tells the entrypoint script not to switch users internally. Because the container is rootless, "root" inside the container safely maps to your unprivileged user on the host. This fixes standard volume permission denied errors without needing <code className="bg-emerald-900/40 px-1 rounded">docker unshare</code>.
               </p>
            </div>
          </div>

          {/* Generated File & Instructions */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-[#0f111a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300 font-mono">compose.yaml</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy File'}</span>
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="text-sm text-slate-300 font-mono leading-relaxed">
                  <code>{generateCompose()}</code>
                </pre>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">How to deploy without systemctl</h2>
              <ol className="list-decimal list-inside space-y-4 text-slate-400">
                <li>
                  <span className="text-slate-200">Create a new directory for your server and enter it:</span>
                  <div className="mt-2 bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-sm text-emerald-400">
                    mkdir {config.name} && cd {config.name}
                  </div>
                </li>
                <li>
                  <span className="text-slate-200">Create the compose file:</span>
                  <p className="text-sm mt-1">Paste the copied configuration above into a file named <code className="text-emerald-400 bg-emerald-400/10 px-1 rounded">compose.yaml</code>.</p>
                </li>
                <li>
                  <span className="text-slate-200">Start the server using docker-compose:</span>
                  <div className="mt-2 bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-sm text-emerald-400">
                    docker-compose up -d
                  </div>
                  <p className="text-sm mt-2">
                    Note: If you don't have <code className="text-emerald-400 bg-emerald-400/10 px-1 rounded">docker-compose</code>, you can simply use <code className="text-emerald-400 bg-emerald-400/10 px-1 rounded">docker compose up -d</code> on newer Docker versions (v4+).
                  </p>
                </li>
                <li>
                  <span className="text-slate-200">Check the logs or interact with the console:</span>
                  <div className="mt-2 bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-sm text-emerald-400">
                    docker attach {config.name}
                  </div>
                  <p className="text-sm mt-2 text-amber-500/80 italic">To detach from the console without stopping the server, press <kbd className="font-sans px-1 bg-slate-800 rounded">Ctrl+P</kbd> followed by <kbd className="font-sans px-1 bg-slate-800 rounded">Ctrl+Q</kbd>.</p>
                </li>
              </ol>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
