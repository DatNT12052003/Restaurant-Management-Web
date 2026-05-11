import type { IAuthState, ILoginResponse, IMe, IRefreshTokenResponse } from "@/interfaces";
import { loginThunk, refreshTokenThunk, getMeThunk } from "./authThunk";
import { createSlice } from "@reduxjs/toolkit";

const initialState: IAuthState = {
    isAuthenticated: false,
    isInitialized: false,
    account_id: null,
    username: null,
    access_token: null,
    user: null,
    roles: [],
    permissions: [],
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setInitialized: (state, action) => {
            state.isInitialized = action.payload;
        },
    },
    extraReducers: (builder: any) => {
        builder
            .addCase(loginThunk.pending, (state: IAuthState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginThunk.fulfilled, (state: IAuthState, action: { payload: ILoginResponse }) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.account_id = action.payload.account_id;
                state.username = action.payload.username;
                state.access_token = action.payload.access_token;
            })
            .addCase(loginThunk.rejected, (state: IAuthState, action: { error: { message: string } }) => {
                state.loading = false;
                state.error = action.error.message || "An error occurred";
            })
            .addCase(getMeThunk.fulfilled, (state: IAuthState, action: { payload: IMe }) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user || null;
                state.roles = action.payload.roles || [];
                state.permissions = action.payload.permissions || [];
                state.account_id = action.payload.account_id || state.account_id;
                state.username = action.payload.username || state.username;
            })
            .addCase(getMeThunk.rejected, (state: IAuthState, action: { error: { message: string } }) => {
                state.loading = false;
                state.error = action.error.message || "An error occurred";
            })
            .addCase(refreshTokenThunk.pending, (state: IAuthState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(refreshTokenThunk.fulfilled, (state: IAuthState, action: { payload: IRefreshTokenResponse }) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.access_token = action.payload.access_token;
            })
            .addCase(refreshTokenThunk.rejected, (state: IAuthState, action: { error: { message: string } }) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.account_id = null;
                state.username = null;
                state.access_token = null;
                state.error = action.error.message || "An error occurred";
            });
    },
});

export const { setInitialized } = authSlice.actions;

const authReducer = authSlice.reducer;
export default authReducer;
