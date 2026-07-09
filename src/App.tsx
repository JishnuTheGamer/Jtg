/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ServerList from "./pages/ServerList";
import CreateServer from "./pages/CreateServer";
import ServerView from "./pages/ServerView";
import SettingsPage from "./pages/SettingsPage";
import Layout from "./components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-transparent text-white">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full"
      />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname.split("/")[1]} className="h-full w-full flex flex-col">
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/servers" element={<ProtectedRoute><ServerList /></ProtectedRoute>} />
          <Route path="/servers/create" element={<ProtectedRoute><CreateServer /></ProtectedRoute>} />
          <Route path="/servers/:id/*" element={<ProtectedRoute><ServerView /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </AnimatePresence>
  );
};

import { SettingsProvider } from "./context/SettingsContext";
import { GlobalBackground } from "./components/GlobalBackground";

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <GlobalBackground />
        <Router>
          <AnimatedRoutes />
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}
