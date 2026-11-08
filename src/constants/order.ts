import type { OrderItemStatusEnum, OrderStatusEnum } from "@/enum";

export const ORDER_STATUSES: OrderStatusEnum[] = ["pending", "confirmed", "serving", "completed", "cancelled", "merged"];
export const OPEN_ORDER_STATUSES: OrderStatusEnum[] = ["pending", "confirmed", "serving"];

export const ORDER_STATUS_STYLE: Record<OrderStatusEnum, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100",
    confirmed: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100",
    serving: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/40 dark:text-rose-100",
    completed: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100",
    cancelled: "bg-muted text-muted-foreground border-border",
    merged: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/40 dark:text-violet-100",
};

/** Các cột trên màn hình bếp, theo thứ tự */
export const KITCHEN_COLUMNS: OrderItemStatusEnum[] = ["pending", "confirmed", "cooking", "ready"];

export const ITEM_STATUS_STYLE: Record<OrderItemStatusEnum, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100",
    confirmed: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100",
    cooking: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100",
    ready: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100",
    served: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300",
    cancelled: "bg-muted text-muted-foreground border-border line-through",
};

/**
 * Máy trạng thái của món, phải khớp LINE_TRANSITIONS trong order.service.ts ở backend.
 * Trạng thái hiện tại -> trạng thái mới -> quyền được phép (có một là đủ). Chỉ dùng để ẩn nút.
 */
export const LINE_TRANSITIONS: Record<OrderItemStatusEnum, Partial<Record<OrderItemStatusEnum, string[]>>> = {
    pending: {
        confirmed: ["order_item.prepare"],
        cooking: ["order_item.prepare"],
        cancelled: ["order.update", "order_item.prepare"],
    },
    confirmed: { cooking: ["order_item.prepare"], cancelled: ["order.cancel", "order_item.prepare"] },
    cooking: { ready: ["order_item.prepare"], cancelled: ["order.cancel"] },
    ready: { served: ["order_item.serve"], cancelled: ["order.cancel"] },
    served: {},
    cancelled: {},
};

/** Có được chuyển món từ `from` sang `to` không (theo quyền hiện có) */
export const canMoveLine = (
    can: (p: string | string[]) => boolean,
    from: OrderItemStatusEnum,
    to: OrderItemStatusEnum,
): boolean => {
    const allowed = LINE_TRANSITIONS[from][to];
    return !!allowed && can(allowed);
};

/** Món chờ quá số phút này thì tô đỏ trên màn hình bếp */
export const KITCHEN_WARN_MINUTES = 15;
