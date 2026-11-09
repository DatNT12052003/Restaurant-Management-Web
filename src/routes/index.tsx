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
import HomeRedirect from "./guards/HomeRedirect";
import { STAFF_ROLES } from "@/constants/roles";
import { NotFoundPage, UnauthorizedPage } from "@/pages/public/ErrorPage";
import PublicLayout from "@/layouts/PublicLayout";
import MenuPage from "@/pages/customer/MenuPage";
import BookingPage from "@/pages/customer/BookingPage";
import BookingLookup from "@/pages/customer/BookingLookup";
import TablePage from "@/pages/customer/TablePage";
import Register from "@/pages/customer/Register";
import Account from "@/pages/customer/Account";

export const router = createBrowserRouter([
    // Giai đoạn 13: khu công khai cho khách (thực đơn, đặt bàn, gọi món QR, tài khoản)
    {
        element: <PublicLayout />,
        children: [
            { path: "/", element: <HomeRedirect /> },
            { path: "/menu/:restaurantId", element: <MenuPage /> },
            { path: "/booking", element: <BookingPage /> },
            { path: "/booking/lookup", element: <BookingLookup /> },
            { path: "/booking/:code", element: <BookingLookup /> },
            { path: "/t/:token", element: <TablePage /> },
            { path: "/register", element: <Register /> },
            {
                element: <AuthGuard />,
                children: [{ element: <RoleGuard allowedRoles={["guest"]} />, children: [{ path: "/account", element: <Account /> }] }],
            },
        ],
    },
    {
        path: "/unauthorized",
        element: <UnauthorizedPage />,
    },
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
                element: <RoleGuard allowedRoles={STAFF_ROLES} />,
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
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
