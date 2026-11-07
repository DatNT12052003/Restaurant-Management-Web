import { isAxiosError } from "axios";

/**
 * Lấy thông báo lỗi để hiển thị (toast) từ lỗi API.
 * Ưu tiên lỗi validation đầu tiên (`errors[]`), sau đó `message` của backend (đã được dịch theo Accept-Language).
 */
export const getErrorMessage = (error: unknown, fallback = "Error"): string => {
    if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string; errors?: { message: string }[] } | undefined;
        if (data?.errors?.length) return data.errors.map((e) => e.message).join(", ");
        if (data?.message) return data.message;
        return error.message || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
};
