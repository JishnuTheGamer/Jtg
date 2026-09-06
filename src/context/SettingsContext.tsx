import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

export const SettingsContext = createContext<any>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [panelName, setPanelName] = useState<string>("DTG PANEL");
  const [panelLogo, setPanelLogo] = useState<string>("");
  const [panelBackgroundImage, setPanelBackgroundImage] = useState<string>("");
  const [panelBackgroundBlur, setPanelBackgroundBlur] = useState<number>(10);
  const [blueprintMode, setBlueprintMode] = useState<boolean>(true);
  const [blueprintOpacity, setBlueprintOpacity] = useState<number>(0.12);
  const [blueprintSize, setBlueprintSize] = useState<number>(48);
  const [enablePlayit, setEnablePlayit] = useState<boolean>(false);
  const [enableTutorial, setEnableTutorial] = useState<boolean>(true);
  const [enableLoginAnimation, setEnableLoginAnimation] = useState<boolean>(true);
  const [enableRegistration, setEnableRegistration] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>("hyper-v1");
  const [customPrimary, setCustomPrimary] = useState<string>("#06b6d4");
  const [customSecondary, setCustomSecondary] = useState<string>("#0e7490");
  const [customGradient, setCustomGradient] = useState<string>("linear-gradient(135deg, #06b6d4, #0e7490)");
  const [enableGoogleLogin, setEnableGoogleLogin] = useState<boolean>(false);
  const [enableDiscordLogin, setEnableDiscordLogin] = useState<boolean>(false);
  const [discordClientId, setDiscordClientId] = useState<string>("");
  const [discordRedirectUri, setDiscordRedirectUri] = useState<string>("");
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
      if (res.data.blueprintMode !== undefined) setBlueprintMode(res.data.blueprintMode);
      if (res.data.blueprintOpacity !== undefined) setBlueprintOpacity(res.data.blueprintOpacity);
      if (res.data.blueprintSize !== undefined) setBlueprintSize(res.data.blueprintSize);
      if (res.data.enablePlayit !== undefined) setEnablePlayit(res.data.enablePlayit);
      if (res.data.enableTutorial !== undefined) setEnableTutorial(res.data.enableTutorial);
      if (res.data.enableLoginAnimation !== undefined) setEnableLoginAnimation(res.data.enableLoginAnimation);
      if (res.data.enableRegistration !== undefined) setEnableRegistration(res.data.enableRegistration);
      if (res.data.enableGoogleLogin !== undefined) setEnableGoogleLogin(res.data.enableGoogleLogin);
      if (res.data.enableDiscordLogin !== undefined) setEnableDiscordLogin(res.data.enableDiscordLogin);
      if (res.data.discordClientId !== undefined) setDiscordClientId(res.data.discordClientId);
      if (res.data.discordRedirectUri !== undefined) setDiscordRedirectUri(res.data.discordRedirectUri);
      if (res.data.customPrimary !== undefined) setCustomPrimary(res.data.customPrimary);
      if (res.data.customSecondary !== undefined) setCustomSecondary(res.data.customSecondary);
      if (res.data.customGradient !== undefined) setCustomGradient(res.data.customGradient);
      if (res.data.firebaseApiKey !== undefined) setFirebaseApiKey(res.data.firebaseApiKey);
      if (res.data.firebaseAuthDomain !== undefined) setFirebaseAuthDomain(res.data.firebaseAuthDomain);
      if (res.data.firebaseProjectId !== undefined) setFirebaseProjectId(res.data.firebaseProjectId);
      if (res.data.firebaseStorageBucket !== undefined) setFirebaseStorageBucket(res.data.firebaseStorageBucket);
      if (res.data.firebaseMessagingSenderId !== undefined) setFirebaseMessagingSenderId(res.data.firebaseMessagingSenderId);
      if (res.data.firebaseAppId !== undefined) setFirebaseAppId(res.data.firebaseAppId);
      if (res.data.defaultRuntime !== undefined) setDefaultRuntime(res.data.defaultRuntime);
      if (res.data.theme !== undefined) {
        setTheme(res.data.theme);
        document.documentElement.setAttribute("data-theme", res.data.theme || "hyper-v1");
      } else {
        document.documentElement.setAttribute("data-theme", "hyper-v1");
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
    document.documentElement.setAttribute("data-theme", theme || "hyper-v1");
    document.documentElement.style.setProperty("--custom-primary", customPrimary);
    document.documentElement.style.setProperty("--custom-secondary", customSecondary);
    document.documentElement.style.setProperty("--custom-gradient", customGradient);
  }, [theme, customPrimary, customSecondary, customGradient]);

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
      blueprintMode, setBlueprintMode, blueprintOpacity, setBlueprintOpacity, blueprintSize, setBlueprintSize,
      enablePlayit, setEnablePlayit, 
      enableTutorial, setEnableTutorial,
      enableLoginAnimation, setEnableLoginAnimation,
      enableRegistration, setEnableRegistration,
      theme, setTheme,
      customPrimary, setCustomPrimary, customSecondary, setCustomSecondary, customGradient, setCustomGradient,
      enableGoogleLogin, setEnableGoogleLogin,
      enableDiscordLogin, setEnableDiscordLogin, discordClientId, setDiscordClientId, discordRedirectUri, setDiscordRedirectUri,
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
