import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector, usePermission } from "@/hooks";
import ReportFilters from "./reports/ReportFilters";
import { useReportFilters } from "./reports/useReportFilters";
import { OverviewTiles, RevenueSection, TopItemsSection } from "./reports/sections";

/** Lối tắt cho nhân viên không xem báo cáo: các trang họ có quyền */
const SHORTCUTS: { path: string; key: string; permission: string }[] = [
    { path: "/admin/orders", key: "menu.orders", permission: "order.view" },
    { path: "/admin/kitchen", key: "menu.kitchen", permission: "order_item.prepare" },
    { path: "/admin/cashier", key: "menu.cashier", permission: "payment.view" },
    { path: "/admin/reservations", key: "menu.reservations", permission: "reservation.view" },
    { path: "/admin/inventory", key: "menu.inventory", permission: "inventory.view" },
    { path: "/admin/menu", key: "menu.menu", permission: "dish.view" },
];

/** Trang tổng quan: số liệu chính so với kỳ trước, tình hình hiện tại, doanh thu và món bán chạy */
const Dashboard = () => {
    const { t } = useTranslation("admin");
    const user = useAppSelector((s) => s.auth.user);
    const can = usePermission();
    const filters = useReportFilters("7d");

    if (!can("report.view")) {
        const links = SHORTCUTS.filter((s) => can(s.permission));
        return (
            <div>
                <PageHeader title={t("report.welcome", { name: user?.full_name ?? "" })} description={t("report.welcome_hint")} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {links.map((s) => (
                        <Card key={s.path} className="py-4">
                            <CardContent className="flex items-center justify-between px-4">
                                <span className="font-medium">{t(s.key)}</span>
                                <Button asChild size="sm" variant="ghost">
                                    <Link to={s.path} aria-label={t(s.key)}>
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("menu.dashboard")}
                description={t("report.dashboard_description")}
                actions={
                    <Button asChild variant="outline">
                        <Link to="/admin/reports">
                            {t("report.view_reports")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                }
            />
            <ReportFilters state={filters} />
            <div className="grid gap-4">
                <OverviewTiles query={filters.query} valid={filters.valid} />
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <RevenueSection query={filters.query} valid={filters.valid} compact />
                    </div>
                    <TopItemsSection query={filters.query} valid={filters.valid} compact />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
