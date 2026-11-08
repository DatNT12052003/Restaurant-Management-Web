import MainLayout from "./MainLayout";
import {
    BarChart3,
    Building2,
    ChefHat,
    TicketPercent,
    Wallet,
    CalendarClock,
    History,
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
import { connectSocket, disconnectSocket, subscribeRestaurant } from "@/lib/socket";

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

    // Realtime (giai đoạn 4): kết nối khi đăng nhập, ngắt khi rời khu admin / đăng xuất
    const userId = user?.id;
    useEffect(() => {
        if (!userId) return;
        connectSocket();
        return () => disconnectSocket();
    }, [userId]);

    // Admin nhận sự kiện của chi nhánh đang chọn; nhân viên tự vào room nhà hàng mình ở backend
    const isAdmin = roles.includes("admin");
    const branchId = currentBranch?.id ?? null;
    useEffect(() => {
        if (userId && isAdmin) subscribeRestaurant(branchId);
    }, [userId, isAdmin, branchId]);

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
        { path: "/admin/orders", label: t("menu.orders"), icon: ClipboardList, permission: "order.view" },
        { path: "/admin/kitchen", label: t("menu.kitchen"), icon: ChefHat, permission: "order_item.prepare" },
        { path: "/admin/cashier", label: t("menu.cashier"), icon: Wallet, permission: "payment.view" },
        { path: "/admin/discounts", label: t("menu.discounts"), icon: TicketPercent, permission: "discount.view" },
        { path: "/admin/inventory", label: t("menu.inventory"), icon: Package, permission: "inventory.view" },
        { path: "/admin/reports", label: t("menu.reports"), icon: BarChart3, permission: "report.view" },
        { path: "/admin/audit-logs", label: t("menu.audit_logs"), icon: History, permission: "audit_log.view" },
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
