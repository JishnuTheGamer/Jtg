import React, { useEffect, useState } from "react";
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
        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4 opacity-80" />
        <h3 className="text-lg font-bold text-white mb-2">server.properties Not Found</h3>
        <p className="text-zinc-400 text-sm max-w-md">
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
            <h2 className="text-xl font-bold text-white">Server Properties</h2>
            <p className="text-sm text-zinc-400">Configure core server rules and settings</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMON_PROPERTIES.map((prop) => (
            <div key={prop.key} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl md:rounded-none">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-200">{prop.label}</label>
                {prop.type === 'boolean' && (
                  <button
                    onClick={() => handleChange(prop.key, properties[prop.key] === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        properties[prop.key] === 'true' ? 'bg-indigo-500' : 'bg-zinc-700'
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
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
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
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              )}

              {prop.type === 'text' && (
                <input
                  type="text"
                  value={properties[prop.key] || ''}
                  onChange={(e) => handleChange(prop.key, e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              )}

              <p className="text-[11px] text-zinc-500 mt-2 font-mono">Key: {prop.key}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-white mb-4">Advanced Properties</h3>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-none overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {Object.keys(properties).filter(k => !COMMON_PROPERTIES.find(cp => cp.key === k)).map(key => (
                <div key={key} className="flex flex-col">
                  <label className="text-[11px] text-zinc-500 mb-1 font-mono">{key}</label>
                  <input
                    type="text"
                    value={properties[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-white outline-none font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
