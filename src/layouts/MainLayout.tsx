import React from "react";
import { Outlet } from "react-router-dom"; // Import Outlet

const MainLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="p-4 bg-white shadow">
                {/* Đây là nơi bạn để Header/Sidebar */}
                <h1 className="text-xl font-bold">My App Sidebar</h1>
            </nav>

            <main className="p-6">
                {/* CỰC KỲ QUAN TRỌNG: Dashboard sẽ hiển thị tại đây */}
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
