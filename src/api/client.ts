import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // withCredentials: true, // only if using cookies
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // optional refresh-token handling
    throw error;
  },
);

export default api;
