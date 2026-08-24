// @ts-nocheck
import React from "react";
import { motion } from "framer-motion";
import ApiKeysManager from "../components/ApiKeysManager";
import { useAuth } from "../context/AuthContext";

export default function ApiKeysPage() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative z-10"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">API Keys</h1>
        <p className="text-muted-foreground">Manage API keys for accessing the panel via the dashboard.</p>
      </div>

      <ApiKeysManager />
    </motion.div>
  );
}
