import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/hooks";

interface RoleGuardProps {
    allowedRoles: string[];
}

const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
    const roles: string[] = useAppSelector((state) => state.auth.roles || []);

    const hasAccess = roles.some((r) => allowedRoles.includes(r));

    if (!hasAccess) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default RoleGuard;
