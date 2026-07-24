// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ServerList · Fleet grid with live status and per-server metrics           ║
// ║                                                                            ║
// ║  STEP 1 · Imports          STEP 5 · Primitives (StatusBadge, Metric)       ║
// ║  STEP 2 · Types            STEP 6 · ServerCard                             ║
// ║  STEP 3 · Constants        STEP 7 · Sections (Loading, Empty)             ║
// ║  STEP 4 · Data hook        STEP 8 · Page composition                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/* ── STEP 1 · Imports ─────────────────────────────────────────────────────── */
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Server, Plus, ChevronRight, Settings } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ServerLiveStats from "../components/ServerLiveStats";

/* ── STEP 2 · Types ───────────────────────────────────────────────────────── */
type ServerStatus = "online" | "offline" | (string & {});

interface ServerRecord {
  id: string;
  name: string;
  status: ServerStatus;
  cpu?: number;
  ram?: number;
  disk?: number;
  version?: string;
}

interface ServersState {
  servers: ServerRecord[];
  error: string | null;
  isLoading: boolean;
}

/* ── STEP 3 · Constants ───────────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as const;
const POLL_INTERVAL_MS = 5_000;
const DEFAULT_CPU = 100;
const DEFAULT_DISK = 10;
const SURFACE = "transparent"; // Changed to transparent so global background shows

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const isOnline = (status?: ServerStatus): boolean => status === "online";

/* ── STEP 4 · Data hook (fetch + poll) ────────────────────────────────────── */
/** Fetches the server fleet and re-polls on a fixed interval with cleanup. */
function useServers(pollIntervalMs = POLL_INTERVAL_MS): ServersState {
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServers = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await axios.get<ServerRecord[]>("/api/servers", { signal });
      setServers(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError("Unable to load servers. Retrying…");
      console.error("Failed to fetch servers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchServers(controller.signal);
    const interval = window.setInterval(
      () => void fetchServers(controller.signal),
      pollIntervalMs,
    );
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [fetchServers, pollIntervalMs]);

  return { servers, error, isLoading };
}

/* ── STEP 5 · Primitives ──────────────────────────────────────────────────── */
const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status?: ServerStatus;
}) {
  const online = isOnline(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
        online
          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
          : "bg-white/[0.04] text-zinc-400 ring-1 ring-inset ring-white/10"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/80 motion-reduce:hidden" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            online ? "bg-emerald-400" : "bg-zinc-500"
          }`}
        />
      </span>
      {online ? "Online" : "Offline"}
    </span>
  );
});

/** Labeled metric cell used inside a server card. */
function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <div className="font-mono text-sm font-semibold text-zinc-100">
        {children}
      </div>
    </div>
  );
}

/* ── STEP 6 · ServerCard ──────────────────────────────────────────────────── */
const ServerCard = memo(function ServerCard({
  server,
}: {
  server: ServerRecord;
}) {
  const online = isOnline(server.status);
  return (
    <motion.article variants={itemVariants}>
      <Link
        to={`/servers/${server.id}`}
        className="group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 md:p-6"
      >
        {/* 6.1 · Status edge-light */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
            online
              ? "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/15 to-transparent"
          }`}
        />
        {/* 6.2 · Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-colors group-hover:border-white/[0.14] group-hover:text-zinc-100">
              <Server className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-white">
                {server.name}
              </h2>
              <div className="mt-1.5">
                <StatusBadge status={server.status} />
              </div>
            </div>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-300" />
        </div>
        {/* 6.3 · Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 sm:grid-cols-4">
          <Metric label="CPU Limit">
            {server.cpu ?? DEFAULT_CPU}
            <span className="ml-0.5 text-zinc-500">%</span>
          </Metric>
          <Metric label="RAM Usage">
            <ServerLiveStats
              serverId={server.id}
              limitRam={server.ram}
              status={server.status}
            />
          </Metric>
          <Metric label="Disk Limit">
            {server.disk ?? DEFAULT_DISK}
            <span className="ml-0.5 text-zinc-500">GB</span>
          </Metric>
          <Metric label="Version">
            <span className="block truncate" title={server.version}>
              {server.version ?? "—"}
            </span>
          </Metric>
        </div>
      </Link>
    </motion.article>
  );
});

/* ── STEP 7 · Sections ────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
      style={{ backgroundColor: SURFACE }}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white/70"
        aria-hidden
      />
      <p className="text-sm font-medium text-zinc-500">Loading instances…</p>
    </div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div
      variants={itemVariants}
      className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] px-6 py-24 text-center"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <Server className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-base font-semibold text-white">
        No instances running
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        You haven&apos;t deployed any servers yet. Create one to start managing
        your game instances.
      </p>
      {isAdmin && (
        <Link
          to="/servers/create"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708]"
        >
          <Plus className="h-4 w-4" />
          Deploy your first server
        </Link>
      )}
    </motion.div>
  );
}

/* ── STEP 8 · Page composition ────────────────────────────────────────────── */
export default function ServerList() {
  const { user } = useAuth();
  const { servers, error, isLoading } = useServers();

  // 8.1 · Gating — resolve auth BEFORE making any role decision.
  //        `user` is undefined while auth is still restoring; null when logged
  //        out; an object once resolved. Gating on this prevents admin controls
  //        from flickering in/out on first paint.
  //        If your AuthContext exposes an explicit flag instead (e.g. `loading`
  //        or `isReady`), swap the line below for: const isAuthReady = !loading;
  const isAuthReady = user !== undefined;
  const isAdmin = isAuthReady && user?.role === "admin";
  const hasServers = servers.length > 0;

  // 8.2 · Live "X of Y online" summary.
  const onlineCount = useMemo(
    () => servers.reduce((n, s) => n + (isOnline(s.status) ? 1 : 0), 0),
    [servers],
  );

  // 8.3 · First paint: wait for auth readiness AND the initial data load.
  if (!isAuthReady || (isLoading && !hasServers)) return <LoadingState />;

  // 8.4 · Full page.
  return (
    <div
      className="relative min-h-screen text-zinc-100"
      style={{ backgroundColor: SURFACE }}
    >
      <div className="relative mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {/* 8.4a · Header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
              Infrastructure
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Instances
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {hasServers
                ? `${onlineCount} of ${servers.length} online · Manage and monitor your fleet.`
                : "Manage and monitor your server fleet."}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Link
                to="/admin/servers"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708]"
              >
                <Settings className="h-4 w-4" />
                Manage
              </Link>
              <Link
                to="/servers/create"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708]"
              >
                <Plus className="h-4 w-4" />
                New Instance
              </Link>
            </div>
          )}
        </header>

        {/* 8.4b · Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm font-medium text-red-300"
          >
            {error}
          </div>
        )}

        {/* 8.4c · Fleet */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4"
          aria-label="Server instances"
        >
          {hasServers ? (
            servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))
          ) : (
            <EmptyState isAdmin={isAdmin} />
          )}
        </motion.section>
      </div>
    </div>
  );
}
