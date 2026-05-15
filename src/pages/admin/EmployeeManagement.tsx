import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
    Search,
    Edit,
    Trash2,
    MoreHorizontal,
    UserPlus,
    Filter,
    X,
    CheckCircle,
    XCircle,
    Users,
    Mail,
    Phone,
    Calendar,
    User,
    Download,
    TrendingUp,
    UserCheck,
    UserX,
    Building,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { IGetQuery, IEmployee } from "@/interfaces";
import { useAppDispatch } from "@/hooks";
import { getEmployeesByRestaurantIdThunk } from "@/store/user/userThunk";

// Role mapping colors (giữ nguyên)
const roleDisplayMap: Record<string, { label: string; color: string }> = {
    admin: { label: "Quản trị hệ thống", color: "bg-purple-100 text-purple-800" },
    manager: { label: "Quản lý nhà hàng", color: "bg-blue-100 text-blue-800" },
    head_chef: { label: "Bếp trưởng", color: "bg-orange-100 text-orange-800" },
    sous_chef: { label: "Bếp phó", color: "bg-amber-100 text-amber-800" },
    commis_chef: { label: "Phụ bếp", color: "bg-yellow-100 text-yellow-800" },
    receptionist: { label: "Lễ tân", color: "bg-teal-100 text-teal-800" },
    waitstaff: { label: "Phục vụ", color: "bg-green-100 text-green-800" },
    cashier: { label: "Thu ngân", color: "bg-indigo-100 text-indigo-800" },
    clean_staff: { label: "Tạp vụ", color: "bg-slate-100 text-slate-800" },
    guard: { label: "Bảo vệ", color: "bg-stone-100 text-stone-800" },
    supervisor: { label: "Giám sát", color: "bg-cyan-100 text-cyan-800" },
};

// Schema validation (giữ nguyên)
const employeeFormSchema = z.object({
    full_name: z.string().min(1, "Họ tên không được để trống"),
    email: z.string().email("Email không hợp lệ"),
    phone_number: z
        .string()
        .regex(/^[0-9]{10,11}$/, "Số điện thoại 10-11 số")
        .optional()
        .nullable(),
    username: z.string().min(3, "Tên đăng nhập tối thiểu 3 ký tự"),
    role: z.string().min(1, "Chọn vai trò"),
    status: z.enum(["active", "inactive"]),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").optional().nullable(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EmployeeManagement() {
    const dispatch = useAppDispatch();
    const restaurantId = 1;

    // States (giữ nguyên)
    const [employees, setEmployees] = useState<IEmployee[]>([]);
    const [pagination, setPagination] = useState({
        limit: 10,
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
    });
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<IEmployee | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<IEmployee | null>(null);

    // Form hook
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeFormSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            username: "",
            role: "",
            status: "active",
            password: "",
        },
    });

    // Build query, fetchEmployees, useEffect (giữ nguyên logic)
    const buildQuery = useCallback((): IGetQuery => {
        const query: IGetQuery = {
            currentPage: pagination.currentPage,
            limit: pagination.limit,
        };
        if (searchText) {
            query.search = {
                text: searchText,
                fields: ["full_name", "email", "username", "phone_number"],
            };
        }
        if (roleFilter && roleFilter !== "all") {
            query.filters = [{ field: "roles", operator: "=", value: roleFilter }];
        }
        query.orderBy = [{ field: "created_at", direction: "desc" }];
        return query;
    }, [pagination.currentPage, pagination.limit, searchText, roleFilter]);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const query = buildQuery();
            const response = await dispatch(
                getEmployeesByRestaurantIdThunk({ query, restaurant_id: restaurantId }),
            ).unwrap();
            if (response.data && response.success) {
                setEmployees(response.data.employees);
                setPagination(response.data.pagination);
            } else {
                toast.error(response.message || "Không thể tải danh sách");
            }
        } catch (error: any) {
            toast.error(error.message || "Lỗi kết nối server");
        } finally {
            setLoading(false);
        }
    }, [buildQuery, restaurantId, dispatch]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleSearch = () => setPagination((prev) => ({ ...prev, currentPage: 1 }));

    const resetFilters = () => {
        setSearchText("");
        setRoleFilter("all");
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const openAddDialog = () => {
        setEditingEmployee(null);
        reset({
            full_name: "",
            email: "",
            phone_number: "",
            username: "",
            role: "",
            status: "active",
            password: "",
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (emp: IEmployee) => {
        setEditingEmployee(emp);
        setValue("full_name", emp.employee.full_name);
        setValue("email", emp.employee.email);
        setValue("phone_number", emp.employee.phone_number || "");
        setValue("username", emp.employee.username);
        setValue("role", emp.roles[0] || "");
        setValue("status", emp.employee.status);
        setValue("password", "");
        setIsDialogOpen(true);
    };

    const onSubmit = async (data: EmployeeFormValues) => {
        toast.info(editingEmployee ? "Cập nhật nhân viên (demo)" : "Thêm nhân viên (demo)");
        setIsDialogOpen(false);
    };

    const confirmDelete = (emp: IEmployee) => {
        setEmployeeToDelete(emp);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        toast.info(`Xóa nhân viên ${employeeToDelete?.employee.full_name} (demo)`);
        setDeleteConfirmOpen(false);
    };

    const getRoleDisplay = (roles: string[]) => {
        if (!roles.length) return { label: "Chưa phân quyền", color: "bg-gray-100 text-gray-800" };
        return roleDisplayMap[roles[0]] || { label: roles[0], color: "bg-gray-100 text-gray-800" };
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

    // Tính toán thống kê nhanh
    const totalActive = employees.filter((e) => e.employee.status === "active").length;
    const totalInactive = employees.filter((e) => e.employee.status === "inactive").length;
    const uniqueRoles = new Set(employees.flatMap((e) => e.roles)).size;

    // Mock export function
    const handleExport = () => {
        toast.info("Xuất danh sách nhân viên (demo)");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Quản lý nhân sự
                        </h1>
                        <p className="text-muted-foreground">
                            Quản lý thông tin, vai trò và trạng thái nhân viên trong hệ thống
                        </p>
                    </div>
                    <Button
                        onClick={openAddDialog}
                        className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg hover:shadow-xl transition-all"
                    >
                        <UserPlus className="h-4 w-4" />
                        Thêm nhân viên
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-0 bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-900 dark:to-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tổng nhân viên</p>
                                    <p className="text-3xl font-bold">{pagination.totalItems}</p>
                                </div>
                                <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                                    <Users className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-900 dark:to-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Đang làm việc</p>
                                    <p className="text-3xl font-bold text-green-600">{totalActive}</p>
                                </div>
                                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                                    <UserCheck className="h-5 w-5 text-green-700" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-900 dark:to-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nghỉ việc</p>
                                    <p className="text-3xl font-bold text-red-600">{totalInactive}</p>
                                </div>
                                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                                    <UserX className="h-5 w-5 text-red-700" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-900 dark:to-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Vai trò đang có</p>
                                    <p className="text-3xl font-bold">{uniqueRoles}</p>
                                </div>
                                <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                                    <Building className="h-5 w-5 text-purple-700" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search, Filter, Export */}
                <Card className="border-0 shadow-md">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                        className="h-11 pl-10"
                                    />
                                </div>
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-full md:w-56">
                                        <Filter className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder="Lọc theo vai trò" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả vai trò</SelectItem>
                                        {Object.entries(roleDisplayMap).map(([val, { label }]) => (
                                            <SelectItem key={val} value={val}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {(searchText || roleFilter !== "all") && (
                                    <Button variant="ghost" onClick={resetFilters} className="gap-1">
                                        <X className="h-4 w-4" /> Xóa lọc
                                    </Button>
                                )}
                            </div>
                            <Button variant="outline" onClick={handleExport} className="gap-2">
                                <Download className="h-4 w-4" />
                                Xuất danh sách
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Employee Table */}
                <Card className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="border-b bg-white/50 pb-4 dark:bg-slate-900/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl font-semibold">Danh sách nhân viên</CardTitle>
                            <Badge variant="outline" className="bg-white dark:bg-slate-800">
                                Tổng: {pagination.totalItems}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="space-y-3 p-6">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-1/4" />
                                            <Skeleton className="h-3 w-1/3" />
                                        </div>
                                        <Skeleton className="h-8 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                                    <Users className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="mt-4 text-lg font-medium">Không có nhân viên nào</p>
                                <p className="text-sm text-muted-foreground">
                                    Hãy thử thay đổi bộ lọc hoặc thêm nhân viên mới
                                </p>
                                <Button variant="link" onClick={resetFilters} className="mt-2">
                                    Xóa bộ lọc
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/80 dark:bg-slate-900/50">
                                                <TableHead className="py-4 font-semibold">Nhân viên</TableHead>
                                                <TableHead className="font-semibold">Email</TableHead>
                                                <TableHead className="font-semibold">Số điện thoại</TableHead>
                                                <TableHead className="font-semibold">Vai trò</TableHead>
                                                <TableHead className="font-semibold">Trạng thái</TableHead>
                                                <TableHead className="font-semibold">Ngày tạo</TableHead>
                                                <TableHead className="w-[80px] font-semibold">Thao tác</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((item) => {
                                                const emp = item.employee;
                                                const roleInfo = getRoleDisplay(item.roles);
                                                return (
                                                    <TableRow
                                                        key={emp.id}
                                                        className="group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                                                    >
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                                                    <AvatarImage src={emp.avatar_url || undefined} />
                                                                    <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800">
                                                                        {emp.full_name.slice(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                                        {emp.full_name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <User className="h-3 w-3" />
                                                                        <span>@{emp.username}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span className="text-sm">{emp.email}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {emp.phone_number ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span className="text-sm">{emp.phone_number}</span>
                                                                </div>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={cn(roleInfo.color, "font-normal")}>
                                                                {roleInfo.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {emp.status === "active" ? (
                                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                                    <CheckCircle className="mr-1 h-3 w-3" /> Đang làm
                                                                    việc
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-slate-100 text-slate-700"
                                                                >
                                                                    <XCircle className="mr-1 h-3 w-3" /> Nghỉ việc
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span className="text-sm">
                                                                    {formatDate(emp.created_at)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="opacity-70 transition-opacity group-hover:opacity-100"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-36">
                                                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        onClick={() => openEditDialog(item)}
                                                                    >
                                                                        <Edit className="mr-2 h-4 w-4" /> Sửa
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-red-600 focus:text-red-600"
                                                                        onClick={() => confirmDelete(item)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Xóa
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div className="border-t px-4 py-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (pagination.currentPage > 1)
                                                                setPagination((prev) => ({
                                                                    ...prev,
                                                                    currentPage: prev.currentPage - 1,
                                                                }));
                                                        }}
                                                        className={cn(
                                                            pagination.currentPage === 1 &&
                                                                "pointer-events-none opacity-50",
                                                        )}
                                                    />
                                                </PaginationItem>
                                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                    let pageNum = i + 1;
                                                    if (pagination.totalPages > 5 && pagination.currentPage > 3) {
                                                        pageNum = pagination.currentPage - 2 + i;
                                                        if (pageNum > pagination.totalPages) return null;
                                                    }
                                                    return (
                                                        <PaginationItem key={pageNum}>
                                                            <PaginationLink
                                                                href="#"
                                                                isActive={pagination.currentPage === pageNum}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setPagination((prev) => ({
                                                                        ...prev,
                                                                        currentPage: pageNum,
                                                                    }));
                                                                }}
                                                            >
                                                                {pageNum}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                })}
                                                {pagination.totalPages > 5 &&
                                                    pagination.currentPage < pagination.totalPages - 2 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (pagination.currentPage < pagination.totalPages)
                                                                setPagination((prev) => ({
                                                                    ...prev,
                                                                    currentPage: prev.currentPage + 1,
                                                                }));
                                                        }}
                                                        className={cn(
                                                            pagination.currentPage === pagination.totalPages &&
                                                                "pointer-events-none opacity-50",
                                                        )}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Add/Edit Dialog (giữ nguyên giao diện, có thể cải thiện nhẹ) */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                                    {editingEmployee ? <Edit className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                </div>
                                {editingEmployee ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingEmployee
                                    ? "Cập nhật thông tin chi tiết của nhân viên"
                                    : "Điền các thông tin dưới đây để thêm nhân viên vào hệ thống"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name" className="flex items-center gap-1">
                                        Họ tên <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="full_name" placeholder="Nguyễn Văn A" {...register("full_name")} />
                                    {errors.full_name && (
                                        <p className="text-xs text-red-500">{errors.full_name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="flex items-center gap-1">
                                        Tên đăng nhập <span className="text-red-500">*</span>
                                    </Label>
                                    <Input id="username" placeholder="nguyenvana" {...register("username")} />
                                    {errors.username && (
                                        <p className="text-xs text-red-500">{errors.username.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-1">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="nguyenvana@example.com"
                                        {...register("email")}
                                    />
                                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone_number">Số điện thoại</Label>
                                    <Input id="phone_number" placeholder="0901234567" {...register("phone_number")} />
                                    {errors.phone_number && (
                                        <p className="text-xs text-red-500">{errors.phone_number.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role" className="flex items-center gap-1">
                                        Vai trò <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        onValueChange={(val) => setValue("role", val)}
                                        defaultValue={editingEmployee?.roles?.[0]}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn vai trò" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(roleDisplayMap).map(([val, { label }]) => (
                                                <SelectItem key={val} value={val}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Trạng thái</Label>
                                    <Select
                                        onValueChange={(val) => setValue("status", val as any)}
                                        defaultValue={editingEmployee?.employee.status || "active"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Đang làm việc</SelectItem>
                                            <SelectItem value="inactive">Nghỉ việc</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {!editingEmployee && (
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="password" className="flex items-center gap-1">
                                            Mật khẩu <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Nhập mật khẩu"
                                            {...register("password")}
                                        />
                                        {errors.password && (
                                            <p className="text-xs text-red-500">{errors.password.message}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                                >
                                    {isSubmitting ? "Đang lưu..." : editingEmployee ? "Cập nhật" : "Thêm mới"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>Xác nhận xóa nhân viên</DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn xóa{" "}
                                <strong className="text-red-600">{employeeToDelete?.employee.full_name}</strong>? Hành
                                động này không thể hoàn tác và sẽ xóa vĩnh viễn khỏi hệ thống.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                                Hủy bỏ
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Xóa
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
