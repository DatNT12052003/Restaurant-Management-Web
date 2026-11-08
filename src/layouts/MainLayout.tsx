import { useState, useEffect, memo } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Utensils, Menu as MenuIcon, LogOut, ChevronLeft, ChevronRight, Bell, Store } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch } from "@/hooks";
import { logoutThunk } from "@/store/auth/authThunk";
import { setCurrentBranch } from "@/store/restaurant/restaurantSlice";
import type { IRestaurant, ISidebarMenuItem, IUser } from "@/interfaces";

interface MainLayoutProps {
    mainMenuItems?: ISidebarMenuItem[];
    user?: IUser;
    roles?: string[];
    branches?: IRestaurant[];
    currentBranch?: IRestaurant | null;
    defaultCollapsed?: boolean;
    /** Đường dẫn trang hồ sơ cá nhân (mục "Hồ sơ" trong menu tài khoản) */
    profilePath?: string;
}

const MainLayout = ({
    defaultCollapsed = false,
    mainMenuItems = [],
    user,
    roles,
    branches,
    currentBranch,
    profilePath,
}: MainLayoutProps) => {
    const dispatch = useAppDispatch();
    // Trạng thái thu gọn sidebar lưu ở localStorage (đọc một lần khi khởi tạo)
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const saved = localStorage.getItem("sidebar_collapsed");
            return saved === null ? defaultCollapsed : saved === "true";
        } catch {
            return defaultCollapsed;
        }
    });
    // Chi nhánh đang chọn nằm trong Redux store (slice restaurant tự lưu localStorage)
    const currentRestaurant = currentBranch ?? null;
    const setCurrentRestaurant = (branch: IRestaurant) => dispatch(setCurrentBranch(branch));
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        try {
            localStorage.setItem("sidebar_collapsed", String(collapsed));
        } catch {
            // Trình duyệt chặn localStorage: bỏ qua
        }
    }, [collapsed]);

    // Đổi trang thì đóng menu trên điện thoại (cập nhật state trong lúc render khi pathname đổi)
    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setIsMobileOpen(false);
    }

    // Hàm trả JSX (không phải component) để không tạo component mới mỗi lần render
    const renderSidebar = () => (
        <div className="flex h-full flex-col bg-sidebar-background border-r border-sidebar-border">
            <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                        <Utensils className="h-5 w-5 text-white" />
                    </div>
                    {!collapsed && <span className="text-lg font-bold text-sidebar-foreground truncate">RMS</span>}
                </div>
                {!collapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex h-8 w-8"
                        onClick={() => setCollapsed(true)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
                {collapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex h-8 w-8"
                        onClick={() => setCollapsed(false)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <Separator className="mx-2 w-auto" />

            <ScrollArea className="flex-1 py-4">
                <nav className="grid gap-1 px-2">
                    {mainMenuItems.map((item) => {
                        const isActive =
                            location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground/70",
                                    collapsed && "justify-center",
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>
            </ScrollArea>

            <div className="mt-auto border-t border-sidebar-border p-4">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.avatar_url || ""} alt="avatar" />
                        <AvatarFallback>{user?.full_name ? user.full_name.charAt(0) : "NA"}</AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-sidebar-foreground">
                                {user?.full_name || "Nguyễn Văn A"}
                            </span>
                            <span className="text-xs text-sidebar-foreground/60">
                                {roles?.includes("admin") ? "Quản trị hệ thống" : "Người dùng"}
                            </span>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <Button
                        variant="ghost"
                        className="mt-3 w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                    </Button>
                )}
            </div>
        </div>
    );

    const handleLogout = async () => {
        await dispatch(logoutThunk());
        navigate("/login", { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar desktop - sticky, transition width mượt */}
            <aside
                className={cn(
                    "hidden lg:block sticky top-0 h-screen transition-all duration-300 ease-in-out will-change-width",
                    collapsed ? "w-16" : "w-64",
                )}
            >
                {renderSidebar()}
            </aside>

            {/* Nội dung chính - flex-1 tự động co giãn theo sidebar */}
            <div className="flex-1 min-w-0">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
                    <div className="flex items-center gap-2">
                        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden">
                                    <MenuIcon className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-64">
                                {/* Tiêu đề ẩn cho trình đọc màn hình */}
                                <SheetTitle className="sr-only">Menu</SheetTitle>
                                {renderSidebar()}
                            </SheetContent>
                        </Sheet>
                        <h1 className="text-xl font-semibold">
                            {mainMenuItems.find((item) => location.pathname === item.path)?.label || "Dashboard"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {roles?.includes("admin") && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Store className="h-4 w-4" />
                                        <span className="hidden sm:inline">
                                            {currentRestaurant?.name ?? "Chọn chi nhánh"}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                {branches && branches?.length > 0 && (
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Chi nhánh hiện tại</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {branches.map((branch) => (
                                            <DropdownMenuItem
                                                key={branch.id}
                                                onClick={() => {
                                                    setCurrentRestaurant(branch);
                                                }}
                                                className={cn(currentRestaurant?.id === branch.id && "bg-accent")}
                                            >
                                                {branch.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                )}
                            </DropdownMenu>
                        )}

                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-[10px]">
                                3
                            </Badge>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={user?.avatar_url || ""} alt="avatar" />
                                        <AvatarFallback>
                                            {user?.full_name ? user.full_name.charAt(0) : "NA"}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => profilePath && navigate(profilePath)}>
                                    Hồ sơ
                                </DropdownMenuItem>
                                <DropdownMenuItem>Cài đặt</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                                    Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default memo(MainLayout);
