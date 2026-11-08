/**
 * Bộ khung biểu đồ dùng chung (recharts). Màu series lấy từ `--chart-1..5` trong `index.css`
 * (bảng danh mục đã kiểm tra mù màu, thứ tự cố định). Chữ luôn dùng màu chữ, không dùng màu series.
 */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Trục và lưới mờ, không có đường trục */
export const AXIS_PROPS = {
    stroke: "var(--border)",
    tick: { fill: "var(--muted-foreground)", fontSize: 12 },
    tickLine: false,
    axisLine: false,
} as const;

export const GRID_PROPS = { stroke: "var(--border)", strokeDasharray: "0", vertical: false } as const;

/** Bo 4px ở đầu cột (phía giá trị), gốc vuông */
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const HBAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];

/** 1250000 -> "1,3 Tr" (vi) / "1.3M" (en) */
export const formatCompact = (value: number, locale?: string) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatPercent = (value: number | null | undefined, digits = 1) =>
    value === null || value === undefined ? "—" : `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: digits })}%`;

/** "2026-11-08" -> "08/11" (ngày), "11/2026" (tháng) */
export const formatPeriod = (period: string, groupBy: "day" | "week" | "month" = "day") => {
    const [y, m, d] = period.split("-");
    return groupBy === "month" ? `${m}/${y}` : `${d}/${m}`;
};
