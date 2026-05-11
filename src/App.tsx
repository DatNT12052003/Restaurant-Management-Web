import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./i18n/config";
import { useAppDispatch, useAppSelector } from "./hooks";
import { useEffect } from "react";
import { refreshTokenThunk } from "./store/auth/authThunk";
import { setInitialized } from "./store/auth/authSlice";

const App = () => {
    const dispatch = useAppDispatch();
    const isInitialized = useAppSelector((state) => state.auth.isInitialized);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await dispatch(refreshTokenThunk()).unwrap();
            } catch (error) {
                console.log("Không có phiên đăng nhập cũ");
            } finally {
                dispatch(setInitialized(true));
            }
        };
        checkAuth();
    }, [dispatch]);

    if (!isInitialized) {
        return <div>Loading...</div>;
    }
    return <RouterProvider router={router} />;
};

export default App;
