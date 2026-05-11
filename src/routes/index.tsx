import { createBrowserRouter } from "react-router-dom";
import Login from "@/pages/public/Login";
import AuthGuard from "./guards/AuthGuard";
import RoleGuard from "./guards/RoleGuard";
import { adminRoutes } from "./admin.route";
import AdminLayout from "@/layouts/AdminLayout";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        element: <AuthGuard />,
        children: [
            {
                element: <RoleGuard allowedRoles={["admin"]} />,
                children: [
                    {
                        path: "/admin",
                        element: <AdminLayout />,
                        children: adminRoutes,
                    },
                ],
            },
        ],
    },
]);
