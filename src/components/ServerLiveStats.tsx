import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatBytesToDisplay } from "../types/stats";

interface ServerLiveStatsProps {
  serverId: string;
  limitRam?: number; // Configured allocation in GB
  status?: string;
}

export default function ServerLiveStats({ serverId, limitRam = 2, status = "offline" }: ServerLiveStatsProps) {
  const [usedBytes, setUsedBytes] = useState<number | null>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const safeLimitRamGB = typeof limitRam === "number" && !isNaN(limitRam) && limitRam > 0 ? limitRam : 2;

  useEffect(() => {
    if (status !== "online") {
      setUsedBytes(0);
      setIsOverLimit(false);
      setUnavailable(false);
      return;
    }

    let alive = true;
    const fetchStats = async () => {
      try {
        const res = await axios.get(`/api/servers/${serverId}/stats`);
        if (!alive || !res.data) return;

        if (res.data.memory?.usedBytes !== undefined) {
          setUsedBytes(Math.max(0, Number(res.data.memory.usedBytes) || 0));
          setIsOverLimit(Boolean(res.data.memory.overLimit));
          setUnavailable(false);
        } else if (res.data.ram !== undefined) {
          const rawMb = Math.max(0, Number(res.data.ram) || 0);
          setUsedBytes(rawMb * 1024 * 1024);
          setIsOverLimit(rawMb > safeLimitRamGB * 1024);
          setUnavailable(false);
        } else {
          setUnavailable(true);
        }
      } catch (e) {
        if (alive) {
          setUnavailable(true);
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [serverId, status, safeLimitRamGB]);

  if (status !== "online") {
    return (
      <span className="font-mono text-foreground-muted text-xs md:text-sm">
        0 MB <span className="text-muted-foreground">/ {safeLimitRamGB} GB</span>
      </span>
    );
  }

  if (unavailable) {
    return <span className="font-mono text-muted-foreground text-xs md:text-sm">Unavailable</span>;
  }

  const formattedUsed = usedBytes !== null ? formatBytesToDisplay(usedBytes) : "...";

  return (
    <span
      className={`font-mono text-xs md:text-sm ${
        isOverLimit ? "text-amber-400 font-semibold" : "text-foreground-muted"
      }`}
      title={isOverLimit ? "Memory usage exceeds configured limit" : "Container / Java memory usage"}
    >
      {formattedUsed} <span className="text-muted-foreground">/ {safeLimitRamGB} GB</span>
    </span>
  );
}
