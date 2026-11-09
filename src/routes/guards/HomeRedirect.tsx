import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/hooks";
import { ROUTES } from "@/constants/routes";
import { STAFF_ROLES } from "@/constants/roles";
import Home from "@/pages/customer/Home";

/** `/`: nhân viên vào khu quản trị; khách (đã hoặc chưa đăng nhập) thấy trang chủ công khai (giai đoạn 13). */
const HomeRedirect = () => {
    const { isAuthenticated, isInitialized, roles } = useAppSelector((state) => state.auth);
    if (!isInitialized) return null;
    if (isAuthenticated && roles.some((r) => STAFF_ROLES.includes(r))) {
        return <Navigate to={ROUTES.ADMIN} replace />;
    }
    return <Home />;
};

export default HomeRedirect;
