import { useTranslation } from "react-i18next";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, usePermission } from "@/hooks";
import ApprovalsTab from "./ApprovalsTab";
import AttendanceTab from "./AttendanceTab";
import PayrollTab from "./PayrollTab";
import PerformanceTab from "./PerformanceTab";
import ScheduleTab from "./ScheduleTab";
import SettingsTab from "./SettingsTab";
import StaffPayTab from "./StaffPayTab";

/** Ca làm & lương (giai đoạn 12): lịch làm việc, duyệt đổi ca / nghỉ phép, chấm công, hiệu suất, bảng lương, mức lương, cấu hình */
const Workforce = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;

    if (isAdmin && !restaurantId) {
        return (
            <div>
                <PageHeader title={t("hr.title")} description={t("hr.description")} />
                <p className="text-muted-foreground">{t("hr.select_branch")}</p>
            </div>
        );
    }

    // `key`: đổi chi nhánh thì các tab tải lại từ đầu
    const tabs = [
        can("shift.view") && { value: "schedule", label: t("hr.tab.schedule"), content: <ScheduleTab restaurantId={restaurantId} /> },
        can(["shift.manage", "leave.approve"]) && { value: "approvals", label: t("hr.tab.approvals"), content: <ApprovalsTab restaurantId={restaurantId} /> },
        can("attendance.view") && { value: "attendance", label: t("hr.tab.attendance"), content: <AttendanceTab restaurantId={restaurantId} /> },
        can(["staff_review.manage", "payroll.view"]) && { value: "performance", label: t("hr.tab.performance"), content: <PerformanceTab restaurantId={restaurantId} /> },
        can("payroll.view") && { value: "payroll", label: t("hr.tab.payroll"), content: <PayrollTab restaurantId={restaurantId} /> },
        can("payroll.view") && { value: "pay", label: t("hr.tab.pay"), content: <StaffPayTab restaurantId={restaurantId} /> },
        can(["payroll.manage", "attendance.manage"]) && { value: "settings", label: t("hr.tab.settings"), content: <SettingsTab restaurantId={restaurantId} /> },
    ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[];

    return (
        <div key={restaurantId ?? "own"}>
            <PageHeader title={t("hr.title")} description={t("hr.description")} />
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

export default Workforce;
