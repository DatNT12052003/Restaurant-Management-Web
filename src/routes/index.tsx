import { createBrowserRouter } from "react-router-dom";
import Login from "@/pages/public/Login";
import AuthGuard from "./guards/AuthGuard";
import RoleGuard from "./guards/RoleGuard";
import { adminRoutes } from "./admin.route";
import AdminLayout from "@/layouts/AdminLayout";
import ForgotPassword from "@/pages/public/ForgotPassword";
import ConfirmOTP from "@/pages/public/ConfirmOTP";
import ResetPassword from "@/pages/public/ResetPassword";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/forgot-password",
        element: <ForgotPassword />,
    },
    {
        path: "/confirm-otp",
        element: <ConfirmOTP />,
    },
    {
        path: "/reset-password",
        element: <ResetPassword />,
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
