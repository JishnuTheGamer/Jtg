import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const SettingsContext = createContext<any>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [panelName, setPanelName] = useState<string>("JTG Panel");
  const [panelLogo, setPanelLogo] = useState<string>("");
  const [panelBackgroundImage, setPanelBackgroundImage] = useState<string>("");
  const [panelBackgroundBlur, setPanelBackgroundBlur] = useState<number>(10);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings");
      if (res.data.panelName) {
        setPanelName(res.data.panelName);
      }
      if (res.data.panelLogo !== undefined) {
        setPanelLogo(res.data.panelLogo);
      }
      if (res.data.panelBackgroundImage !== undefined) {
        setPanelBackgroundImage(res.data.panelBackgroundImage);
      }
      if (res.data.panelBackgroundBlur !== undefined) {
        setPanelBackgroundBlur(res.data.panelBackgroundBlur);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ panelName, setPanelName, panelLogo, setPanelLogo, panelBackgroundImage, setPanelBackgroundImage, panelBackgroundBlur, setPanelBackgroundBlur, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
