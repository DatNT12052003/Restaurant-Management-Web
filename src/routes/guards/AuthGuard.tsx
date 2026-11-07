import { useAppSelector } from "@/hooks";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const AuthGuard = () => {
    const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
    const location = useLocation();

    if (!isInitialized) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default AuthGuard;
