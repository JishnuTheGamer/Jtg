import React, { useEffect } from "react";
import { io } from "socket.io-client";

export function SystemUpdateListener() {
  useEffect(() => {
    const socket = io();
    
    socket.on("system_update_started", () => {
      // Show an alert or custom UI, but for now just wait and reload.
      alert("System update triggered. The panel will refresh shortly.");
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return null;
}
