import React, { createContext, useContext, useState, useEffect } from "react";

import { safeStorage, safeSessionStorage } from "../utils/storage";
import axios from "axios";

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(safeStorage.getItem("jtg_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get("/api/auth/me").then(res => {
        setUser(res.data.user);
        setLoading(false);
      }).catch(() => {
        setToken(null);
        safeStorage.removeItem("jtg_token");
        setUser(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setToken(null);
          setUser(null);
          safeStorage.removeItem("jtg_token");
          delete axios.defaults.headers.common["Authorization"];
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = (token: string, user: any) => {
    setToken(token);
    setUser(user);
    safeStorage.setItem("jtg_token", token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    safeStorage.removeItem("jtg_token");
    delete axios.defaults.headers.common["Authorization"];
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get("/api/auth/me");
      setUser(res.data.user);
    } catch (e) {
      // ignore
    }
  };

  const updateUser = (updatedFields: any) => {
    setUser((prev: any) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
