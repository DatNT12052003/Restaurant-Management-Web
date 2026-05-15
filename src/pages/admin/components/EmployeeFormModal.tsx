// ========== components/EmployeeFormModal.tsx ==========
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmployeeWithRoles } from "../types";

interface EmployeeFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingEmployee: EmployeeWithRoles | null;
    onSubmit: (data: Partial<EmployeeWithRoles>) => void;
    availableRoles: string[];
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
    open,
    onOpenChange,
    editingEmployee,
    onSubmit,
    availableRoles,
}) => {
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        username: "",
        status: "active" as "active" | "inactive",
        roles: [] as string[],
    });

    useEffect(() => {
        if (editingEmployee) {
            setFormData({
                full_name: editingEmployee.employee.full_name,
                email: editingEmployee.employee.email,
                phone_number: editingEmployee.employee.phone_number || "",
                username: editingEmployee.employee.username,
                status: editingEmployee.employee.status,
                roles: editingEmployee.roles,
            });
        } else {
            setFormData({
                full_name: "",
                email: "",
                phone_number: "",
                username: "",
                status: "active",
                roles: [],
            });
        }
    }, [editingEmployee, open]);

    const handleRoleToggle = (role: string) => {
        setFormData((prev) => ({
            ...prev,
            roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.full_name || !formData.email || !formData.username) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }
        const submitData: Partial<EmployeeWithRoles> = {
            employee: {
                ...(editingEmployee?.employee || {
                    id: Date.now(),
                    date_of_birth: null,
                    gender: null,
                    address: null,
                    avatar_url: null,
                    account_id: Date.now(),
                    restaurant_id: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    deleted_at: null,
                }),
                full_name: formData.full_name,
                email: formData.email,
                phone_number: formData.phone_number || null,
                username: formData.username,
                status: formData.status,
            },
            roles: formData.roles,
            permissions: [],
        };
        onSubmit(submitData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{editingEmployee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin chi tiết của nhân viên. Các trường có dấu * là bắt buộc.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="full_name" className="text-right text-sm">
                                Họ tên *
                            </label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="username" className="text-right text-sm">
                                Tên đăng nhập *
                            </label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="email" className="text-right text-sm">
                                Email *
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="phone" className="text-right text-sm">
                                Số điện thoại
                            </label>
                            <Input
                                id="phone"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm">Vai trò</label>
                            <div className="col-span-3 flex flex-wrap gap-2">
                                {availableRoles.map((role) => (
                                    <Badge
                                        key={role}
                                        variant={formData.roles.includes(role) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => handleRoleToggle(role)}
                                    >
                                        {role.replace("_", " ").toUpperCase()}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm">Trạng thái</label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: "active" | "inactive") =>
                                    setFormData({ ...formData, status: val })
                                }
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Đang làm việc</SelectItem>
                                    <SelectItem value="inactive">Nghỉ việc</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit">Lưu lại</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
