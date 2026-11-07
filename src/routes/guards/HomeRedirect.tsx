import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/hooks";
import { ROUTES } from "@/constants/routes";
import { getDashboardByRole } from "@/utils/getDashboardByRole";

/** `/`: chuyển tới dashboard theo vai trò (ưu tiên admin), hoặc /login nếu chưa đăng nhập. */
const HomeRedirect = () => {
    const { isAuthenticated, roles } = useAppSelector((state) => state.auth);

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    const role = roles.includes("admin") ? "admin" : roles[0];
    return <Navigate to={getDashboardByRole(role)} replace />;
};

export default HomeRedirect;
