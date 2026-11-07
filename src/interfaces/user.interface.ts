import type { GenderEnum, GuestStatusEnum, UserStatusEnum } from "@/enum";
import type { ICreateAccount, IPagination } from "@/interfaces";

export interface IUser {
    id: number;
    full_name: string;
    date_of_birth: string | null;
    gender: GenderEnum | null;
    address: string | null;
    email: string | null;
    phone_number: string | null;
    avatar_url?: string | null;
    status: UserStatusEnum;
    created_at: string;
    account_id: number | null;
    restaurant_id: number | null;
    /** numeric từ PostgreSQL được trả về dạng chuỗi */
    salary?: string | number | null;
    guest_status?: GuestStatusEnum | null;
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

export interface IGetGuests {
    guests: IUserWithAccount[];
    pagination: IPagination;
}

/** Thông tin cá nhân dùng chung cho form nhân viên / khách / hồ sơ */
export interface IProfileFields {
    full_name?: string;
    date_of_birth?: string | null;
    gender?: GenderEnum | null;
    address?: string | null;
    email?: string | null;
    phone_number?: string | null;
}

export interface IEmployeePayload {
    user: IProfileFields & {
        status?: UserStatusEnum;
        restaurant_id?: number | null;
        salary?: number | null;
    };
    /** Tạo mới: bắt buộc username + password. Sửa: chỉ username (tùy chọn). */
    account?: Partial<ICreateAccount>;
    roles?: string[];
    avatar?: File | null;
}

export interface IGuestPayload {
    user: IProfileFields & { guest_status?: GuestStatusEnum };
    account?: Partial<ICreateAccount>;
    avatar?: File | null;
}

export interface IChangePassword {
    current_password: string;
    new_password: string;
    confirm_password: string;
}
