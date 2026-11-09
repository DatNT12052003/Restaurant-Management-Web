import { useTranslation } from "react-i18next";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, usePermission } from "@/hooks";
import FeedbackTab from "./FeedbackTab";
import LoyaltyTab from "./LoyaltyTab";

/** Chăm sóc khách hàng (giai đoạn 13): phản hồi / khiếu nại sau bữa ăn và điểm thưởng */
const CustomerCare = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    // Admin: theo chi nhánh đang chọn (không chọn = cả chuỗi)
    const restaurantId = roles.includes("admin") ? currentBranch?.id : undefined;
    const tabs = [
        can("feedback.view") && { value: "feedback", label: t("customer_care.tab_feedback"), content: <FeedbackTab restaurantId={restaurantId} /> },
        can("loyalty.view") && { value: "loyalty", label: t("customer_care.tab_loyalty"), content: <LoyaltyTab /> },
    ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[];

    return (
        <div key={restaurantId ?? "all"}>
            <PageHeader title={t("customer_care.title")} description={t("customer_care.description")} />
            <Tabs defaultValue={tabs[0]?.value}>
                <TabsList className="mb-4">
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

export default CustomerCare;
