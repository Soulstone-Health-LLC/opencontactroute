import api from "./api";

export const getPathways = () => api.get("/pathways");
export const getPathway = (id) => api.get(`/pathways/${id}`);
export const createPathway = (data) => api.post("/pathways", data);
export const updatePathway = (id, data) => api.put(`/pathways/${id}`, data);
export const publishPathway = (id) => api.put(`/pathways/${id}/publish`);
export const unpublishPathway = (id) => api.put(`/pathways/${id}/unpublish`);
export const deletePathway = (id) => api.delete(`/pathways/${id}`);
