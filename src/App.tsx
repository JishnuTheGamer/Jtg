/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

import { safeStorage, safeSessionStorage } from "./utils/storage";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ServerList from "./pages/ServerList";
import CreateServer from "./pages/CreateServer";
import ServerView from "./pages/ServerView";
import AccountPage from "./pages/AccountPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import AdminServers from "./pages/AdminServers";
import PlayitTunnel from "./pages/PlayitTunnel";
import Nodes from "./pages/Nodes";
import Layout from "./components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { UploadProvider } from "./context/UploadContext";
import { GlobalBackground } from "./components/GlobalBackground";
import { SystemUpdateListener } from "./components/SystemUpdateListener";
import { TutorialOverlay } from "./components/TutorialOverlay";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-transparent text-foreground">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-theme-600 border-t-transparent rounded-full"
      />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return <Navigate to="/servers" />;
  }
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname.split("/")[1]} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full w-full flex flex-col"
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/nodes" element={<AdminRoute><Nodes /></AdminRoute>} />
          <Route path="/servers" element={<ProtectedRoute><ServerList /></ProtectedRoute>} />
          <Route path="/servers/create" element={<AdminRoute><CreateServer /></AdminRoute>} />
          <Route path="/servers/:id/*" element={<ProtectedRoute><ServerView /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
          <Route path="/api-keys" element={<AdminRoute><ApiKeysPage /></AdminRoute>} />
          <Route path="/admin/servers" element={<AdminRoute><AdminServers /></AdminRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const TutorialManager = () => {
  const { panelName, enableTutorial } = useSettings();
  const [showTutorial, setShowTutorial] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // If the feature is globally disabled, do not show tutorial
    if (enableTutorial === false) {
      setShowTutorial(false);
      return;
    }

    if (loading || !user || location.pathname === '/login') return;

    const isDev = Boolean(import.meta.env?.DEV);
    const tutorialKey = isDev ? `tutorialShown_dev_${user.id}` : `tutorialShown_prod_${user.id}`;
    
    const tutorialShown = isDev 
      ? safeSessionStorage.getItem(tutorialKey) 
      : safeStorage.getItem(tutorialKey);

    if (!tutorialShown) {
      setShowTutorial(true);
    }
  }, [user, loading, location.pathname, enableTutorial]);

  const handleTutorialComplete = () => {
    if (!user) return;
    const isDev = Boolean(import.meta.env?.DEV);
    const tutorialKey = isDev ? `tutorialShown_dev_${user.id}` : `tutorialShown_prod_${user.id}`;
    
    if (isDev) {
      safeSessionStorage.setItem(tutorialKey, 'true');
    } else {
      safeStorage.setItem(tutorialKey, 'true');
    }
    
    setShowTutorial(false);
  };

  if (!showTutorial) return null;

  return <TutorialOverlay onComplete={handleTutorialComplete} panelName={panelName} />;
};

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <SystemUpdateListener />
        <UploadProvider>
        <GlobalBackground />
        <Router>
          <AnimatedRoutes />
          <TutorialManager />
        </Router>
        </UploadProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
