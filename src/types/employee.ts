import type { IEmployee } from "@/interfaces";

export interface EmployeeStatsProps {
    total: number;
    active: number;
    inactive: number;
    roles: number;
}

export interface EmployeeFiltersProps {
    searchText: string;
    setSearchText: (value: string) => void;
    roleFilter: string;
    setRoleFilter: (value: string) => void;
    onSearch: () => void;
    onReset: () => void;
    roleOptions: { value: string; label: string }[];
}

export interface EmployeeTableProps {
    employees: IEmployee[];
    loading: boolean;
    onEdit: (employee: IEmployee) => void;
    onDelete: (employee: IEmployee) => void;
    getRoleDisplay: (roles: string[]) => { label: string; color: string };
    formatDate: (dateStr: string) => string;
}

export interface EmployeePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export interface EmployeeFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingEmployee: IEmployee | null;
    onSubmit: (data: any) => void;
    restaurantId: number;
}

export interface EmployeeDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: IEmployee | null;
    onConfirm: () => void;
}
