import type { IResponse } from "@/interfaces";
import api from "./axios";

import type {
    IConfirmOTP,
    IConfirmOTPResponse,
    IForgotPassword,
    IForgotPasswordResponse,
    ILogin,
    ILoginResponse,
    IMe,
    IRefreshTokenResponse,
    IResetPassword,
} from "@/interfaces/auth.interface";

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

export const forgotPassword = async (credentials: IForgotPassword): Promise<IResponse<IForgotPasswordResponse>> => {
    const response = await api.post<IResponse<IForgotPasswordResponse>>("/auth/forgot-password", credentials);
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

export const confirmOTP = async (credentials: IConfirmOTP): Promise<IResponse<IConfirmOTPResponse>> => {
    const response = await api.post<IResponse<IConfirmOTPResponse>>("/auth/confirm-otp", credentials);
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

export const resetPassword = async (data: IResetPassword): Promise<IResponse<null>> => {
    const response = await api.post<IResponse<null>>("/auth/reset-password", data);
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};
