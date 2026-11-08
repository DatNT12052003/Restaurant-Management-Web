import type { IPagination } from "./common.interface";

export type ReportGroupBy = "day" | "week" | "month";

/** Tham số chung của báo cáo: ngày "YYYY-MM-DD" (giờ Việt Nam, gồm cả hai đầu) */
export interface IReportQuery {
    from: string;
    to: string;
    restaurant_id?: number;
    group_by?: ReportGroupBy;
    limit?: number;
    category?: "food" | "drink";
}

export interface IReportTotals {
    net_revenue: number;
    collected: number;
    refunded: number;
    completed_orders: number;
    cancelled_orders: number;
    gross_sales: number;
    discount_total: number;
    guests: number;
    avg_order_value: number;
    reservations: number;
    reservations_no_show: number;
    reservations_cancelled: number;
}

export interface IReportLive {
    open_orders: number;
    occupied_tables: number;
    total_tables: number;
    upcoming_reservations_today: number;
    low_stock: number;
    today_net_revenue: number;
}

export interface IReportOverview {
    range: { from: string; to: string };
    previous_range: { from: string; to: string };
    current: IReportTotals;
    previous: IReportTotals;
    live: IReportLive;
}

export interface IRevenuePoint {
    period: string;
    collected: number;
    refunded: number;
    net: number;
    orders: number;
    guests: number;
    gross_sales: number;
}

export interface IRevenueReport {
    group_by: ReportGroupBy;
    series: IRevenuePoint[];
    series_by_restaurant: { period: string; restaurant_id: number; net: number }[];
    by_restaurant: { restaurant_id: number; restaurant_name: string; net: number; orders: number; gross_sales: number }[];
    by_method: { method: string; collected: number; refunded: number; net: number; count: number }[];
    totals: { collected: number; refunded: number; net: number; orders: number; guests: number; gross_sales: number };
}

export interface ITopItem {
    id: number;
    name: string;
    category?: string;
    quantity: number;
    revenue: number;
    order_count: number;
}

export interface ITopItemsReport {
    dishes: ITopItem[];
    combos: ITopItem[];
}

export interface IOccupancyGroup {
    table_count: number;
    occupied_hours: number;
    available_hours: number;
    sessions: number;
    occupancy_rate: number | null;
    turnover: number | null;
}

export interface IOccupancyReport {
    days: number;
    summary: IOccupancyGroup;
    by_restaurant: (IOccupancyGroup & { restaurant_id: number; restaurant_name: string; open_time: string; close_time: string })[];
    by_room: (IOccupancyGroup & { room_id: number; room_name: string; restaurant_id: number })[];
    by_hour: { hour: number; occupied_hours: number; avg_occupancy: number | null }[];
}

export interface IInventoryReport {
    group_by: ReportGroupBy;
    series: { period: string; import_value: number; export_value: number; adjust_value: number; receipts: number }[];
    totals: { import_value: number; export_value: number; adjust_value: number; import_receipts: number };
    top_ingredients: { ingredient_id: number; name: string; unit: string; quantity: number; value: number }[];
    by_supplier: { supplier: string | null; value: number; receipts: number }[];
}

// ---- Nhật ký hoạt động ----

export interface IAuditLog {
    id: string;
    account_id: number | null;
    user_id: number | null;
    actor_name: string | null;
    restaurant_id: number | null;
    restaurant_name: string | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    before?: unknown;
    after?: unknown;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
}

export interface IGetAuditLogs {
    audit_logs: IAuditLog[];
    pagination: IPagination;
}

export interface IAuditFacets {
    actions: string[];
    entity_types: string[];
}

export interface IAuditLogQuery {
    currentPage?: number;
    limit?: number;
    action?: string;
    module?: string;
    entity_type?: string;
    entity_id?: number;
    user_id?: number;
    from?: string;
    to?: string;
    restaurant_id?: number;
}
