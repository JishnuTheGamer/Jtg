import { useEffect, useState } from "react";
import axios from "axios";
import { Database, RefreshCw, FileJson } from "lucide-react";

type DatabaseFile = { name: string; records: number; size: number };

export default function DatabasePage() {
  const [files, setFiles] = useState<DatabaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDatabase = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get<{ files: DatabaseFile[] }>("/api/system/database");
      setFiles(response.data.files || []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Unable to load database information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-theme-400">Storage</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Database</h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel data stores and record counts.</p>
        </div>
        <button onClick={loadDatabase} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground hover:bg-muted-hover disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {loading ? <div className="text-sm text-muted-foreground">Loading database...</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <div key={file.name} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3"><FileJson className="text-theme-400" size={20} /><span className="font-mono text-sm text-foreground">{file.name}</span></div>
              <div className="mt-5 flex justify-between text-xs text-muted-foreground"><span>{file.records} records</span><span>{(file.size / 1024).toFixed(1)} KB</span></div>
            </div>
          ))}
          {!files.length && <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No database files found.</div>}
        </div>
      )}
    </section>
  );
}
