import type { RouteObject } from "react-router-dom";
import Dashboard from "@/pages/admin/Dashboard";
import EmployeeManagement from "@/pages/admin/EmployeeManagement";

export const adminRoutes: RouteObject[] = [
    {
        index: true,
        element: <Dashboard />,
    },
    { path: "dashboard", element: <Dashboard /> },
    { path: "employees", element: <EmployeeManagement /> },
];
