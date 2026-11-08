import { useTranslation } from "react-i18next";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, usePermission } from "@/hooks";
import OrdersTab from "./OrdersTab";
import PayablesTab from "./PayablesTab";
import SuppliersTab from "./SuppliersTab";

/** Mua hàng (giai đoạn 11): đơn đặt hàng nguyên liệu, nhà cung cấp và bảng giá, công nợ nhà cung cấp */
const Purchasing = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    // Admin: theo chi nhánh đang chọn (không chọn = xem cả chuỗi, lập đơn cần chọn chi nhánh)
    const restaurantId = isAdmin ? currentBranch?.id : undefined;

    const tabs = [
        can("purchase.view") && {
            value: "orders",
            label: t("purchasing.tab_orders"),
            content: <OrdersTab restaurantId={restaurantId} canCreateHere={!isAdmin || !!currentBranch} />,
        },
        can("supplier.view") && { value: "suppliers", label: t("purchasing.tab_suppliers"), content: <SuppliersTab /> },
        can("payable.view") && { value: "payables", label: t("purchasing.tab_payables"), content: <PayablesTab restaurantId={restaurantId} /> },
    ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[];

    return (
        <div>
            <PageHeader title={t("purchasing.title")} description={t("purchasing.description")} />
            <Tabs defaultValue={tabs[0]?.value}>
                <TabsList className="mb-4 h-auto flex-wrap">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default Purchasing;
