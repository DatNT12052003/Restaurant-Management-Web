import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { usePermission } from "@/hooks";

interface RequirePermissionProps {
    permission: string | string[];
    children: ReactNode;
}

/** Chặn truy cập trang khi thiếu quyền (backend vẫn kiểm tra ở từng API). */
const RequirePermission = ({ permission, children }: RequirePermissionProps) => {
    const allowed = usePermission(permission);
    return allowed ? <>{children}</> : <Navigate to="/unauthorized" replace />;
};

export default RequirePermission;
