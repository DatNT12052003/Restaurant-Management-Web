import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/hooks";

/** Trang tổng quan. Biểu đồ và số liệu sẽ được bổ sung ở giai đoạn báo cáo (giai đoạn 7). */
const Dashboard = () => {
    const { t } = useTranslation("admin");
    const user = useAppSelector((s) => s.auth.user);

    return (
        <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t("menu.dashboard")}</h2>
            {user && <p className="mt-1 text-muted-foreground">{user.full_name}</p>}
        </div>
    );
};

export default Dashboard;
