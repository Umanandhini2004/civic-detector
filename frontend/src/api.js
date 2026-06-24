import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000"
});

API.interceptors.request.use((config) => {
  const stored = localStorage.getItem("user");
  if (stored) {
    const user = JSON.parse(stored);
    if (user.email) {
      config.headers = config.headers || {};
      config.headers["X-User-Email"] = user.email;
      config.headers["X-User-Role"] = user.role || "citizen";
    }
  }
  return config;
});

export default API;