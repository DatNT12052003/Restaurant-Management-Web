import { createAsyncThunk } from "@reduxjs/toolkit";

import { getMe, login, refreshToken } from "@/apis";
import type { ILogin, ILoginResponse, IMe, IRefreshTokenResponse } from "@/interfaces/auth.interface";

export const loginThunk = createAsyncThunk<ILoginResponse, ILogin>("auth/login", async (credentials) => {
    const response = await login(credentials);
    return response.data!;
});

export const getMeThunk = createAsyncThunk<IMe, void>("auth/getMe", async () => {
    const response = await getMe();
    return response.data!;
});

export const refreshTokenThunk = createAsyncThunk<IRefreshTokenResponse, void>("auth/refreshToken", async () => {
    const response = await refreshToken();
    return response.data!;
});
