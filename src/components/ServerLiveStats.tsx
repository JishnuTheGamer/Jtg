import { useState, useEffect } from "react";
import axios from "axios";

export default function ServerLiveStats({ serverId, limitRam, status }: { serverId: string, limitRam: number, status: string }) {
  const [liveRam, setLiveRam] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'online') return;
    const fetchStats = async () => {
      try {
        const res = await axios.get(`/api/servers/${serverId}/stats`);
        setLiveRam(res.data.ram); // RAM is in MB
      } catch(e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [serverId, status]);

  if (status !== 'online') {
    return <span className="font-mono text-foreground-muted text-xs md:text-sm">{limitRam} <span className="text-muted-foreground">GB</span></span>;
  }

  const liveRamGB = liveRam !== null ? (liveRam / 1024).toFixed(1) : "...";

  return (
    <span className="font-mono text-foreground-muted text-xs md:text-sm">
      {liveRamGB} <span className="text-muted-foreground">/ {limitRam} GB</span>
    </span>
  );
}
