import { createBrowserRouter } from "react-router-dom";
import Login from "@/pages/public/Login";
import AuthGuard from "./guards/AuthGuard";
import RoleGuard from "./guards/RoleGuard";
import { adminRoutes } from "./admin.route";
import AdminLayout from "@/layouts/AdminLayout";
import ForgotPassword from "@/pages/public/ForgotPassword";
import ConfirmOTP from "@/pages/public/ConfirmOTP";
import ResetPassword from "@/pages/public/ResetPassword";
import SequentialRoute from "./guards/SequentialRoute";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/forgot-password",
        element: (
            <SequentialRoute requiredPrevPath={["/login", "/confirm-otp"]}>
                <ForgotPassword />
            </SequentialRoute>
        ),
    },
    {
        path: "/confirm-otp",
        element: (
            <SequentialRoute requiredPrevPath={["/forgot-password"]}>
                <ConfirmOTP />
            </SequentialRoute>
        ),
    },
    {
        path: "/reset-password",
        element: (
            <SequentialRoute requiredPrevPath={["/confirm-otp"]}>
                <ResetPassword />
            </SequentialRoute>
        ),
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
