import api from "./api";

export const getSiteConfig = () => api.get("/settings");
export const updateSiteConfig = (data) => api.put("/settings", data);
