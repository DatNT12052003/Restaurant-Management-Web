// ========== types.ts ==========
export interface Employee {
    id: number;
    full_name: string;
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    email: string;
    phone_number: string | null;
    avatar_url: string | null;
    status: "active" | "inactive";
    account_id: number;
    restaurant_id: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    username: string;
}

export interface EmployeeWithRoles {
    employee: Employee;
    roles: string[];
    permissions: string[];
}

export interface ApiResponse {
    success: boolean;
    statusCode: number;
    message: string;
    data: {
        employees: EmployeeWithRoles[];
        pagination: {
            limit: number;
            currentPage: number;
            totalPages: number;
            totalItems: number;
        };
    };
}
