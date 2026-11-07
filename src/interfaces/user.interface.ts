import type { GenderEnum, UserStatusEnum } from "@/enum";
import type { ICreateAccount, IPagination } from "@/interfaces";

export interface IUser {
    id: number;
    full_name: string;
    date_of_birth: string;
    gender: GenderEnum;
    address: string;
    email: string;
    phone_number: string;
    avatar_url?: string;
    status: UserStatusEnum;
    created_at: string;
    account_id: number;
    restaurant_id: number;
}

export interface IUserWithAccount extends IUser {
    username: string;
}

export interface IEmployee {
    employee: IUserWithAccount;
    roles: string[];
    permissions: string[];
}

export interface IGetEmployees {
    employees: IEmployee[];
    pagination: IPagination;
}

export interface ICreateUser extends Omit<IUser, "id" | "avatar_url" | "created_at" | "account_id" | "restaurant_id"> {}

export interface ICreateEmployee extends ICreateUser {
    restaurant_id: number;
}

export interface ICreateEmployeeWithAccount {
    user: ICreateEmployee;
    account: ICreateAccount;
}
