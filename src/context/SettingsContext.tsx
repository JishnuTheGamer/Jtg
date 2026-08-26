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
  const [theme, setTheme] = useState<string>("dark");
  const [enableGoogleLogin, setEnableGoogleLogin] = useState<boolean>(false);
  const [firebaseApiKey, setFirebaseApiKey] = useState<string>("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState<string>("");
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState<string>("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState<string>("");
  const [firebaseAppId, setFirebaseAppId] = useState<string>("");

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
      if (res.data.theme !== undefined) {
        setTheme(res.data.theme);
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
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
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    
    if (panelLogo) {
      if (panelLogo.startsWith('data:')) {
         link.href = panelLogo;
      } else {
         try {
           const url = new URL(panelLogo, window.location.origin);
           url.searchParams.set('v', Date.now().toString());
           link.href = url.toString();
         } catch(e) {
           link.href = panelLogo;
         }
      }
    } else {
      // Default fallback if no custom logo is set
      link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%232563eb%22/><text x=%2250%22 y=%2267%22 font-size=%2245%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22sans-serif%22 font-weight=%22bold%22>JTG</text></svg>";
    }
  }, [panelLogo]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, [theme]);

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
      firebaseAppId, setFirebaseAppId,
      fetchSettings 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
