import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { SystemStats, ServerSummary } from "../types/dashboard";

type FetchState = "idle" | "loading" | "ready" | "error";
const POLL_MS = 5_000;

export function useDashboardData() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsHistory, setStatsHistory] = useState<SystemStats[]>([]);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const [statsRes, serversRes] = await Promise.allSettled([
        axios.get<SystemStats>("/api/system/stats", { signal: controller.signal }),
        axios.get<ServerSummary[]>("/api/servers", { signal: controller.signal }),
      ]);

      if (!mountedRef.current) return;

      let hasError = false;

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
        setStatsHistory(prev => {
          const next = [...prev, statsRes.value.data];
          return next.slice(-20);
        });
      } else {
        hasError = true;
      }

      if (serversRes.status === "fulfilled") {
        setServers(Array.isArray(serversRes.value.data) ? serversRes.value.data : []);
      } else {
        hasError = true;
      }

      setLastUpdated(new Date());
      setState(hasError && statsRes.status === "rejected" && serversRes.status === "rejected" ? "error" : "ready");
    } catch (error) {
      if (axios.isCancel(error) || !mountedRef.current) return;
      setState("error");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let timer: number | undefined;

    const tick = () => {
      if (document.visibilityState === "visible") void fetchData();
      timer = window.setTimeout(tick, POLL_MS);
    };

    void fetchData();
    timer = window.setTimeout(tick, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchData();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchData]);

  return { stats, statsHistory, servers, state, lastUpdated, refetch: fetchData };
}
