import { ROUTES } from "@/constants/routes";
import { STAFF_ROLES } from "@/constants/roles";

/**
 * Trang đầu tiên sau khi đăng nhập.
 * Hiện mọi vai trò nhân viên dùng chung khu quản trị /admin (menu và trang được lọc theo quyền).
 * Khi có màn hình riêng (thu ngân, bếp, phục vụ...) ở các giai đoạn sau thì tách ra tại đây.
 */
export const getDashboardByRole = (role: string | undefined) => {
    if (role && STAFF_ROLES.includes(role)) {
        return ROUTES.ADMIN;
    }
    return ROUTES.HOME;
};
