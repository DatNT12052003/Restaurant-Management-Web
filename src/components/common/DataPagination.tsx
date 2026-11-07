import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IPagination } from "@/interfaces";

interface DataPaginationProps {
    pagination: IPagination | null;
    onPageChange: (page: number) => void;
}

/** Thanh phân trang gọn: "Trang 2 / 5 · 48 mục" kèm nút trước / sau */
export const DataPagination = ({ pagination, onPageChange }: DataPaginationProps) => {
    const { t } = useTranslation("admin");
    if (!pagination) return null;

    const { currentPage, totalPages, totalItems } = pagination;
    const pages = Math.max(1, totalPages);

    return (
        <div className="flex items-center justify-between gap-2 pt-4 text-sm text-muted-foreground">
            <span>{t("common.total_items", { count: totalItems })}</span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label={t("common.previous")}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-20 text-center">{t("common.page_of", { page: currentPage, pages })}</span>
                <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage >= pages}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label={t("common.next")}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default DataPagination;
