import type { PaymentMethodEnum, PaymentStatusEnum } from "@/enum";

export const PAYMENT_METHODS: PaymentMethodEnum[] = ["cash", "card", "transfer"];
export const PAYMENT_STATUSES: PaymentStatusEnum[] = ["pending", "processing", "paid", "failed", "cancelled", "refunded"];
/** Trạng thái giao dịch đang chờ xác nhận */
export const WAITING_PAYMENT_STATUSES: PaymentStatusEnum[] = ["pending", "processing"];

export const PAYMENT_STATUS_STYLE: Record<PaymentStatusEnum, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100",
    processing: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100",
    paid: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100",
    failed: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/40 dark:text-rose-100",
    cancelled: "bg-muted text-muted-foreground border-border",
    refunded: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300",
};

/** Gợi ý tiền khách đưa: đúng số tiền, rồi làm tròn lên các mệnh giá phổ biến */
export const cashSuggestions = (amount: number): number[] => {
    if (amount <= 0) return [];
    const steps = [10_000, 50_000, 100_000, 500_000];
    const list = [amount, ...steps.map((s) => Math.ceil(amount / s) * s)];
    return [...new Set(list)].sort((a, b) => a - b).slice(0, 5);
};
