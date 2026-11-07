const pad = (n: number) => String(n).padStart(2, "0");

/** Date -> "YYYY-MM-DD" theo giờ địa phương (dùng cho <input type="date">) */
export const toDateInput = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date -> "HH:mm" theo giờ địa phương (dùng cho <input type="time">) */
export const toTimeInput = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "YYYY-MM-DD" + "HH:mm" (giờ địa phương) -> Date; không hợp lệ -> null */
export const combineDateTime = (date: string, time: string): Date | null => {
    if (!date || !time) return null;
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    const result = new Date(y, m - 1, d, h, min, 0, 0);
    return Number.isNaN(result.getTime()) ? null : result;
};

/** 00:00 của ngày "YYYY-MM-DD" (giờ địa phương) */
export const startOfDay = (date: string): Date => combineDateTime(date, "00:00") ?? new Date();

export const addDays = (d: Date, days: number): Date => {
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
};

export const addMinutes = (d: Date, minutes: number): Date => new Date(d.getTime() + minutes * 60 * 1000);

/** ISO -> "18:30" */
export const formatTime = (iso: string, locale?: string): string =>
    new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

/** ISO -> "08/11/2026 18:30" */
export const formatDateTime = (iso: string, locale?: string): string =>
    new Date(iso).toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
