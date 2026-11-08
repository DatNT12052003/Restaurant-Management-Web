import { useMemo, useState } from "react";
import { useAppSelector } from "@/hooks";
import type { IReportQuery, ReportGroupBy } from "@/interfaces";
import { addDays, toDateInput } from "@/lib/datetime";

export type RangePreset = "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export const PRESETS: RangePreset[] = ["today", "7d", "30d", "this_month", "last_month", "custom"];

const presetRange = (preset: RangePreset): { from: string; to: string } => {
    const now = new Date();
    switch (preset) {
        case "today":
            return { from: toDateInput(now), to: toDateInput(now) };
        case "7d":
            return { from: toDateInput(addDays(now, -6)), to: toDateInput(now) };
        case "this_month":
            return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) };
        case "last_month":
            return {
                from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
            };
        default:
            return { from: toDateInput(addDays(now, -29)), to: toDateInput(now) };
    }
};

/** Số ngày trong khoảng (gồm cả hai đầu) */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;

/** Nhóm mặc định theo độ dài khoảng: <= 45 ngày theo ngày, <= 180 theo tuần, còn lại theo tháng */
const autoGroup = (from: string, to: string): ReportGroupBy => {
    const days = daysBetween(from, to);
    return days <= 45 ? "day" : days <= 180 ? "week" : "month";
};

/**
 * Trạng thái bộ lọc báo cáo. Phạm vi nhà hàng: admin theo chi nhánh đang chọn trên header
 * (không chọn = cả chuỗi); vai trò khác do backend tự giới hạn.
 */
export const useReportFilters = (defaultPreset: RangePreset = "30d") => {
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    const [preset, setPreset] = useState<RangePreset>(defaultPreset);
    const [custom, setCustom] = useState(() => presetRange(defaultPreset));
    const [groupBy, setGroupBy] = useState<ReportGroupBy | "auto">("auto");

    const range = preset === "custom" ? custom : presetRange(preset);
    const valid = !!range.from && !!range.to && range.from <= range.to && daysBetween(range.from, range.to) <= 366;
    const restaurantId = isAdmin ? currentBranch?.id : undefined;

    const query: IReportQuery = useMemo(
        () => ({
            from: range.from,
            to: range.to,
            group_by: groupBy === "auto" ? autoGroup(range.from, range.to) : groupBy,
            ...(restaurantId ? { restaurant_id: restaurantId } : {}),
        }),
        [range.from, range.to, groupBy, restaurantId],
    );

    return {
        query,
        valid,
        preset,
        setPreset: (p: RangePreset) => {
            if (p === "custom") setCustom(range);
            setPreset(p);
        },
        custom,
        setCustom,
        groupBy,
        setGroupBy,
        /** Admin đang xem cả chuỗi */
        isChain: isAdmin && !currentBranch,
        branchName: isAdmin ? currentBranch?.name : undefined,
    };
};

export type ReportFiltersState = ReturnType<typeof useReportFilters>;
