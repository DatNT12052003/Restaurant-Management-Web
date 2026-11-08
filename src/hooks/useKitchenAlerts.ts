import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

const STORAGE_KEY = "kitchen_alerts";

export interface IRoundSent {
    code: string;
    round_no: number;
    stations: string[];
}

const readEnabled = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
        return false;
    }
};

const saveEnabled = (on: boolean) => {
    try {
        localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch {
        // Trình duyệt chặn lưu trữ: chỉ áp dụng trong phiên này
    }
};

/** Hai tiếng "ting" ngắn bằng Web Audio (không cần file âm thanh) */
const beep = (ctx: AudioContext) => {
    const start = ctx.currentTime;
    [0, 0.22].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = i === 0 ? 880 : 1175;
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start + offset);
        osc.stop(start + offset + 0.22);
    });
};

/**
 * Báo món mới cho bếp / quầy pha chế: phát âm thanh và hiện thông báo trình duyệt khi có đợt gọi món
 * thuộc `station` ("all" = mọi nơi). Bật / tắt được, lưu theo trình duyệt.
 * Âm thanh chỉ phát được sau khi người dùng bấm bật (chính sách autoplay của trình duyệt).
 */
const useKitchenAlerts = (station: string, describe: (data: IRoundSent) => string, onAlert?: (data: IRoundSent) => void) => {
    const [enabled, setEnabled] = useState(readEnabled);
    const audioRef = useRef<AudioContext | null>(null);
    const stationRef = useRef(station);
    const onAlertRef = useRef(onAlert);
    const describeRef = useRef(describe);
    useEffect(() => {
        stationRef.current = station;
        onAlertRef.current = onAlert;
        describeRef.current = describe;
    }, [station, onAlert, describe]);

    const ensureAudio = useCallback(() => {
        if (!audioRef.current && typeof AudioContext !== "undefined") audioRef.current = new AudioContext();
        if (audioRef.current?.state === "suspended") void audioRef.current.resume();
        return audioRef.current;
    }, []);

    const toggle = useCallback(async () => {
        const next = !enabled;
        setEnabled(next);
        saveEnabled(next);
        if (!next) return;
        // Bấm bật là thao tác của người dùng: mở khóa âm thanh và xin quyền thông báo
        const ctx = ensureAudio();
        if (ctx) beep(ctx);
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            try {
                await Notification.requestPermission();
            } catch {
                // Trình duyệt không hỗ trợ xin quyền: chỉ dùng âm thanh
            }
        }
    }, [enabled, ensureAudio]);

    useEffect(() => {
        if (!enabled) return;
        const socket = getSocket();
        const handler = (data: IRoundSent) => {
            const current = stationRef.current;
            if (current !== "all" && !data.stations.includes(current)) return;
            const ctx = audioRef.current;
            if (ctx && ctx.state === "running") beep(ctx);
            onAlertRef.current?.(data);
            if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
                try {
                    new Notification(describeRef.current(data), { tag: `round-${data.code}-${data.round_no}` });
                } catch {
                    // Một số trình duyệt di động không cho tạo Notification trực tiếp
                }
            }
        };
        socket.on("order:round_sent", handler);
        return () => {
            socket.off("order:round_sent", handler);
        };
    }, [enabled]);

    // Mở lại trang khi đã bật từ trước: AudioContext cần một lần chạm để chạy
    useEffect(() => {
        if (!enabled) return;
        const unlock = () => ensureAudio();
        window.addEventListener("pointerdown", unlock, { once: true });
        return () => window.removeEventListener("pointerdown", unlock);
    }, [enabled, ensureAudio]);

    return { enabled, toggle };
};

export default useKitchenAlerts;
