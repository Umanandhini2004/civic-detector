import axios from "axios";

const API = axios.create({
  baseURL: "https://civic-detector-d1km.vercel.app"
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