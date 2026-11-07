import { io, type Socket } from "socket.io-client";
import { refreshSession } from "@/apis/axios";

/**
 * Kết nối Socket.IO dùng chung cho cả ứng dụng (giai đoạn 4).
 * - Token lấy từ store mỗi lần (re)connect, nên token mới sau khi refresh được dùng ngay.
 * - Nhân viên tự vào room nhà hàng của mình ở backend; admin gọi `subscribeRestaurant(id)` theo chi nhánh đang chọn.
 * - Sự kiện chỉ mang định danh; trang nhận sự kiện tự tải lại dữ liệu qua REST (`useRealtime`).
 */

// store được import động để tránh vòng lặp import (store -> thunk -> api -> axios -> store)
const getStore = async () => (await import("@/store/store")).store;

let socket: Socket | null = null;
/** undefined = không phải admin (không cần đăng ký) */
let adminRestaurant: number | null | undefined;
let authRetries = 0;
const MAX_AUTH_RETRIES = 2;

/** Socket dùng chung (tạo nếu chưa có, chưa kết nối) */
export const getSocket = (): Socket => {
    if (socket) return socket;
    socket = io(import.meta.env.VITE_SOCKET_URL, {
        autoConnect: false,
        transports: ["websocket"],
        auth: (cb) => {
            getStore().then((store) => cb({ token: store.getState().auth.access_token }));
        },
    });
    socket.on("connect", () => {
        authRetries = 0;
        if (adminRestaurant !== undefined) socket?.emit("restaurant:subscribe", adminRestaurant);
    });
    socket.on("connect_error", async (error) => {
        // Middleware từ chối thì socket.io không tự kết nối lại -> refresh token rồi thử lại vài lần
        if (error.message !== "common:invalid_or_expired_token" || authRetries >= MAX_AUTH_RETRIES) return;
        authRetries++;
        try {
            await refreshSession();
            socket?.connect();
        } catch {
            // Phiên đã hết: axios interceptor / AuthGuard sẽ đưa về trang đăng nhập
        }
    });
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (!s.connected) s.connect();
};

export const disconnectSocket = () => {
    socket?.disconnect();
    socket = null;
    adminRestaurant = undefined;
};

/** Chỉ admin: nhận sự kiện của chi nhánh này (null = không nhận) */
export const subscribeRestaurant = (restaurantId: number | null) => {
    adminRestaurant = restaurantId;
    if (socket?.connected) socket.emit("restaurant:subscribe", restaurantId);
};
