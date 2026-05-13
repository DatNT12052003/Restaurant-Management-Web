import { createAsyncThunk } from "@reduxjs/toolkit";

import { confirmOTP, forgotPassword, getMe, login, logout, logoutAll, refreshToken, resetPassword } from "@/apis";
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
import type { IResponse } from "@/interfaces";

export const loginThunk = createAsyncThunk<IResponse<ILoginResponse>, ILogin>("auth/login", async (credentials) => {
    const response = await login(credentials);
    return response;
});

export const getMeThunk = createAsyncThunk<IResponse<IMe>, void>("auth/getMe", async () => {
    const response = await getMe();
    return response;
});

export const refreshTokenThunk = createAsyncThunk<IResponse<IRefreshTokenResponse>, void>(
    "auth/refreshToken",
    async () => {
        const response = await refreshToken();
        return response;
    },
);

export const logoutThunk = createAsyncThunk<void, void>("auth/logout", async () => {
    await logout();
});

export const logoutAllThunk = createAsyncThunk<void, void>("auth/logoutAll", async () => {
    await logoutAll();
});

export const forgotPasswordThunk = createAsyncThunk<IResponse<IForgotPasswordResponse>, IForgotPassword>(
    "auth/forgotPassword",
    async (credentials) => {
        const response = await forgotPassword(credentials);
        return response;
    },
);

export const confirmOTPThunk = createAsyncThunk<IResponse<IConfirmOTPResponse>, IConfirmOTP>(
    "auth/confirmOTP",
    async (credentials) => {
        const response = await confirmOTP(credentials);
        return response;
    },
);

export const resetPasswordThunk = createAsyncThunk<IResponse<null>, IResetPassword>(
    "auth/resetPassword",
    async (data) => {
        const response = await resetPassword(data);
        return response;
    },
);
