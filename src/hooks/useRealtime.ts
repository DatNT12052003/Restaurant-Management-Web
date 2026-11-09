import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/** Tên các sự kiện realtime từ backend (xem `interfaces/socket.interface.ts` ở backend) */
export type RealtimeEvent =
    | "order:created"
    | "order:updated"
    | "order:round_sent"
    | "order_item:status_changed"
    | "table:status_changed"
    | "reservation:changed"
    | "payment:changed"
    | "inventory:changed"
    // Giai đoạn 13
    | "order_request:created"
    | "order_request:changed"
    | "feedback:created";

/**
 * Gọi `handler` khi nhận một trong `events` (gộp các sự kiện dồn dập trong `delayMs`), và khi socket kết nối lại
 * (có thể đã lỡ sự kiện). Thường truyền `reload` của `useAsyncData`.
 */
const useRealtime = (events: RealtimeEvent[], handler: () => void, delayMs = 300) => {
    const handlerRef = useRef(handler);
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    const key = events.join(",");
    useEffect(() => {
        const socket = getSocket();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const fire = () => {
            clearTimeout(timer);
            timer = setTimeout(() => handlerRef.current(), delayMs);
        };
        const names = key.split(",");
        names.forEach((e) => socket.on(e, fire));
        socket.io.on("reconnect", fire);
        return () => {
            clearTimeout(timer);
            names.forEach((e) => socket.off(e, fire));
            socket.io.off("reconnect", fire);
        };
    }, [key, delayMs]);
};

export default useRealtime;
