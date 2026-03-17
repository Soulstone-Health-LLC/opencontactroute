import api from "./api";

export const login = (credentials) => api.post("/users/auth", credentials);
export const logout = () => api.post("/users/logout");
export const getProfile = () => api.get("/users/profile");
export const register = (data) => api.post("/users/register", data);
