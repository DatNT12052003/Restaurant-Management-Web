import type { IAuthState, ILoginResponse, IMe, IRefreshTokenResponse, IResponse } from "@/interfaces";
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
            .addCase(loginThunk.fulfilled, (state: IAuthState, action: { payload: IResponse<ILoginResponse> }) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.account_id = action.payload.data?.account_id || null;
                state.username = action.payload.data?.username || null;
                state.access_token = action.payload.data?.access_token || null;
            })
            .addCase(loginThunk.rejected, (state: IAuthState, action: { error: { message: string } }) => {
                state.loading = false;
                state.error = action.error.message || "An error occurred";
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
            .addCase(getMeThunk.rejected, (state: IAuthState, action: { error: { message: string } }) => {
                state.loading = false;
                state.error = action.error.message || "An error occurred";
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
