import type { IUser } from "@/apis/userApi";

export interface ILogin {
    username: string;
    password: string;
}

export interface ILoginResponse {
    account_id: number;
    username: string;
    access_token: string;
}

export interface IMe {
    account_id: number;
    username: string;
    user: IUser;
    roles: string[];
    permissions: string[];
}

export interface IRefreshTokenResponse {
    access_token: string;
}

export interface IAuthState {
    isAuthenticated: boolean;
    isInitialized: boolean;
    account_id: number | null;
    username: string | null;
    access_token: string | null;
    user: IUser | null;
    roles: string[];
    permissions: string[];
    loading: boolean;
    error: string | null;
}
