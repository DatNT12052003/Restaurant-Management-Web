import type { IPublicReservation, ReservationStatus } from "@/interfaces";

/** Giai đoạn 13: tiện ích cho trang khách */

export const BOOKING_TONE: Record<ReservationStatus, string> = {
    pending: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    confirmed: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    arrived: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    completed: "border-border bg-muted text-muted-foreground",
    cancelled: "border-red-300 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    no_show: "border-red-300 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
};

export const canCancelBooking = (b: IPublicReservation, now: number) =>
    ["pending", "confirmed"].includes(b.status) && new Date(b.start_time).getTime() > now;

/** Mã ngẫu nhiên của trình duyệt (để xem lại các yêu cầu gọi món của mình ở bàn) */
export const browserToken = (): string => {
    const KEY = "qr_client_token";
    try {
        const saved = localStorage.getItem(KEY);
        if (saved && saved.length >= 8) return saved;
        const token = crypto.randomUUID().replace(/-/g, "");
        localStorage.setItem(KEY, token);
        return token;
    } catch {
        return crypto.randomUUID().replace(/-/g, "");
    }
};

/** Đường dẫn trong mã QR của bàn */
export const tableUrl = (token: string): string => `${window.location.origin}/t/${encodeURIComponent(token)}`;
