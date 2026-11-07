import type { AxiosResponse } from "axios";
import type { IResponse } from "@/interfaces";

/** Lấy `response.data` và ném lỗi nếu backend trả `success: false`. */
export const unwrap = async <T>(promise: Promise<AxiosResponse<IResponse<T>>>): Promise<IResponse<T>> => {
    const response = await promise;
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

/** Chuyển object lồng nhau thành FormData theo dạng `user[full_name]=...`, `roles[]=...` (multer hiểu được). */
export const toFormData = (data: Record<string, unknown>, form = new FormData(), prefix = ""): FormData => {
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) return;
        const name = prefix ? `${prefix}[${key}]` : key;
        if (value instanceof File) {
            form.append(name, value);
        } else if (Array.isArray(value)) {
            value.forEach((item) => form.append(`${name}[]`, String(item)));
        } else if (value !== null && typeof value === "object") {
            toFormData(value as Record<string, unknown>, form, name);
        } else {
            // null -> chuỗi rỗng: backend hiểu là xóa giá trị
            form.append(name, value === null ? "" : String(value));
        }
    });
    return form;
};

export const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };
