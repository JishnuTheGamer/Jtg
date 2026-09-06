import React, { useEffect, useState } from "react"; 
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { Save, AlertTriangle, RefreshCw } from "lucide-react";

interface Properties {
  [key: string]: string;
}

const COMMON_PROPERTIES = [
  { key: 'online-mode', type: 'boolean', label: 'Online Mode (Premium)' },
  { key: 'pvp', type: 'boolean', label: 'Player vs Player (PvP)' },
  { key: 'hardcore', type: 'boolean', label: 'Hardcore' },
  { key: 'allow-flight', type: 'boolean', label: 'Allow Flight' },
  { key: 'enable-command-block', type: 'boolean', label: 'Enable Command Blocks' },
  { key: 'gamemode', type: 'select', options: ['survival', 'creative', 'adventure', 'spectator'], label: 'Game Mode' },
  { key: 'difficulty', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'], label: 'Difficulty' },
  { key: 'max-players', type: 'number', label: 'Max Players' },
  { key: 'motd', type: 'text', label: 'MOTD (Message of the Day)' },
  { key: 'view-distance', type: 'number', label: 'View Distance' }
];

export default function ServerProperties({ serverId }: { serverId: string }) {
  const [properties, setProperties] = useState<Properties>({});
  const [originalContent, setOriginalContent] = useState<string>("");
  const [exists, setExists] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/servers/${serverId}/files?path=server.properties`);
      if (res.data.isFile) {
        setOriginalContent(res.data.content);
        const parsed = parseProperties(res.data.content);
        setProperties(parsed);
        setExists(true);
      } else {
        setExists(false);
      }
    } catch (e) {
      setExists(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [serverId]);

  const parseProperties = (content: string): Properties => {
    const lines = content.split('\n');
    const parsed: Properties = {};
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      const index = line.indexOf('=');
      if (index === -1) continue;
      const key = line.substring(0, index).trim();
      const value = line.substring(index + 1).trim();
      parsed[key] = value;
    }
    return parsed;
  };

  const serializeProperties = (currentProps: Properties, originalText: string): string => {
    const lines = originalText.split('\n');
    const updatedKeys = new Set<string>();
    
    // Update existing
    const updatedLines = lines.map(line => {
      if (line.startsWith('#') || !line.trim()) return line;
      const index = line.indexOf('=');
      if (index === -1) return line;
      const key = line.substring(0, index).trim();
      
      if (currentProps[key] !== undefined) {
        updatedKeys.add(key);
        return `${key}=${currentProps[key]}`;
      }
      return line;
    });

    // Add new ones that were not in original
    for (const [key, value] of Object.entries(currentProps)) {
      if (!updatedKeys.has(key)) {
        updatedLines.push(`${key}=${value}`);
      }
    }

    return updatedLines.join('\n');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const newContent = serializeProperties(properties, originalContent);
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: 'server.properties',
        content: newContent
      });
      setOriginalContent(newContent);
      alert('Properties saved successfully! You may need to restart the server for changes to take effect.');
    } catch (e) {
      alert('Failed to save properties.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-theme-600 animate-spin" />
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-theme-600 mb-4 opacity-80" />
        <h3 className="text-lg font-bold text-foreground mb-2">server.properties Not Found</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          The property file does not exist yet. Please start the server at least once to generate the server.properties file.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight drop-shadow-md">Properties</h2>
            <p className="text-theme-500/80 font-bold uppercase tracking-widest text-xs mt-1">Configure core server rules and settings</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-theme-700 hover:bg-theme-600 text-foreground font-bold rounded-xl transition-all flex items-center disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(var(--theme-rgb-600),0.5)] ring-1 ring-border"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMON_PROPERTIES.map((prop) => (
            <div key={prop.key} className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border p-5 rounded-2xl shadow-[0_0_30px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle relative overflow-hidden group hover:bg-black/60 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-theme-300 uppercase tracking-widest drop-shadow-sm mb-2 block">{prop.label}</label>
                {prop.type === 'boolean' && (
                  <button
                    onClick={() => handleChange(prop.key, properties[prop.key] === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        properties[prop.key] === 'true' ? 'bg-theme-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          properties[prop.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
              
              {prop.type === 'select' && (
                <select
                  value={properties[prop.key] || ''}
                  onChange={(e) => handleChange(prop.key, e.target.value)}
                  className="w-full bg-black/60 border border-border focus:border-theme-600 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none shadow-inner transition-colors"
                >
                  {prop.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {prop.type === 'number' && (
                <input
                  type="number"
                  value={properties[prop.key] || ''}
                  onChange={(e) => handleChange(prop.key, e.target.value)}
                  className="w-full bg-black/60 border border-border focus:border-theme-600 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none shadow-inner transition-colors"
                />
              )}

              {prop.type === 'text' && (
                <input
                  type="text"
                  value={properties[prop.key] || ''}
                  onChange={(e) => handleChange(prop.key, e.target.value)}
                  className="w-full bg-black/60 border border-border focus:border-theme-600 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none shadow-inner transition-colors"
                />
              )}

              <p className="text-[11px] text-muted-foreground mt-2 font-mono">Key: {prop.key}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-black text-foreground tracking-tight drop-shadow-md mb-4 mt-8">Advanced Properties</h3>
          <div className="bg-black/40 dark:bg-black/40 backdrop-blur-xl border border-border rounded-2xl shadow-[0_0_30px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border-subtle overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {Object.keys(properties).filter(k => !COMMON_PROPERTIES.find(cp => cp.key === k)).map(key => (
                <div key={key} className="flex flex-col">
                  <label className="text-[11px] text-muted-foreground mb-1 font-mono">{key}</label>
                  <input
                    type="text"
                    value={properties[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full bg-card border border-border focus:border-theme-600 rounded-lg px-3 py-1.5 text-sm text-foreground outline-none font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
          {(isSaving) && <LoadingOverlay />}
    </div>
  );
}
