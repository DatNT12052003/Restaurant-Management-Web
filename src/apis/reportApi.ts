import type {
    IAuditFacets,
    IAuditLog,
    IAuditLogQuery,
    IGetAuditLogs,
    IInventoryReport,
    IOccupancyReport,
    IReportOverview,
    IReportQuery,
    IResponse,
    IRevenueReport,
    IProfitReport,
    ITipsReport,
    IVarianceReport,
    ITopItemsReport,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

// ---- Báo cáo (admin không gửi restaurant_id = cả chuỗi; người khác luôn là chi nhánh của mình) ----

export const getReportOverview = (params: IReportQuery): Promise<IResponse<IReportOverview>> =>
    unwrap(api.get("/reports/overview", { params }));

export const getRevenueReport = (params: IReportQuery): Promise<IResponse<IRevenueReport>> =>
    unwrap(api.get("/reports/revenue", { params }));

export const getTopItemsReport = (params: IReportQuery): Promise<IResponse<ITopItemsReport>> =>
    unwrap(api.get("/reports/top-items", { params }));

export const getOccupancyReport = (params: IReportQuery): Promise<IResponse<IOccupancyReport>> =>
    unwrap(api.get("/reports/table-occupancy", { params }));

export const getInventoryReport = (params: IReportQuery): Promise<IResponse<IInventoryReport>> =>
    unwrap(api.get("/reports/inventory", { params }));

export const getTipsReport = (params: IReportQuery): Promise<IResponse<ITipsReport>> =>
    unwrap(api.get("/reports/tips", { params }));

export const getProfitReport = (params: IReportQuery): Promise<IResponse<IProfitReport>> =>
    unwrap(api.get("/reports/profit", { params }));

export const getVarianceReport = (params: IReportQuery): Promise<IResponse<IVarianceReport>> =>
    unwrap(api.get("/reports/ingredient-variance", { params }));

// ---- Nhật ký hoạt động (chỉ đọc) ----

export const getAuditLogs = (params: IAuditLogQuery): Promise<IResponse<IGetAuditLogs>> =>
    unwrap(api.get("/audit-logs", { params }));

export const getAuditLog = (id: string | number): Promise<IResponse<IAuditLog>> => unwrap(api.get(`/audit-logs/${id}`));

export const getAuditFacets = (restaurantId?: number): Promise<IResponse<IAuditFacets>> =>
    unwrap(api.get("/audit-logs/facets", { params: restaurantId ? { restaurant_id: restaurantId } : {} }));
