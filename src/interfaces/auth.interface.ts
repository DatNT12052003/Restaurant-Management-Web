import type { IUser } from "@/interfaces";
import type { OTPTypeEnum } from "@/types";
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
export interface IForgotPassword {
    email: string;
    type: OTPTypeEnum;
}
export interface IForgotPasswordResponse {
    account_id: number;
}
export interface IConfirmOTP {
    account_id: number;
    code: string;
    type: OTPTypeEnum;
}

export interface IConfirmOTPResponse {
    reset_password_token: string;
}

export interface IResetPassword {
    reset_password_token: string;
    new_password: string;
    confirm_password: string;
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
