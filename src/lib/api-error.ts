import { isAxiosError } from "axios";
import type { IResponse } from "@/interfaces";

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
    // Payload của rejectWithValue (IResponse) khi gọi thunk(...).unwrap()
    if (typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string") {
        return (error as { message: string }).message;
    }
    return fallback;
};

/** Payload chuẩn cho rejectWithValue: body lỗi của backend, hoặc một IResponse tự tạo khi không có response */
export const toRejectPayload = (error: unknown): IResponse<null> => {
    if (isAxiosError(error) && error.response?.data) return error.response.data as IResponse<null>;
    return { success: false, statusCode: 0, message: getErrorMessage(error), data: null };
};
