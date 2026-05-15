// ========== components/StatsCards.tsx ==========
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX } from "lucide-react";

interface StatsCardsProps {
    total: number;
    active: number;
    inactive: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ total, active, inactive }) => {
    const stats = [
        {
            label: "Tổng nhân viên",
            value: total,
            icon: Users,
            iconColor: "text-blue-500",
            bgIcon: "bg-blue-50",
        },
        {
            label: "Đang làm việc",
            value: active,
            icon: UserCheck,
            iconColor: "text-green-500",
            bgIcon: "bg-green-50",
        },
        {
            label: "Nghỉ việc",
            value: inactive,
            icon: UserX,
            iconColor: "text-red-500",
            bgIcon: "bg-red-50",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat, idx) => (
                <Card key={idx} className="border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <p className="text-3xl font-bold tracking-tight mt-2">{stat.value.toLocaleString()}</p>
                            </div>
                            <div className={`rounded-full p-3 ${stat.bgIcon}`}>
                                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
