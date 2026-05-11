import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./i18n/config";
import { useAppDispatch, useAppSelector } from "./hooks";
import { useEffect, useRef } from "react";
import { getMeThunk, refreshTokenThunk } from "./store/auth/authThunk";
import { setInitialized } from "./store/auth/authSlice";

const App = () => {
    const dispatch = useAppDispatch();
    const isInitialized = useAppSelector((state) => state.auth.isInitialized);

    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const initAuth = async () => {
            try {
                await dispatch(refreshTokenThunk()).unwrap();
                await dispatch(getMeThunk()).unwrap();
            } catch (error) {
                console.log("Không có phiên đăng nhập cũ");
            } finally {
                dispatch(setInitialized(true));
            }
        };

        initAuth();
    }, [dispatch]);

    if (!isInitialized) {
        return <div>Loading...</div>;
    }
    return <RouterProvider router={router} />;
};

export default App;
