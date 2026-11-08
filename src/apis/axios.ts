import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { setSessionHint } from "@/lib/session-hint";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "x-platform": "web",
    },
    // filters[0][field]=... thay vì filters[][field]=... (qs ở backend cần chỉ số để tách từng filter)
    paramsSerializer: { indexes: true },
});

// store được import động để tránh vòng lặp import (store -> thunk -> api -> axios -> store)
const getStore = async () => (await import("@/store/store")).store;

axiosInstance.interceptors.request.use(
    async (config) => {
        const store = await getStore();
        const token = store.getState().auth.access_token;

        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }

        const language = localStorage.getItem("i18nextLng") || "vi";
        config.headers["Accept-Language"] = language;

        return config;
    },
    (error) => Promise.reject(error),
);

// Các endpoint không được tự refresh khi gặp 401 (tránh vòng lặp vô hạn)
const NO_REFRESH_URLS = ["/auth/login", "/auth/refresh", "/auth/logout"];

// Dùng chung một request refresh cho tất cả request bị 401 cùng lúc
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
    const response = await axiosInstance.post("/auth/refresh");
    const token: string | undefined = response.data?.data?.access_token;
    if (!token) {
        throw new Error("No access token in refresh response");
    }
    return token;
};

/**
 * Làm mới access token (dùng chung một request với interceptor) và lưu vào store.
 * Dùng cho socket khi token hết hạn. Ném lỗi nếu phiên đã hết.
 */
export const refreshSession = async (): Promise<string> => {
    const store = await getStore();
    const { setAccessToken } = await import("@/store/auth/authSlice");
    refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
    });
    const token = await refreshPromise;
    store.dispatch(setAccessToken(token));
    return token;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const url = originalRequest?.url || "";

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            NO_REFRESH_URLS.some((u) => url.includes(u))
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        const store = await getStore();
        const { setAccessToken, clearAuth } = await import("@/store/auth/authSlice");

        try {
            refreshPromise ??= refreshAccessToken().finally(() => {
                refreshPromise = null;
            });
            const newToken = await refreshPromise;
            store.dispatch(setAccessToken(newToken));
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
        } catch {
            // Refresh thất bại -> phiên hết hạn; AuthGuard sẽ đưa người dùng về /login
            setSessionHint(false);
            store.dispatch(clearAuth());
            return Promise.reject(error);
        }
    },
);

export default axiosInstance;
