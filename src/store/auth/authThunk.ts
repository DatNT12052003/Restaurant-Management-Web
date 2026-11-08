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
import { toRejectPayload } from "@/lib/api-error";
import { setSessionHint } from "@/lib/session-hint";

/** Thunk bị từ chối trả về body lỗi của backend (xem toRejectPayload) */
type Reject = { rejectValue: IResponse<null> };

export const loginThunk = createAsyncThunk<IResponse<ILoginResponse>, ILogin, Reject>(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await login(credentials);
            setSessionHint(true);
            return response;
        } catch (error) {
            return rejectWithValue(toRejectPayload(error));
        }
    },
);

export const getMeThunk = createAsyncThunk<IResponse<IMe>, void, Reject>("auth/getMe", async (_, { rejectWithValue }) => {
    try {
        const response = await getMe();
        return response;
    } catch (error) {
        return rejectWithValue(toRejectPayload(error));
    }
});

export const refreshTokenThunk = createAsyncThunk<IResponse<IRefreshTokenResponse>, void, Reject>(
    "auth/refreshToken",
    async (_, { rejectWithValue }) => {
        try {
            const response = await refreshToken();
            setSessionHint(true);
            return response;
        } catch (error) {
            setSessionHint(false);
            return rejectWithValue(toRejectPayload(error));
        }
    },
);

export const logoutThunk = createAsyncThunk<void, void, Reject>("auth/logout", async (_, { rejectWithValue }) => {
    try {
        await logout();
    } catch (error) {
        return rejectWithValue(toRejectPayload(error));
    } finally {
        setSessionHint(false);
    }
});

export const logoutAllThunk = createAsyncThunk<void, void, Reject>("auth/logoutAll", async (_, { rejectWithValue }) => {
    try {
        await logoutAll();
    } catch (error) {
        return rejectWithValue(toRejectPayload(error));
    } finally {
        setSessionHint(false);
    }
});

export const forgotPasswordThunk = createAsyncThunk<IResponse<IForgotPasswordResponse>, IForgotPassword, Reject>(
    "auth/forgotPassword",
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await forgotPassword(credentials);
            return response;
        } catch (error) {
            return rejectWithValue(toRejectPayload(error));
        }
    },
);

export const confirmOTPThunk = createAsyncThunk<IResponse<IConfirmOTPResponse>, IConfirmOTP, Reject>(
    "auth/confirmOTP",
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await confirmOTP(credentials);
            return response;
        } catch (error) {
            return rejectWithValue(toRejectPayload(error));
        }
    },
);

export const resetPasswordThunk = createAsyncThunk<IResponse<null>, IResetPassword, Reject>(
    "auth/resetPassword",
    async (data, { rejectWithValue }) => {
        try {
            const response = await resetPassword(data);
            return response;
        } catch (error) {
            return rejectWithValue(toRejectPayload(error));
        }
    },
);
