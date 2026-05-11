// src/api/interceptors.ts
import type { AxiosInstance } from "axios";

// Hàm này sẽ được gọi ở nơi có thể truy cập store mà không bị vòng lặp
export const setupInterceptors = (axiosInstance: AxiosInstance, store: any) => {
    axiosInstance.interceptors.request.use((config) => {
        const state = store.getState();
        const token = state.auth.access_token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // axiosInstance.interceptors.response.use(
    //     (response) => response,
    //     async (error) => {
    //         const originalRequest = error.config;
    //         if (error.response?.status === 401 && !originalRequest._retry) {
    //             originalRequest._retry = true;
    //             try {
    //                 const response = await axiosInstance.post("/api/auth/refresh");
    //                 const { access_token } = response.data;
    //                 store.dispatch(setTokenAction(access_token));
    //                 return axiosInstance(originalRequest);
    //             } catch (refreshError) {
    //                 store.dispatch(logoutAction());
    //                 return Promise.reject(refreshError);
    //             }
    //         }
    //         return Promise.reject(error);
    //     },
    // );
};
