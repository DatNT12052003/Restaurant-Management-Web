import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "x-platform": "web",
    },
});

axiosInstance.interceptors.request.use(
    async (config) => {
        const { store } = await import("@/store/store");

        const state = store.getState();
        const token = state.auth.access_token;

        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }

        const language = localStorage.getItem("i18nextLng") || "vi";
        config.headers["Accept-Language"] = language;

        return config;
    },
    (error) => Promise.reject(error),
);

export default axiosInstance;
