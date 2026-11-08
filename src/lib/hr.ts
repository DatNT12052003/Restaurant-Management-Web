import { addDays, toDateInput } from "./datetime";

/** Giai đoạn 12: tiện ích ngày giờ cho ca làm / chấm công (giờ địa phương của trình duyệt, ở nhà hàng là giờ Việt Nam) */

export const todayStr = (): string => toDateInput(new Date());

/** "YYYY-MM-DD" -> Date 00:00 giờ địa phương */
export const parseDay = (day: string): Date => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d);
};

export const shiftDay = (day: string, days: number): string => toDateInput(addDays(parseDay(day), days));

/** Thứ Hai của tuần chứa ngày */
export const mondayOf = (day: string): string => {
    const d = parseDay(day);
    return toDateInput(addDays(d, -((d.getDay() + 6) % 7)));
};

export const weekDays = (monday: string): string[] => Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));

/** "YYYY-MM" của hôm nay, hoặc dịch `offset` tháng */
export const monthStr = (offset = 0): string => {
    const d = new Date();
    const m = new Date(d.getFullYear(), d.getMonth() + offset, 1);
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
};

export const monthBounds = (month: string): { from: string; to: string } => {
    const [y, m] = month.split("-").map(Number);
    return { from: `${month}-01`, to: toDateInput(new Date(y, m, 0)) };
};

/** "Th 2, 10/11" */
export const formatDayShort = (day: string, locale?: string): string =>
    parseDay(day).toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "2-digit" });

/** "10/11/2026" */
export const formatDay = (day: string, locale?: string): string =>
    parseDay(day).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

/** "11/2026" */
export const formatMonth = (month: string, locale?: string): string =>
    parseDay(`${month.slice(0, 7)}-01`).toLocaleDateString(locale, { month: "2-digit", year: "numeric" });

/** 450 -> "7:30" (giờ:phút) */
export const formatMinutes = (minutes: number): string => {
    const sign = minutes < 0 ? "-" : "";
    const m = Math.abs(Math.round(minutes));
    return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

/** ISO -> "HH:MM" giờ địa phương (dùng cho <input type="time">) */
export const isoToTime = (iso: string): string => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** ISO -> "YYYY-MM-DDTHH:MM" (dùng cho <input type="datetime-local">) */
export const isoToLocalInput = (iso: string): string => `${toDateInput(new Date(iso))}T${isoToTime(iso)}`;

/** "YYYY-MM-DDTHH:MM" giờ địa phương -> ISO; rỗng -> null */
export const localInputToIso = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Ca qua đêm: ngày kết thúc khác ngày bắt đầu */
export const isOvernight = (startIso: string, endIso: string): boolean => toDateInput(new Date(startIso)) !== toDateInput(new Date(endIso));

/** Đường dẫn trong mã QR chấm công: quét bằng camera điện thoại là mở trang chấm công */
export const clockUrl = (token: string): string => `${window.location.origin}/admin/clock?t=${encodeURIComponent(token)}`;

/** Đọc mã từ nội dung QR: đường dẫn chấm công hoặc chính mã */
export const tokenFromQr = (text: string): string => {
    try {
        const url = new URL(text);
        return url.searchParams.get("t") ?? text;
    } catch {
        return text.trim();
    }
};

export const STATUS_TONE = {
    pending: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    info: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    ok: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    bad: "border-red-300 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    muted: "border-border bg-muted text-muted-foreground",
} as const;

export const SWAP_TONE: Record<string, string> = {
    pending_target: STATUS_TONE.pending,
    pending_approval: STATUS_TONE.info,
    approved: STATUS_TONE.ok,
    rejected: STATUS_TONE.bad,
    declined: STATUS_TONE.bad,
    cancelled: STATUS_TONE.muted,
};

export const LEAVE_TONE: Record<string, string> = {
    pending: STATUS_TONE.pending,
    approved: STATUS_TONE.ok,
    rejected: STATUS_TONE.bad,
    cancelled: STATUS_TONE.muted,
};

export const OVERTIME_TONE: Record<string, string> = {
    none: STATUS_TONE.muted,
    pending: STATUS_TONE.pending,
    approved: STATUS_TONE.ok,
    rejected: STATUS_TONE.bad,
};
