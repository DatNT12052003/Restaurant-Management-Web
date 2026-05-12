import type { GenderEnum, UserStatusEnum } from "@/types";

export interface IUser {
    id: number;
    full_name: string;
    date_of_birth: string;
    gender: GenderEnum;
    address: string;
    email: string;
    phone_number: string;
    avatar_url: string;
    status: UserStatusEnum;
    account_id: number;
}
