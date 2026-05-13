export interface IResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    errors?: any;
    data?: T;
}

export interface ISidebarMenuItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export interface ILocalState {
    from: string;
}
