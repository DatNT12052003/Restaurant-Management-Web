/**
 * Gợi ý "trình duyệt này đang có phiên đăng nhập" (refresh token nằm trong cookie httpOnly nên JS không đọc được).
 * Chỉ gọi /auth/refresh lúc mở app khi gợi ý là "1", để trình duyệt chưa đăng nhập không bắn request lỗi 400.
 * - "1": vừa đăng nhập / refresh thành công
 * - "0" hoặc chưa có: coi như chưa đăng nhập (sau khi cập nhật bản này, người dùng đăng nhập lại một lần)
 */
const KEY = "session_hint";

export const setSessionHint = (active: boolean) => {
    try {
        localStorage.setItem(KEY, active ? "1" : "0");
    } catch {
        // localStorage bị chặn: bỏ qua
    }
};

export const mayHaveSession = (): boolean => {
    try {
        return localStorage.getItem(KEY) === "1";
    } catch {
        // Không đọc được localStorage: vẫn thử khôi phục phiên như trước
        return true;
    }
};
