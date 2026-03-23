import { createContext, useState, useEffect, useCallback } from "react";
import { getSiteConfig } from "../services/settingsService";

const DEFAULTS = {
  org_name: "",
  primary_color: "#0d6efd",
};

export const SiteConfigContext = createContext(null);

// applyToDOM is a placeholder for future runtime theme injection
// (e.g. setting --bs-primary CSS variable from config.primary_color).
function applyToDOM(_config) {}

export function SiteConfigProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState(DEFAULTS);

  const reloadSiteConfig = useCallback(() => {
    return getSiteConfig()
      .then((res) => {
        setSiteConfig(res.data);
        applyToDOM(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadSiteConfig();
  }, [reloadSiteConfig]);

  return (
    <SiteConfigContext.Provider value={{ siteConfig, reloadSiteConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}
