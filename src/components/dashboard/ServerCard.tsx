import React from "react";
import { Link } from "react-router-dom";
import { Server, ChevronRight } from "lucide-react";
import { ServerSummary } from "../../types/dashboard";

interface ServerCardProps {
  key?: React.Key;
  server: ServerSummary;
  onStatusChange?: () => void;
}

export function ServerCard({ server }: ServerCardProps) {
  const currentStatus = server.status;
  const isOnline = currentStatus === "online";
  const isStarting = currentStatus === "starting";

  return (
    <Link
      to={`/servers/${server.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/80 shadow-inner group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-colors">
              <Server className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground truncate group-hover:text-indigo-300 transition-colors">
                {server.name}
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                ID: {server.id}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Online
              </span>
            ) : isStarting ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Starting
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border/50">
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Server Metadata Badges & Open Console Link */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {server.software || "Paper"} {server.version ? `v${server.version}` : ""}
            </span>
            {server.suspended && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Suspended
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-indigo-400 transition-colors">
            <span>Open Console</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
