import type { IGetQuery, IPagination } from "./common.interface";

export interface IAccount {
    id: number;
    username: string;
    password: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface ICreateAccount {
    username: string;
    password: string;
}

/** Một dòng trên trang Tài khoản */
export interface IAccountListItem {
    id: number;
    username: string;
    last_login_at: string | null;
    locked_until: string | null;
    is_locked: boolean;
    failed_login_count: number;
    created_at: string;
    user_id: number;
    full_name: string;
    user_status: "active" | "inactive";
    restaurant_id: number | null;
    restaurant_name: string | null;
    roles: string[];
}

export interface IGetAccountList {
    accounts: IAccountListItem[];
    pagination: IPagination;
}

export interface IAccountListQuery extends IGetQuery {
    kind?: "employee" | "guest";
    locked?: boolean;
    restaurant_id?: number;
}
