import type { IResponse } from "@/interfaces";
import api from "./axios";

import type { ILogin, ILoginResponse, IMe, IRefreshTokenResponse } from "@/interfaces/auth.interface";

export const login = async (credentials: ILogin): Promise<IResponse<ILoginResponse>> => {
    const response = await api.post<IResponse<ILoginResponse>>("/auth/login", credentials);
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

export const getMe = async (): Promise<IResponse<IMe>> => {
    const response = await api.get<IResponse<IMe>>("/auth/me");
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

export const refreshToken = async (): Promise<IResponse<IRefreshTokenResponse>> => {
    const response = await api.post<IResponse<IRefreshTokenResponse>>("/auth/refresh");
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

export const logoutAll = async (): Promise<void> => {
    await api.post("/auth/logout-all");
};
