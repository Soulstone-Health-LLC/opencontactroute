import api from "./api";

export const getPersonProfile = () => api.get("/persons/profile");
export const updatePersonProfile = (data) => api.put("/persons/profile", data);
export const getPersons = () => api.get("/persons");
export const getPerson = (id) => api.get(`/persons/${id}`);
export const getPersonByUser = (userId) => api.get(`/persons/user/${userId}`);
export const createPerson = (data) => api.post("/persons", data);
export const updatePerson = (id, data) => api.put(`/persons/${id}`, data);
