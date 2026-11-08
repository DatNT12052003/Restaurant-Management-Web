import { useTranslation } from "react-i18next";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportFilters from "./ReportFilters";
import { useReportFilters } from "./useReportFilters";
import { InventorySection, OccupancySection, RevenueSection, TopItemsSection } from "./sections";

/** Báo cáo chi tiết (đặc tả mục 9): doanh thu, món bán chạy, lấp đầy bàn, nhập kho */
const Reports = () => {
    const { t } = useTranslation("admin");
    const filters = useReportFilters("30d");
    const props = { query: filters.query, valid: filters.valid };

    return (
        <div>
            <PageHeader title={t("report.title")} description={t("report.description")} />
            <ReportFilters state={filters} />
            <Tabs defaultValue="revenue">
                <TabsList className="mb-4 flex-wrap">
                    <TabsTrigger value="revenue">{t("report.tab.revenue")}</TabsTrigger>
                    <TabsTrigger value="top">{t("report.tab.top")}</TabsTrigger>
                    <TabsTrigger value="occupancy">{t("report.tab.occupancy")}</TabsTrigger>
                    <TabsTrigger value="inventory">{t("report.tab.inventory")}</TabsTrigger>
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
            </Tabs>
        </div>
    );
};

export default Reports;
