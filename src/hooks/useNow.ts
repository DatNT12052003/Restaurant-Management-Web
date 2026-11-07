import { useEffect, useState } from "react";

/** Thời điểm hiện tại (ms), cập nhật mỗi `intervalMs`. Dùng thay cho `Date.now()` trong lúc render. */
const useNow = (intervalMs = 60_000): number => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
};

export default useNow;
