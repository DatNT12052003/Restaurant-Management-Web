import type { RouteObject } from "react-router-dom";
import Dashboard from "@/pages/admin/Dashboard";
import EmployeeManagement from "@/pages/admin/EmployeeManagement";
import GuestManagement from "@/pages/admin/GuestManagement";
import Permissions from "@/pages/admin/Permissions";
import Profile from "@/pages/admin/Profile";
import Restaurants from "@/pages/admin/Restaurants";
import RoomsTables from "@/pages/admin/RoomsTables";
import Menu from "@/pages/admin/menu/Menu";
import RequirePermission from "./guards/RequirePermission";

export const adminRoutes: RouteObject[] = [
    {
        index: true,
        element: <Dashboard />,
    },
    { path: "dashboard", element: <Dashboard /> },
    { path: "profile", element: <Profile /> },
    {
        path: "restaurants",
        element: (
            <RequirePermission permission="restaurant.view">
                <Restaurants />
            </RequirePermission>
        ),
    },
    {
        path: "employees",
        element: (
            <RequirePermission permission="employee.view">
                <EmployeeManagement />
            </RequirePermission>
        ),
    },
    {
        path: "guests",
        element: (
            <RequirePermission permission="guest.view">
                <GuestManagement />
            </RequirePermission>
        ),
    },
    {
        path: "tables",
        element: (
            <RequirePermission permission={["room.view", "table.view"]}>
                <RoomsTables />
            </RequirePermission>
        ),
    },
    {
        path: "menu",
        element: (
            <RequirePermission permission={["dish.view", "combo.view"]}>
                <Menu />
            </RequirePermission>
        ),
    },
    {
        path: "permissions",
        element: (
            <RequirePermission permission="permission.view">
                <Permissions />
            </RequirePermission>
        ),
    },
];
