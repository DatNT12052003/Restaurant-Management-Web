import { useCallback, useEffect, useState } from "react";

/**
 * Gọi `fetcher` khi nó thay đổi (bọc bằng `useCallback` với các tham số lọc / phân trang) hoặc khi gọi `reload()`.
 * Kết quả của lần gọi cũ bị bỏ qua nếu đã có lần gọi mới hơn.
 * Lần tải đầu `loading = true`; khi tải lại vẫn giữ dữ liệu cũ cho tới khi có dữ liệu mới.
 */
const useAsyncData = <T>(fetcher: () => Promise<T>) => {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let active = true;
        fetcher().then(
            (result) => {
                if (!active) return;
                setData(result);
                setError(null);
                setLoading(false);
            },
            (err) => {
                if (!active) return;
                setError(err);
                setLoading(false);
            },
        );
        return () => {
            active = false;
        };
    }, [fetcher, version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);

    return { data, loading, error, reload };
};

export default useAsyncData;
