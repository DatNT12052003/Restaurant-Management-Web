import type { ILocalState } from "@/interfaces";
import React from "react";
import { useLocation, Navigate } from "react-router-dom";

interface SequentialRouteProps {
    children: React.ReactNode;
    requiredPrevPath: string[];
}

const SequentialRoute: React.FC<SequentialRouteProps> = ({ children, requiredPrevPath }) => {
    const location = useLocation();

    const state = location.state as ILocalState;
    const from = state?.from;

    if (requiredPrevPath.includes(from)) {
        return <>{children}</>;
    }

    return <Navigate to="/login" replace />;
};

export default SequentialRoute;
