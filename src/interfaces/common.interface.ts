import type { FilterOperatorEnum, OrderTypeEnum } from "@/enum";
export interface IResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    errors?: any;
    data?: T;
}

export interface IPagination {
    limit: number;
    currentPage: number;
    totalPages: number;
    totalItems: number;
}
export interface ISidebarMenuItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Ẩn mục menu nếu người dùng không có quyền này */
    permission?: string;
}

export interface ILocalState {
    from: string;
}

export interface IGetQuery {
    search?: {
        text: string;
        fields: string[];
    };
    filters?: {
        field: string;
        operator?: FilterOperatorEnum;
        value: any;
    }[];
    orderBy?: {
        field: string;
        direction?: OrderTypeEnum;
    }[];
    currentPage?: number;
    limit?: number;
}
