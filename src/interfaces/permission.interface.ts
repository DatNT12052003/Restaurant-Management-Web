export interface IPermission {
    id: number;
    name: string;
    /** Ví dụ: "room.update" */
    type_name: string;
}

export interface IRoleWithPermissions {
    id: number;
    name: string;
    type_name: string;
    permissions: string[];
    user_count: number;
    /** Người dùng hiện tại có được sửa quyền của role này không */
    editable: boolean;
}

export interface IUserPermissions {
    role_permissions: string[];
    direct_permissions: string[];
}
