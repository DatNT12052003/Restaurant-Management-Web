import { createBrowserRouter } from "react-router-dom";
import Login from "@/pages/public/Login";
import AuthGuard from "./guards/AuthGuard";
import MainLayout from "@/layouts/MainLayout";
import RoleGuard from "./guards/RoleGuard";
import { adminRoutes } from "./admin.route";

export const router = createBrowserRouter([
    // Trang login không cần authentication
    {
        path: "/login",
        element: <Login />,
    },

    // Các trang cần authentication sẽ được bao bọc bởi AuthGuard
    {
        element: <AuthGuard />,
        children: [
            {
                path: "/",
                element: <MainLayout />,
                children: [
                    // Nhánh ADMIN: Vừa phải login, vừa phải là Role 'admin'
                    {
                        path: "admin",
                        element: <RoleGuard allowedRoles={["admin"]} />,
                        children: adminRoutes, // Dùng file adminRoutes.tsx đã tách
                    },

                    // Nhánh EMPLOYEE: Vừa phải login, vừa phải là Role 'employee'
                    // {
                    //     path: "employee",
                    //     element: <RoleGuard allowedRoles={["employee"]} />,
                    //     children: employeeRoutes, // Dùng file employeeRoutes.tsx đã tách
                    // },

                    // Các trang dùng chung cho mọi user đã login
                    // { path: "profile", element: <UserProfile /> },
                ],
            },
        ],
    },
]);
