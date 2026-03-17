import api from "./api";

export const getTopics = () => api.get("/topics");
export const getTopic = (id) => api.get(`/topics/${id}`);
export const createTopic = (data) => api.post("/topics", data);
export const updateTopic = (id, data) => api.put(`/topics/${id}`, data);
export const deleteTopic = (id) => api.delete(`/topics/${id}`);
