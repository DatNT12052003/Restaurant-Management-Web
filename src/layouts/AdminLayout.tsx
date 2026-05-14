import MainLayout from "./MainLayout";
import { BarChart3, ClipboardList, LayoutDashboard, MenuIcon, Package, Settings, Table2, Users } from "lucide-react";
import type { IRestaurant, ISidebarMenuItem } from "@/interfaces";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { useEffect, useState } from "react";
import { getAllRestaurantsThunk } from "@/store/restaurant/restaurantThunk";

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
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const roles = useAppSelector((state) => state.auth.roles);
    const [isLoading, setIsLoading] = useState(true);
    const [branchList, setBranchList] = useState<IRestaurant[]>([]);

    const defaultCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
    const currentBranch = localStorage.getItem("selected_branch")
        ? JSON.parse(localStorage.getItem("selected_branch") as string)
        : null;

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const result = await dispatch(getAllRestaurantsThunk()).unwrap();
                if (result.success) {
                    const data = result.data || [];
                    setBranchList(data);
                }
            } catch (error) {
                console.error("Fetch branches failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user && roles.includes("admin")) {
            fetchBranches();
        }
    }, [dispatch, user, roles]);

    if (!user || !roles.includes("admin")) {
        return <div>Bạn không có quyền truy cập trang này.</div>;
    }

    if (isLoading) {
        return <div>Đang tải dữ liệu...</div>;
    }

    return (
        <MainLayout
            mainMenuItems={adminMenuItems}
            user={user}
            roles={roles}
            branches={branchList}
            currentBranch={currentBranch}
            defaultCollapsed={defaultCollapsed}
        />
    );
};

export default AdminLayout;
