/** 120000 / "120000.00" -> "120.000 ₫"; null/"" -> "—" */
export const formatMoney = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "—";
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toLocaleString("vi-VN")} ₫` : "—";
};

/** "11.500" -> "11,5" (tối đa 3 chữ số thập phân); null/"" -> "—" */
export const formatQty = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "—";
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("vi-VN", { maximumFractionDigits: 3 }) : "—";
};
