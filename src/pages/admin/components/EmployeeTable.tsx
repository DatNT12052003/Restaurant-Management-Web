// ========== components/EmployeeTable.tsx ==========
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2, Trash2, MoreHorizontal } from "lucide-react";
import type { EmployeeWithRoles } from "../types";

const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
        admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        supervisor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        head_chef: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        cashier: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        waitstaff: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
        receptionist: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
        clean_staff: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    };
    return roleColors[role] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
};

interface EmployeeTableProps {
    employees: EmployeeWithRoles[];
    onEdit: (employee: EmployeeWithRoles) => void;
    onDelete: (id: number) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit, onDelete }) => {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[280px]">Nhân viên</TableHead>
                        <TableHead>Liên hệ</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Không có dữ liệu nhân viên.
                            </TableCell>
                        </TableRow>
                    ) : (
                        employees.map(({ employee, roles }) => (
                            <TableRow key={employee.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={employee.avatar_url || undefined} />
                                            <AvatarFallback className="uppercase bg-primary/10 text-primary">
                                                {employee.full_name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{employee.full_name}</p>
                                            <p className="text-sm text-muted-foreground">@{employee.username}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <p className="text-sm">{employee.email}</p>
                                        {employee.phone_number && (
                                            <p className="text-xs text-muted-foreground">{employee.phone_number}</p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {roles.map((role) => (
                                            <Badge key={role} variant="secondary" className={getRoleBadgeColor(role)}>
                                                {role.replace("_", " ").toUpperCase()}
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={employee.status === "active" ? "default" : "secondary"}
                                        className={
                                            employee.status === "active"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                        }
                                    >
                                        {employee.status === "active" ? "Đang làm việc" : "Nghỉ việc"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(employee.created_at)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => onEdit({ employee, roles, permissions: [] })}
                                            >
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                Chỉnh sửa
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onDelete(employee.id)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Xóa nhân viên
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
