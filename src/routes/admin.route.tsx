import type { RouteObject } from "react-router-dom";
import Dashboard from "@/pages/admin/Dashboard";

export const adminRoutes: RouteObject[] = [
    {
        index: true,
        element: <Dashboard />,
    },
    { path: "dashboard", element: <Dashboard /> },
];
