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
