import api from "./api";

export const getUsers = () => api.get("/users");
export const getUser = (id) => api.get(`/users/${id}`);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const activateUser = (id) => api.put(`/users/${id}/activate`);
export const deactivateUser = (id) => api.put(`/users/${id}/deactivate`);
