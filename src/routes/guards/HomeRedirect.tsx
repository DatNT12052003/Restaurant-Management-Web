import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/hooks";
import { ROUTES } from "@/constants/routes";
import { getDashboardByRole } from "@/utils/getDashboardByRole";
import { STAFF_ROLES } from "@/constants/roles";

/** `/`: chuyển tới dashboard theo vai trò (ưu tiên admin), hoặc /login nếu chưa đăng nhập. */
const HomeRedirect = () => {
    const { isAuthenticated, roles } = useAppSelector((state) => state.auth);

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    const staffRole = roles.find((r) => STAFF_ROLES.includes(r));
    const target = getDashboardByRole(staffRole);
    // Khách hàng chưa có giao diện riêng -> tránh vòng lặp chuyển hướng về chính "/"
    if (target === ROUTES.HOME) {
        return <Navigate to="/unauthorized" replace />;
    }
    return <Navigate to={target} replace />;
};

export default HomeRedirect;
