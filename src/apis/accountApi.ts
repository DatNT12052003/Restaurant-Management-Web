import type { IAccountListQuery, IGetAccountList, IResponse } from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** Danh sách tài khoản kèm người dùng (manager chỉ thấy chi nhánh của mình) */
export const getAccountList = (query: IAccountListQuery = {}): Promise<IResponse<IGetAccountList>> =>
    unwrap(api.get("/accounts", { params: query }));

// Thao tác trên tài khoản của một người dùng cấp dưới (theo user id)

export const unlockAccount = (userId: number): Promise<IResponse<{ account_id: number }>> =>
    unwrap(api.post(`/users/${userId}/account/unlock`));

export const logoutAccountEverywhere = (userId: number): Promise<IResponse<{ revoked: number }>> =>
    unwrap(api.post(`/users/${userId}/account/logout-all`));

export const resetAccountPassword = (
    userId: number,
    payload: { new_password: string; confirm_password: string },
): Promise<IResponse<{ account_id: number }>> => unwrap(api.post(`/users/${userId}/account/reset-password`, payload));
