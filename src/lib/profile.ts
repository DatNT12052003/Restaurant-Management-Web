import type { IProfileFields } from "@/interfaces";

/** Bỏ chuỗi rỗng trong thông tin cá nhân trước khi gửi (khi đang sửa: gửi null để xóa giá trị). */
export const cleanProfile = (value: IProfileFields, editing: boolean): IProfileFields => {
    const out: Record<string, unknown> = {};
    (Object.keys(value) as (keyof IProfileFields)[]).forEach((key) => {
        const v = value[key];
        if (v === "" || v === undefined) {
            if (editing) out[key] = null;
        } else {
            out[key] = v;
        }
    });
    if (out.full_name === null) delete out.full_name;
    return out as IProfileFields;
};

const toLocalDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Dữ liệu user từ API -> giá trị form (input type=date cần dạng YYYY-MM-DD) */
export const toProfileFields = (u: Partial<IProfileFields>): IProfileFields => ({
    full_name: u.full_name || "",
    email: u.email || "",
    phone_number: u.phone_number || "",
    date_of_birth: u.date_of_birth ? toLocalDate(u.date_of_birth) : "",
    gender: u.gender || null,
    address: u.address || "",
});
