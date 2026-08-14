import axios from "axios";
import { BASE_URL } from "../config/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  if (__DEV__) {
    console.log("[api] request:", config.method?.toUpperCase(), url);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.log("[api] error:", {
        message: error.message,
        code: error.code,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  },
);

export default api;
