import MainLayout from "./MainLayout";
import { BarChart3, ClipboardList, LayoutDashboard, MenuIcon, Package, Settings, Table2, Users } from "lucide-react";
import type { ISidebarMenuItem } from "@/interfaces";
import { useAppSelector } from "@/hooks";

const adminMenuItems: ISidebarMenuItem[] = [
    { path: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/admin/staff", label: "Nhân sự", icon: Users },
    { path: "/admin/tables", label: "Quản lý bàn", icon: Table2 },
    { path: "/admin/menu", label: "Thực đơn", icon: MenuIcon },
    { path: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
    { path: "/admin/inventory", label: "Kho hàng", icon: Package },
    { path: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
    { path: "/admin/settings", label: "Cài đặt", icon: Settings },
];

const AdminLayout = () => {
    const user = useAppSelector((state) => state.auth.user);
    const roles = useAppSelector((state) => state.auth.roles);
    return <MainLayout mainMenuItems={adminMenuItems} user={user!} roles={roles} />;
};

export default AdminLayout;
