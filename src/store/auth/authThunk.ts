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

export const loginThunk = createAsyncThunk<IResponse<ILoginResponse>, ILogin>(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await login(credentials);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const getMeThunk = createAsyncThunk<IResponse<IMe>, void>("auth/getMe", async (_, { rejectWithValue }) => {
    try {
        const response = await getMe();
        return response;
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const refreshTokenThunk = createAsyncThunk<IResponse<IRefreshTokenResponse>, void>(
    "auth/refreshToken",
    async (_, { rejectWithValue }) => {
        try {
            const response = await refreshToken();
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const logoutThunk = createAsyncThunk<void, void>("auth/logout", async (_, { rejectWithValue }) => {
    try {
        await logout();
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const logoutAllThunk = createAsyncThunk<void, void>("auth/logoutAll", async (_, { rejectWithValue }) => {
    try {
        await logoutAll();
    } catch (error: any) {
        return rejectWithValue(error.response.data);
    }
});

export const forgotPasswordThunk = createAsyncThunk<IResponse<IForgotPasswordResponse>, IForgotPassword>(
    "auth/forgotPassword",
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await forgotPassword(credentials);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const confirmOTPThunk = createAsyncThunk<IResponse<IConfirmOTPResponse>, IConfirmOTP>(
    "auth/confirmOTP",
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await confirmOTP(credentials);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const resetPasswordThunk = createAsyncThunk<IResponse<null>, IResetPassword>(
    "auth/resetPassword",
    async (data, { rejectWithValue }) => {
        try {
            const response = await resetPassword(data);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);
