import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IReportQuery } from "@/interfaces";
import { downloadExcel, type IExcelSheet } from "@/lib/excel";
import { useAppSelector } from "@/hooks";

/**
 * Nút xuất Excel cho một tab báo cáo: `sheets()` dựng dữ liệu từ báo cáo đang hiển thị.
 * Tên file gồm tên báo cáo và khoảng ngày; đầu mỗi sheet ghi tên báo cáo, khoảng ngày và phạm vi.
 */
const ExportExcelButton = ({
    title,
    fileKey,
    query,
    sheets,
    disabled,
}: {
    title: string;
    /** Phần tên file, ví dụ "doanh-thu" */
    fileKey: string;
    query: IReportQuery;
    // Mỗi sheet có kiểu dòng riêng
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheets: () => IExcelSheet<any>[];
    disabled?: boolean;
}) => {
    const { t } = useTranslation("admin");
    const branches = useAppSelector((s) => s.restaurant.branches);
    const [busy, setBusy] = useState(false);
    const isAdmin = useAppSelector((s) => s.auth.roles.includes("admin"));
    // Người không phải admin luôn xem chi nhánh của mình (danh sách chi nhánh chỉ có một)
    const scope = query.restaurant_id
        ? (branches.find((b) => b.id === query.restaurant_id)?.name ?? `#${query.restaurant_id}`)
        : !isAdmin && branches[0]
          ? branches[0].name
          : t("report.export.scope_chain");

    const run = async () => {
        setBusy(true);
        try {
            await downloadExcel(`${fileKey}_${query.from}_${query.to}`, sheets(), [
                title,
                t("report.export.range", { from: query.from, to: query.to }),
                t("report.export.scope", { name: scope }),
            ]);
        } catch (error) {
            toast.error(t("report.export.failed"));
            console.error(error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button size="sm" variant="outline" onClick={run} disabled={disabled || busy} className="no-print">
            <FileSpreadsheet className="h-4 w-4" />
            {busy ? t("common.processing") : t("report.export.excel")}
        </Button>
    );
};

export default ExportExcelButton;
