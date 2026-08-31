import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

export const SettingsContext = createContext<any>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [panelName, setPanelName] = useState<string>("JTG Panel");
  const [panelLogo, setPanelLogo] = useState<string>("");
  const [panelBackgroundImage, setPanelBackgroundImage] = useState<string>("");
  const [panelBackgroundBlur, setPanelBackgroundBlur] = useState<number>(10);
  const [enablePlayit, setEnablePlayit] = useState<boolean>(false);
  const [enableTutorial, setEnableTutorial] = useState<boolean>(true);
  const [enableLoginAnimation, setEnableLoginAnimation] = useState<boolean>(true);
  const [enableRegistration, setEnableRegistration] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>("red");
  const [enableGoogleLogin, setEnableGoogleLogin] = useState<boolean>(false);
  const [firebaseApiKey, setFirebaseApiKey] = useState<string>("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState<string>("");
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState<string>("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState<string>("");
  const [firebaseAppId, setFirebaseAppId] = useState<string>("");
  const [defaultRuntime, setDefaultRuntime] = useState<string>("docker");

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings");
      if (res.data.panelName) setPanelName(res.data.panelName);
      if (res.data.panelLogo !== undefined) setPanelLogo(res.data.panelLogo);
      if (res.data.panelBackgroundImage !== undefined) setPanelBackgroundImage(res.data.panelBackgroundImage);
      if (res.data.panelBackgroundBlur !== undefined) setPanelBackgroundBlur(res.data.panelBackgroundBlur);
      if (res.data.enablePlayit !== undefined) setEnablePlayit(res.data.enablePlayit);
      if (res.data.enableTutorial !== undefined) setEnableTutorial(res.data.enableTutorial);
      if (res.data.enableLoginAnimation !== undefined) setEnableLoginAnimation(res.data.enableLoginAnimation);
      if (res.data.enableRegistration !== undefined) setEnableRegistration(res.data.enableRegistration);
      if (res.data.enableGoogleLogin !== undefined) setEnableGoogleLogin(res.data.enableGoogleLogin);
      if (res.data.firebaseApiKey !== undefined) setFirebaseApiKey(res.data.firebaseApiKey);
      if (res.data.firebaseAuthDomain !== undefined) setFirebaseAuthDomain(res.data.firebaseAuthDomain);
      if (res.data.firebaseProjectId !== undefined) setFirebaseProjectId(res.data.firebaseProjectId);
      if (res.data.firebaseStorageBucket !== undefined) setFirebaseStorageBucket(res.data.firebaseStorageBucket);
      if (res.data.firebaseMessagingSenderId !== undefined) setFirebaseMessagingSenderId(res.data.firebaseMessagingSenderId);
      if (res.data.firebaseAppId !== undefined) setFirebaseAppId(res.data.firebaseAppId);
      if (res.data.defaultRuntime !== undefined) setDefaultRuntime(res.data.defaultRuntime);
      if (res.data.theme !== undefined) {
        setTheme(res.data.theme);
        document.documentElement.setAttribute("data-theme", res.data.theme || "red");
      } else {
        document.documentElement.setAttribute("data-theme", "red");
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSettings();
    const token = localStorage.getItem("token");
    if (!token) return;
    const socket = io({ auth: { token } });
    socket.on("settings_updated", () => {
      fetchSettings();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (panelName) {
      document.title = panelName;
    }
  }, [panelName]);
  
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme || "red");
  }, [theme]);

  useEffect(() => {
    if (panelLogo) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = panelLogo;
    } else {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = "/vite.svg"; // Fallback or clear
      }
    }
  }, [panelLogo]);

  return (
    <SettingsContext.Provider value={{ 
      panelName, setPanelName, 
      panelLogo, setPanelLogo, 
      panelBackgroundImage, setPanelBackgroundImage, 
      panelBackgroundBlur, setPanelBackgroundBlur, 
      enablePlayit, setEnablePlayit, 
      enableTutorial, setEnableTutorial,
      enableLoginAnimation, setEnableLoginAnimation,
      enableRegistration, setEnableRegistration,
      theme, setTheme,
      enableGoogleLogin, setEnableGoogleLogin,
      firebaseApiKey, setFirebaseApiKey,
      firebaseAuthDomain, setFirebaseAuthDomain,
      firebaseProjectId, setFirebaseProjectId,
      firebaseStorageBucket, setFirebaseStorageBucket,
      firebaseMessagingSenderId, setFirebaseMessagingSenderId,
      firebaseAppId, setFirebaseAppId, defaultRuntime, setDefaultRuntime,
      fetchSettings 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
