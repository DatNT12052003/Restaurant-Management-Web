import type { PaymentMethodEnum } from "@/enum";
import type { IPagination } from "./common.interface";

export type SupplierStatusEnum = "active" | "inactive";
export type PurchaseOrderStatusEnum = "draft" | "sent" | "partial" | "received" | "closed" | "cancelled";
export type StockTransferStatusEnum = "in_transit" | "received" | "cancelled";
export type SupplierBillStatusEnum = "unpaid" | "partial" | "paid";

export interface ISupplier {
    id: number;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    tax_code: string | null;
    payment_terms_days: number;
    note: string | null;
    status: SupplierStatusEnum;
    price_count?: number;
    outstanding?: string;
    prices?: ISupplierPrice[];
}

export interface ISupplierPayload {
    name?: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    tax_code?: string | null;
    payment_terms_days?: number | string;
    note?: string | null;
    status?: SupplierStatusEnum;
}

export interface ISupplierPrice {
    supplier_id: number;
    supplier_name?: string;
    ingredient_id: number;
    ingredient_name?: string;
    unit?: string;
    unit_price: string;
    is_preferred: boolean;
}

export interface IPurchaseOrderLine {
    id: number;
    ingredient_id: number;
    ingredient_name?: string;
    unit?: string;
    track_expiry?: boolean;
    shelf_life_days?: number | null;
    quantity: string;
    unit_price: string;
    received_quantity: string;
}

export interface IPurchaseOrder {
    id: number;
    code: string;
    restaurant_id: number;
    restaurant_name?: string;
    supplier_id: number;
    supplier_name?: string;
    status: PurchaseOrderStatusEnum;
    expected_date: string | null;
    note: string | null;
    total: string;
    received_value?: string;
    created_by_name?: string | null;
    sent_at: string | null;
    closed_at: string | null;
    cancel_reason: string | null;
    created_at: string;
    line_count?: number;
    lines?: IPurchaseOrderLine[];
    receipts?: { id: number; code: string; total_value: string; created_at: string; created_by_name: string | null }[];
}

export interface IGetPurchaseOrders {
    purchase_orders: IPurchaseOrder[];
    pagination: IPagination;
}

export interface IPurchaseOrderPayload {
    restaurant_id?: number;
    supplier_id?: number;
    expected_date?: string | null;
    note?: string | null;
    send?: boolean;
    lines?: { ingredient_id: number; quantity: number; unit_price?: number }[];
}

export interface IReceivePurchasePayload {
    note?: string | null;
    lines: { line_id: number; quantity: number; unit_price?: number; expiry_date?: string | null; lot_code?: string | null }[];
}

export interface IPurchaseSuggestion {
    ingredient_id: number;
    name: string;
    unit: string;
    stock: number;
    min_quantity: number;
    avg_daily_usage: number;
    incoming: number;
    suggested_quantity: number;
    unit_price: number | null;
}

export interface IPurchaseSuggestions {
    restaurant_id: number;
    cover_days: number;
    lookback_days: number;
    items: IPurchaseSuggestion[];
}

export interface IStockTransferLine {
    id: number;
    ingredient_id: number;
    ingredient_name?: string;
    unit?: string;
    quantity: string;
    unit_cost: string;
    received_quantity: string | null;
    lots: { lot_code: string | null; expiry_date: string; quantity: number }[];
}

export interface IStockTransfer {
    id: number;
    code: string;
    from_restaurant_id: number;
    from_restaurant_name?: string;
    to_restaurant_id: number;
    to_restaurant_name?: string;
    status: StockTransferStatusEnum;
    note: string | null;
    total_value: string;
    loss_value: string;
    created_by_name?: string | null;
    received_by_name?: string | null;
    received_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    line_count?: number;
    lines?: IStockTransferLine[];
}

export interface IGetStockTransfers {
    transfers: IStockTransfer[];
    pagination: IPagination;
}

export interface ITransferPayload {
    from_restaurant_id?: number;
    to_restaurant_id: number;
    note?: string | null;
    lines: { ingredient_id: number; quantity: number }[];
}

export interface ISupplierPayment {
    id: number;
    amount: string;
    method: PaymentMethodEnum;
    reference: string | null;
    note: string | null;
    paid_at: string;
    created_by_name?: string | null;
}

export interface ISupplierBill {
    id: number;
    supplier_id: number;
    supplier_name?: string;
    restaurant_id: number;
    restaurant_name?: string;
    purchase_order_id: number | null;
    purchase_order_code?: string | null;
    receipt_id: number;
    receipt_code?: string;
    amount: string;
    paid_amount: string;
    remaining?: string;
    due_date: string;
    status: SupplierBillStatusEnum;
    overdue?: boolean;
    created_at: string;
    payments?: ISupplierPayment[];
}

export interface IGetSupplierBills {
    bills: ISupplierBill[];
    pagination: IPagination;
    summary: { outstanding: string; overdue: string; bills: number };
}
