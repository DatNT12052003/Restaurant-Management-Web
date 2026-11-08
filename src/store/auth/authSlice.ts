import type { IAuthState, ILoginResponse, IMe, IRefreshTokenResponse, IResponse } from "@/interfaces";
import { loginThunk, refreshTokenThunk, getMeThunk, logoutThunk, logoutAllThunk } from "./authThunk";
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
        // Dùng bởi axios interceptor khi tự refresh token
        setAccessToken: (state, action: { payload: string }) => {
            state.access_token = action.payload;
            state.isAuthenticated = true;
        },
        // Xóa phiên đăng nhập phía client (giữ isInitialized)
        clearAuth: (state) => ({ ...initialState, isInitialized: state.isInitialized }),
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginThunk.pending, (state: IAuthState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginThunk.fulfilled, (state: IAuthState, action: { payload: IResponse<ILoginResponse> }) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.account_id = action.payload.data?.account_id || null;
                state.username = action.payload.data?.username || null;
                state.access_token = action.payload.data?.access_token || null;
            })
            .addCase(loginThunk.rejected, (state: IAuthState, action: { payload?: IResponse<null> }) => {
                state.loading = false;
                state.error = action.payload?.message || "An error occurred";
            })
            .addCase(getMeThunk.fulfilled, (state: IAuthState, action: { payload: IResponse<IMe> }) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.data?.user || null;
                state.roles = action.payload.data?.roles || [];
                state.permissions = action.payload.data?.permissions || [];
                state.account_id = action.payload.data?.account_id || null;
                state.username = action.payload.data?.username || null;
            })
            .addCase(getMeThunk.rejected, (state: IAuthState, action: { payload?: IResponse<null> }) => {
                state.loading = false;
                state.error = action.payload?.message || "An error occurred";
            })
            .addCase(refreshTokenThunk.pending, (state: IAuthState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                refreshTokenThunk.fulfilled,
                (state: IAuthState, action: { payload: IResponse<IRefreshTokenResponse> }) => {
                    state.loading = false;
                    state.isAuthenticated = true;
                    state.access_token = action.payload.data?.access_token || null;
                },
            )
            .addCase(logoutThunk.fulfilled, (state: IAuthState) => ({ ...initialState, isInitialized: state.isInitialized }))
            .addCase(logoutThunk.rejected, (state: IAuthState) => ({ ...initialState, isInitialized: state.isInitialized }))
            .addCase(logoutAllThunk.fulfilled, (state: IAuthState) => ({
                ...initialState,
                isInitialized: state.isInitialized,
            }))
            .addCase(refreshTokenThunk.rejected, (state: IAuthState, action: { payload?: IResponse<null> }) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.account_id = null;
                state.username = null;
                state.access_token = null;
                state.error = action.payload?.message || "An error occurred";
            });
    },
});

export const { setInitialized, setAccessToken, clearAuth } = authSlice.actions;
const authReducer = authSlice.reducer;
export default authReducer;
