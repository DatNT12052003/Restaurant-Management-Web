import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, LogIn, LogOut, Search, User, UtensilsCrossed } from "lucide-react";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { STAFF_ROLES } from "@/constants/roles";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { cn } from "@/lib/utils";
import { logoutThunk } from "@/store/auth/authThunk";

/** Giai đoạn 13: khung trang cho khách (thực đơn, đặt bàn, tài khoản), ưu tiên điện thoại */
const PublicLayout = () => {
    const { t } = useTranslation("public");
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { isAuthenticated, roles, user } = useAppSelector((s) => s.auth);
    const isStaff = roles.some((r) => STAFF_ROLES.includes(r));

    const logout = async () => {
        await dispatch(logoutThunk());
        navigate("/", { replace: true });
    };
    const link = ({ isActive }: { isActive: boolean }) =>
        cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted", isActive && "bg-muted font-medium");

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50/60 to-background dark:from-slate-900 dark:to-background">
            <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
                    <Link to="/" className="mr-auto flex items-center gap-2 font-semibold">
                        <UtensilsCrossed className="size-5 text-orange-600" />
                        <span className="hidden sm:inline">{t("brand")}</span>
                    </Link>
                    <nav className="flex items-center gap-1">
                        <NavLink to="/booking" className={link}>
                            <CalendarCheck className="size-4" />
                            <span className="hidden sm:inline">{t("nav.book")}</span>
                        </NavLink>
                        <NavLink to="/booking/lookup" className={link}>
                            <Search className="size-4" />
                            <span className="hidden sm:inline">{t("nav.lookup")}</span>
                        </NavLink>
                        {isAuthenticated && isStaff && (
                            <Button asChild size="sm" variant="outline">
                                <Link to="/admin">{t("nav.admin")}</Link>
                            </Button>
                        )}
                        {isAuthenticated && !isStaff && (
                            <NavLink to="/account" className={link}>
                                <User className="size-4" />
                                <span className="hidden max-w-32 truncate sm:inline">{user?.full_name ?? t("nav.account")}</span>
                            </NavLink>
                        )}
                        {isAuthenticated ? (
                            <Button size="icon" variant="ghost" aria-label={t("nav.logout")} title={t("nav.logout")} onClick={logout}>
                                <LogOut className="size-4" />
                            </Button>
                        ) : (
                            <Button asChild size="sm" variant="outline">
                                <Link to="/login">
                                    <LogIn className="size-4" />
                                    {t("nav.login")}
                                </Link>
                            </Button>
                        )}
                        <LanguageSwitcher />
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
};

export default PublicLayout;
