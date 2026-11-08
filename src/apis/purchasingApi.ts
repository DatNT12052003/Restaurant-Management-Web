import type { PaymentMethodEnum } from "@/enum";
import type {
    IGetPurchaseOrders,
    IGetQuery,
    IGetStockTransfers,
    IGetSupplierBills,
    IPurchaseOrder,
    IPurchaseOrderPayload,
    IPurchaseSuggestions,
    IReceivePurchasePayload,
    IResponse,
    IStockTransfer,
    ISupplier,
    ISupplierBill,
    ISupplierPayload,
    ISupplierPrice,
    ITransferPayload,
    PurchaseOrderStatusEnum,
    StockTransferStatusEnum,
    SupplierBillStatusEnum,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** `restaurantId`: chỉ admin dùng; người bị giới hạn nhà hàng luôn là chi nhánh của mình */
const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

// ---- Nhà cung cấp ----

export const getSuppliers = (params: { search?: string; status?: string } = {}): Promise<IResponse<ISupplier[]>> =>
    unwrap(api.get("/suppliers", { params }));
export const getSupplier = (id: number): Promise<IResponse<ISupplier>> => unwrap(api.get(`/suppliers/${id}`));
export const createSupplier = (payload: ISupplierPayload): Promise<IResponse<ISupplier>> => unwrap(api.post("/suppliers", payload));
export const updateSupplier = (id: number, payload: ISupplierPayload): Promise<IResponse<ISupplier>> =>
    unwrap(api.patch(`/suppliers/${id}`, payload));
export const deleteSupplier = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/suppliers/${id}`));
export const updateSupplierPrices = (
    id: number,
    items: { ingredient_id: number; unit_price: number; is_preferred?: boolean }[],
): Promise<IResponse<ISupplierPrice[]>> => unwrap(api.put(`/suppliers/${id}/prices`, { items }));

// ---- Đơn đặt hàng ----

export const getPurchaseOrders = (
    query: IGetQuery & { supplier_id?: number; status?: PurchaseOrderStatusEnum } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetPurchaseOrders>> => unwrap(api.get("/purchase-orders", { params: { ...query, ...scope(restaurantId) } }));
export const getPurchaseOrder = (id: number): Promise<IResponse<IPurchaseOrder>> => unwrap(api.get(`/purchase-orders/${id}`));
export const getPurchaseSuggestions = (
    params: { supplier_id?: number; cover_days?: number; lookback_days?: number },
    restaurantId?: number | null,
): Promise<IResponse<IPurchaseSuggestions>> =>
    unwrap(api.get("/purchase-orders/suggestions", { params: { ...params, ...scope(restaurantId) } }));
export const createPurchaseOrder = (payload: IPurchaseOrderPayload): Promise<IResponse<IPurchaseOrder>> =>
    unwrap(api.post("/purchase-orders", payload));
export const updatePurchaseOrder = (id: number, payload: IPurchaseOrderPayload): Promise<IResponse<IPurchaseOrder>> =>
    unwrap(api.patch(`/purchase-orders/${id}`, payload));
export const purchaseOrderAction = (
    id: number,
    action: "send" | "cancel" | "close",
    reason?: string | null,
): Promise<IResponse<IPurchaseOrder>> => unwrap(api.post(`/purchase-orders/${id}/${action}`, action === "send" ? undefined : { reason: reason || null }));
export const receivePurchaseOrder = (id: number, payload: IReceivePurchasePayload): Promise<IResponse<IPurchaseOrder>> =>
    unwrap(api.post(`/purchase-orders/${id}/receive`, payload));

// ---- Chuyển kho ----

export const getStockTransfers = (
    query: IGetQuery & { status?: StockTransferStatusEnum } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetStockTransfers>> => unwrap(api.get("/stock-transfers", { params: { ...query, ...scope(restaurantId) } }));
/** Chi nhánh nhận được chọn (mọi chi nhánh trừ chi nhánh gửi) */
export const getTransferDestinations = (restaurantId?: number | null): Promise<IResponse<{ id: number; name: string }[]>> =>
    unwrap(api.get("/stock-transfers/destinations", { params: scope(restaurantId) }));
export const getStockTransfer = (id: number): Promise<IResponse<IStockTransfer>> => unwrap(api.get(`/stock-transfers/${id}`));
export const createStockTransfer = (payload: ITransferPayload): Promise<IResponse<IStockTransfer>> =>
    unwrap(api.post("/stock-transfers", payload));
export const receiveStockTransfer = (
    id: number,
    lines?: { line_id: number; received_quantity: number }[],
    note?: string | null,
): Promise<IResponse<IStockTransfer>> => unwrap(api.post(`/stock-transfers/${id}/receive`, { lines, note: note || null }));
export const cancelStockTransfer = (id: number): Promise<IResponse<IStockTransfer>> => unwrap(api.post(`/stock-transfers/${id}/cancel`));

// ---- Công nợ ----

export const getSupplierBills = (
    query: IGetQuery & { supplier_id?: number; status?: SupplierBillStatusEnum; overdue?: boolean } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetSupplierBills>> => unwrap(api.get("/payables", { params: { ...query, ...scope(restaurantId) } }));
export const getSupplierBill = (id: number): Promise<IResponse<ISupplierBill>> => unwrap(api.get(`/payables/${id}`));
export const paySupplierBill = (
    id: number,
    payload: { amount: number; method: PaymentMethodEnum; reference?: string | null; note?: string | null },
): Promise<IResponse<ISupplierBill>> => unwrap(api.post(`/payables/${id}/payments`, payload));
