// ========== EmployeeManagement.tsx (Main Component) ==========
import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

// Import local components
import { StatsCards } from "./components/StatsCards";
import { EmployeeFilters } from "./components/EmployeeFilters";
import { EmployeeTable } from "./components/EmployeeTable";
import { EmployeeFormModal } from "./components/EmployeeFormModal";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { PaginationWithSize } from "./components/PaginationWithSize";
// Import types and mock data
import type { EmployeeWithRoles } from "./types";
import { generateMockEmployees } from "./mockData";

const EmployeeManagement: React.FC = () => {
    const [employees, setEmployees] = useState<EmployeeWithRoles[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState<string | null>(null);
    const [dateTo, setDateTo] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRoles | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Fetch mock data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await new Promise((resolve) => setTimeout(resolve, 500));
            const mockData = generateMockEmployees();
            setEmployees(mockData);
            setLoading(false);
        };
        fetchData();
    }, []);

    // Filtering logic (chưa tích hợp dateFrom/dateTo, bạn có thể thêm sau)
    const filteredEmployees = employees.filter(({ employee, roles }) => {
        const matchesSearch =
            searchTerm === "" ||
            employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.username.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === "all" || roles.includes(roleFilter);
        const matchesStatus = statusFilter === "all" || employee.status === statusFilter;

        // Thêm lọc theo ngày nếu cần
        // const employeeDate = new Date(employee.created_at);
        // const fromDate = dateFrom ? new Date(dateFrom) : null;
        // const toDate = dateTo ? new Date(dateTo) : null;
        // const matchesDate = (!fromDate || employeeDate >= fromDate) && (!toDate || employeeDate <= toDate);

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / pageSize);
    const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset về trang 1 khi filter hoặc pageSize thay đổi
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter, pageSize]);

    // Stats calculation
    const totalEmployees = filteredEmployees.length;
    const activeEmployees = filteredEmployees.filter(({ employee }) => employee.status === "active").length;
    const inactiveEmployees = filteredEmployees.filter(({ employee }) => employee.status === "inactive").length;

    const availableRoles = Array.from(new Set(employees.flatMap((emp) => emp.roles))).sort();

    // Handlers
    const handleAddEmployee = () => {
        setEditingEmployee(null);
        setIsFormOpen(true);
    };

    const handleEditEmployee = (employee: EmployeeWithRoles) => {
        setEditingEmployee(employee);
        setIsFormOpen(true);
    };

    const handleDeleteEmployee = (id: number) => {
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            setEmployees((prev) => prev.filter((emp) => emp.employee.id !== deleteId));
            setDeleteId(null);
            // Nếu sau khi xóa, trang hiện tại không còn dữ liệu và không phải trang đầu thì lùi lại
            if (paginatedEmployees.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        }
    };

    const handleFormSubmit = (data: Partial<EmployeeWithRoles>) => {
        if (editingEmployee) {
            // Update existing
            setEmployees((prev) =>
                prev.map((emp) =>
                    emp.employee.id === editingEmployee.employee.id
                        ? {
                              employee: { ...emp.employee, ...data.employee },
                              roles: data.roles || emp.roles,
                              permissions: data.permissions || emp.permissions,
                          }
                        : emp,
                ),
            );
        } else {
            // Add new
            const newEmployee: EmployeeWithRoles = {
                employee: {
                    ...(data.employee as any),
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                roles: data.roles || [],
                permissions: [],
            };
            setEmployees((prev) => [newEmployee, ...prev]);
        }
        setIsFormOpen(false);
        setEditingEmployee(null);
    };

    if (loading) {
        return (
            <div className="flex h-[500px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quản lý nhân viên</h1>
                    <p className="text-muted-foreground">Quản lý danh sách nhân viên, vai trò và trạng thái làm việc</p>
                </div>
                <Button onClick={handleAddEmployee} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Thêm nhân viên
                </Button>
            </div>

            {/* <StatsCards total={totalEmployees} active={activeEmployees} inactive={inactiveEmployees} /> */}

            <Separator />

            <EmployeeFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                availableRoles={availableRoles}
            />

            <EmployeeTable employees={paginatedEmployees} onEdit={handleEditEmployee} onDelete={handleDeleteEmployee} />

            {filteredEmployees.length > 0 && (
                <PaginationWithSize
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                />
            )}

            <EmployeeFormModal
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                editingEmployee={editingEmployee}
                onSubmit={handleFormSubmit}
                availableRoles={availableRoles}
            />

            <ConfirmDeleteModal
                open={deleteId !== null}
                onOpenChange={() => setDeleteId(null)}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default EmployeeManagement;
