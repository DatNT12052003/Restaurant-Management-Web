import MainLayout from "./MainLayout";
import {
    BarChart3,
    Building2,
    CalendarClock,
    ClipboardList,
    LayoutDashboard,
    MenuIcon,
    Package,
    ShieldCheck,
    Table2,
    Users,
    User2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ISidebarMenuItem } from "@/interfaces";
import { useAppDispatch, useAppSelector, usePermission } from "@/hooks";
import { useEffect } from "react";
import { getAllRestaurantsThunk } from "@/store/restaurant/restaurantThunk";

const AdminLayout = () => {
    const { t } = useTranslation("admin");
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const roles = useAppSelector((state) => state.auth.roles);
    const { branches, branchesLoaded, currentBranch } = useAppSelector((state) => state.restaurant);
    const can = usePermission();

    const defaultCollapsed = localStorage.getItem("sidebar_collapsed") === "true";

    useEffect(() => {
        if (user) {
            dispatch(getAllRestaurantsThunk());
        }
    }, [dispatch, user]);

    // Các mục chưa có `permission` là trang của giai đoạn sau (hiện hiển thị trang 404)
    const menuItems: ISidebarMenuItem[] = [
        { path: "/admin/dashboard", label: t("menu.dashboard"), icon: LayoutDashboard },
        { path: "/admin/restaurants", label: t("menu.restaurants"), icon: Building2, permission: "restaurant.view" },
        { path: "/admin/employees", label: t("menu.employees"), icon: Users, permission: "employee.view" },
        { path: "/admin/guests", label: t("menu.guests"), icon: User2, permission: "guest.view" },
        { path: "/admin/tables", label: t("menu.tables"), icon: Table2, permission: "room.view" },
        {
            path: "/admin/reservations",
            label: t("menu.reservations"),
            icon: CalendarClock,
            permission: "reservation.view",
        },
        { path: "/admin/permissions", label: t("menu.permissions"), icon: ShieldCheck, permission: "permission.view" },
        { path: "/admin/menu", label: t("menu.menu"), icon: MenuIcon, permission: ["dish.view", "combo.view"] },
        { path: "/admin/orders", label: t("menu.orders"), icon: ClipboardList },
        { path: "/admin/inventory", label: t("menu.inventory"), icon: Package },
        { path: "/admin/reports", label: t("menu.reports"), icon: BarChart3 },
    ];

    if (!user) {
        return null;
    }

    if (!branchesLoaded) {
        return <div className="p-6 text-muted-foreground">{t("common.loading")}</div>;
    }

    return (
        <MainLayout
            mainMenuItems={menuItems.filter((item) => !item.permission || can(item.permission))}
            user={user}
            roles={roles}
            branches={branches}
            currentBranch={currentBranch}
            defaultCollapsed={defaultCollapsed}
            profilePath="/admin/profile"
        />
    );
};

export default AdminLayout;
