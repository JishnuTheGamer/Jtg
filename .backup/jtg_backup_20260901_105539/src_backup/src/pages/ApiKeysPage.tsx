// @ts-nocheck
import React from "react";
import PageHeader from "../components/PageHeader";
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
      <PageHeader 
        title="API Keys" 
        subtitle="ACCESS MANAGEMENT" 
      />

      <ApiKeysManager />
    </motion.div>
  );
}
