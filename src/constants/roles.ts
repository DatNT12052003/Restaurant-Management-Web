import { ROLE } from "./common";

/** Các vai trò nhân viên (không gồm guest), theo thứ tự hiển thị */
export const STAFF_ROLES: string[] = [
    ROLE.ADMIN,
    ROLE.MANAGER,
    ROLE.SUPERVISOR,
    ROLE.CASHIER,
    ROLE.RECEPTIONIST,
    ROLE.WAITSTAFF,
    ROLE.BARISTA,
    ROLE.HEAD_CHEF,
    ROLE.SOUS_CHEF,
    ROLE.COMMIS_CHEF,
    ROLE.CLEANER_STAFF,
    ROLE.GUARD,
];

/**
 * Cấp bậc vai trò — phải khớp `src/common/role-level.ts` ở backend.
 * Chỉ dùng để ẩn lựa chọn trên giao diện; backend mới là nơi kiểm tra.
 */
const ROLE_LEVEL: Record<string, number> = {
    [ROLE.ADMIN]: 100,
    [ROLE.MANAGER]: 80,
    [ROLE.SUPERVISOR]: 60,
    [ROLE.GUEST]: 10,
};
const DEFAULT_STAFF_LEVEL = 40;

export const getRoleLevel = (role: string) => ROLE_LEVEL[role] ?? DEFAULT_STAFF_LEVEL;

export const maxRoleLevel = (roles: string[]) => (roles.length ? Math.max(...roles.map(getRoleLevel)) : 0);

/** Vai trò mà người có `myRoles` được phép gán cho người khác */
export const getAssignableRoles = (myRoles: string[]): string[] => {
    if (myRoles.includes(ROLE.ADMIN)) return STAFF_ROLES;
    const myLevel = maxRoleLevel(myRoles);
    return STAFF_ROLES.filter((r) => getRoleLevel(r) < myLevel);
};

/** Có được sửa / xóa người có `targetRoles` không */
export const canManage = (myRoles: string[], targetRoles: string[]) =>
    myRoles.includes(ROLE.ADMIN) || maxRoleLevel(myRoles) > maxRoleLevel(targetRoles);

/** Màu badge cho trạng thái sử dụng của bàn / phòng */
export const USAGE_STATUS_STYLE: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
    reserved: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200",
    occupied: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200",
    cleaning: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200",
};

export const USAGE_STATUSES = ["available", "reserved", "occupied", "cleaning"] as const;
export const ROOM_TYPES = ["public", "private", "private_pro"] as const;
export const MAX_TABLES_PER_PRIVATE_ROOM = 5;
