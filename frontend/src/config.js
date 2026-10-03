import axios from "axios";

// Centralized API configuration for HRIS Portal
// In development: defaults to http://localhost:5001
// In production: uses import.meta.env.VITE_API_URL

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

export const API_BASE_URL = API_URL;

// Automatically attach credentials (cookies) and Authorization Bearer header if token exists
axios.interceptors.request.use((config) => {
  config.withCredentials = true;
  const token = sessionStorage.getItem("hrisToken");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API_URL;
