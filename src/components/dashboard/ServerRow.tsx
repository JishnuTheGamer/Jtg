import React from "react";
import { Link } from "react-router-dom";
import { m, useReducedMotion, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";
import { Server, ChevronRight } from "lucide-react";
import { ServerSummary, ServerStatus } from "../../types/dashboard";
import { useRipple, RippleLayer, EASE_OUT_EXPO } from "./Shared";

const STATUS_MAP: Record<ServerStatus, { dot: string; label: string; text: string }> = {
  online: { dot: "bg-theme-500 shadow-[0_0_12px_rgba(var(--theme-rgb-500),0.8)]", label: "text-theme-500", text: "Online" },
  starting: { dot: "bg-theme-500 shadow-[0_0_12px_rgba(var(--theme-rgb-500),0.8)]", label: "text-theme-500", text: "Starting" },
  error: { dot: "bg-theme-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]", label: "text-theme-400", text: "Error" },
  offline: { dot: "bg-zinc-500", label: "text-muted-foreground", text: "Offline" },
};

export function ServerRow({ server, index }: { server: ServerSummary; index: number; key?: React.Key }) {
  const { ripples, spawn } = useRipple();
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  
  const lightX = useTransform(px, (v) => `${v * 100}%`);
  const lightY = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(150px circle at ${lightX} ${lightY}, rgba(255,255,255,0.06), transparent 70%)`;

  const st = STATUS_MAP[server.status] || STATUS_MAP.offline;

  return (
    <m.div
      initial={{ opacity: 0, x: -20, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE_OUT_EXPO }}
      className="relative z-10"
    >
      <Link
        to={`/servers/${server.id}`}
        onPointerDown={spawn}
        onPointerMove={(e) => {
          if (reduce) return;
          const rect = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - rect.left) / rect.width);
          py.set((e.clientY - rect.top) / rect.height);
        }}
        className="group relative flex items-center justify-between overflow-hidden p-5 transition-colors hover:bg-muted md:p-6"
      >
        <RippleLayer ripples={ripples} />
        {!reduce && (
          <m.div
            style={{ background: spotlight }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] scale-y-0 bg-gradient-to-b from-transparent via-theme-600 to-transparent transition-transform duration-300 ease-out group-hover:scale-y-100" />

        <div className="relative z-10 flex items-center gap-5">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted-subtle shadow-inner transition-colors duration-300 group-hover:border-theme-600/40 group-hover:bg-theme-600/10">
            <Server className="relative z-10 h-5 w-5 text-muted-foreground transition-colors duration-300 group-hover:text-theme-300" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground-muted transition-colors duration-300 group-hover:text-foreground">
              {server.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {server.status === "online" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-theme-500 opacity-60" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${st.dot}`} />
              </span>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${st.label}`}>
                {st.text}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-5">
          <time dateTime={server.createdAt} className="hidden rounded-lg border border-border-subtle bg-black/40 dark:bg-black/40 px-3 py-1.5 font-mono text-xs text-muted-foreground backdrop-blur-sm sm:block">
            {new Date(server.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </Link>
    </m.div>
  );
}
