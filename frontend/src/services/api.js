import axios from "axios";

// Shared Axios instance used by all service modules.
// baseURL is relative so the same build works in both dev (proxied by Vite)
// and production (served behind Caddy on the same origin).
// withCredentials ensures the httpOnly JWT cookie is sent with every request.
const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

export default api;
