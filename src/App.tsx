import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./i18n/config";
import { useAppDispatch, useAppSelector } from "./hooks";
import { useEffect, useRef } from "react";
import { getMeThunk, refreshTokenThunk } from "./store/auth/authThunk";
import { setInitialized } from "./store/auth/authSlice";
import { mayHaveSession } from "./lib/session-hint";
import { Toaster } from "sonner";

const App = () => {
    const dispatch = useAppDispatch();
    const isInitialized = useAppSelector((state) => state.auth.isInitialized);

    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const initAuth = async () => {
            // Đã biết chắc không có phiên (vừa đăng xuất / refresh thất bại): khỏi gọi /auth/refresh
            if (!mayHaveSession()) {
                dispatch(setInitialized(true));
                return;
            }
            try {
                await dispatch(refreshTokenThunk()).unwrap();
                await dispatch(getMeThunk()).unwrap();
            } catch {
                // Chưa đăng nhập hoặc phiên đã hết hạn: hiển thị trang đăng nhập
            } finally {
                dispatch(setInitialized(true));
            }
        };

        initAuth();
    }, [dispatch]);

    if (!isInitialized) {
        return;
    }
    return (
        <>
            <Toaster position="bottom-right" richColors />
            <RouterProvider router={router} />
        </>
    );
};

export default App;
