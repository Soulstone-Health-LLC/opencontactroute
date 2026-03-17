import api from "./api";

export const getAudiences = () => api.get("/audiences");
export const getAudience = (id) => api.get(`/audiences/${id}`);
export const createAudience = (data) => api.post("/audiences", data);
export const updateAudience = (id, data) => api.put(`/audiences/${id}`, data);
export const deleteAudience = (id) => api.delete(`/audiences/${id}`);
