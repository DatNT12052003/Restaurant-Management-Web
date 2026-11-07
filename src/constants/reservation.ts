import type { ReservationStatusEnum } from "@/enum";

export const RESERVATION_STATUSES: ReservationStatusEnum[] = [
    "pending",
    "confirmed",
    "arrived",
    "completed",
    "cancelled",
    "no_show",
];

/** Trạng thái còn giữ bàn */
export const ACTIVE_RESERVATION_STATUSES: ReservationStatusEnum[] = ["pending", "confirmed", "arrived"];

/** Chỉ sửa được khi khách chưa đến */
export const EDITABLE_RESERVATION_STATUSES: ReservationStatusEnum[] = ["pending", "confirmed"];

/**
 * Máy trạng thái — phải khớp `TRANSITIONS` trong `reservation.service.ts` ở backend.
 * Chỉ dùng để ẩn nút; backend mới là nơi kiểm tra.
 */
export const RESERVATION_TRANSITIONS: Record<ReservationStatusEnum, ReservationStatusEnum[]> = {
    pending: ["confirmed", "arrived", "cancelled", "no_show"],
    confirmed: ["arrived", "cancelled", "no_show"],
    arrived: ["completed"],
    completed: [],
    cancelled: [],
    no_show: [],
};

/** Màu của thẻ / thanh trên timeline theo trạng thái */
export const RESERVATION_STATUS_STYLE: Record<ReservationStatusEnum, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100",
    confirmed: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100",
    arrived: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/40 dark:text-rose-100",
    completed: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100",
    cancelled: "bg-muted text-muted-foreground border-border line-through",
    no_show: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 line-through",
};

/** Thời lượng mặc định khi tạo đặt bàn (phút) */
export const DEFAULT_RESERVATION_MINUTES = 120;
/** Phải khớp MAX_RESERVATION_HOURS ở backend */
export const MAX_RESERVATION_HOURS = 12;
