import { useTranslation } from "react-i18next";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyClockTab from "./MyClockTab";
import MyLeavesTab from "./MyLeavesTab";
import MyPayslipsTab from "./MyPayslipsTab";
import MyScheduleTab from "./MyScheduleTab";

/** Việc của tôi (giai đoạn 12): chấm công, lịch làm và đổi ca, nghỉ phép, phiếu lương */
const MyWork = () => {
    const { t } = useTranslation("admin");
    const tabs = [
        { value: "clock", label: t("hr.my.tab_clock"), content: <MyClockTab /> },
        { value: "schedule", label: t("hr.my.tab_schedule"), content: <MyScheduleTab /> },
        { value: "leaves", label: t("hr.my.tab_leaves"), content: <MyLeavesTab /> },
        { value: "payslips", label: t("hr.my.tab_payslips"), content: <MyPayslipsTab /> },
    ];
    return (
        <div>
            <PageHeader title={t("hr.my.title")} description={t("hr.my.description")} />
            <Tabs defaultValue="clock">
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

export default MyWork;
