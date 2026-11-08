import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportFilters from "./ReportFilters";
import { useReportFilters } from "./useReportFilters";
import { InventorySection, OccupancySection, RevenueSection, TipsSection, TopItemsSection } from "./sections";
import { ProfitSection, VarianceSection } from "./sections-costing";

/** Báo cáo chi tiết (đặc tả mục 9): doanh thu, món bán chạy, lấp đầy bàn, nhập kho */
const Reports = () => {
    const { t } = useTranslation("admin");
    const filters = useReportFilters("30d");
    const props = { query: filters.query, valid: filters.valid };

    return (
        // In / lưu PDF: chỉ in vùng .print-report (tab đang xem), ẩn nút và bộ lọc
        <div className="print-report">
            <PageHeader
                title={t("report.title")}
                description={t("report.description")}
                actions={
                    <Button variant="outline" onClick={() => window.print()} className="no-print">
                        <Printer className="h-4 w-4" />
                        {t("report.export.print")}
                    </Button>
                }
            />
            <p className="print-only mb-3 text-sm">
                {t("report.export.range", { from: filters.query.from, to: filters.query.to })}
                {filters.isChain ? ` · ${t("report.scope_chain")}` : filters.branchName ? ` · ${filters.branchName}` : ""}
            </p>
            <div className="no-print">
                <ReportFilters state={filters} />
            </div>
            <Tabs defaultValue="revenue">
                <TabsList className="no-print mb-4 h-auto flex-wrap">
                    <TabsTrigger value="revenue">{t("report.tab.revenue")}</TabsTrigger>
                    <TabsTrigger value="top">{t("report.tab.top")}</TabsTrigger>
                    <TabsTrigger value="occupancy">{t("report.tab.occupancy")}</TabsTrigger>
                    <TabsTrigger value="inventory">{t("report.tab.inventory")}</TabsTrigger>
                    <TabsTrigger value="tips">{t("report.tab.tips")}</TabsTrigger>
                    <TabsTrigger value="profit">{t("report.tab.profit")}</TabsTrigger>
                    <TabsTrigger value="variance">{t("report.tab.variance")}</TabsTrigger>
                </TabsList>
                <TabsContent value="revenue">
                    <RevenueSection {...props} />
                </TabsContent>
                <TabsContent value="top">
                    <TopItemsSection {...props} />
                </TabsContent>
                <TabsContent value="occupancy">
                    <OccupancySection {...props} />
                </TabsContent>
                <TabsContent value="inventory">
                    <InventorySection {...props} />
                </TabsContent>
                <TabsContent value="tips">
                    <TipsSection {...props} />
                </TabsContent>
                <TabsContent value="profit">
                    <ProfitSection {...props} />
                </TabsContent>
                <TabsContent value="variance">
                    <VarianceSection {...props} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Reports;
