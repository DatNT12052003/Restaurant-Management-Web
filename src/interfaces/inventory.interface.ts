import type { IPagination } from "./common.interface";

export type IngredientStatusEnum = "active" | "inactive";
export type InventoryReceiptTypeEnum = "import" | "export" | "adjust" | "dispose";
export type InventoryTransactionTypeEnum = "import" | "export" | "adjust" | "consume" | "dispose" | "transfer_out" | "transfer_in";

export interface IIngredient {
    id: number;
    name: string;
    unit: string;
    description: string | null;
    status: IngredientStatusEnum;
    /** Giai đoạn 11: theo dõi lô và hạn dùng */
    track_expiry: boolean;
    shelf_life_days: number | null;
}

export interface IIngredientPayload {
    name?: string;
    unit?: string;
    description?: string | null;
    status?: IngredientStatusEnum;
    track_expiry?: boolean;
    shelf_life_days?: number | string | null;
}

export interface IStockItem {
    ingredient_id: number;
    name: string;
    unit: string;
    status: IngredientStatusEnum;
    track_expiry: boolean;
    shelf_life_days: number | null;
    quantity: string;
    min_quantity: string;
    avg_unit_cost: string;
    stock_value: string;
    is_low: boolean;
    last_change_at: string | null;
}

export interface IStock {
    restaurant_id: number;
    items: IStockItem[];
    summary: { total_value: string; low_count: number; item_count: number };
}

export interface IInventoryTransaction {
    id: number;
    restaurant_id: number;
    ingredient_id: number;
    ingredient_name?: string;
    unit?: string;
    receipt_id: number | null;
    receipt_code?: string | null;
    type: InventoryTransactionTypeEnum;
    quantity_change: string;
    quantity_after: string;
    unit_price: string;
    reason: string | null;
    created_by_name?: string | null;
    created_at: string;
}

export interface IInventoryReceipt {
    id: number;
    code: string;
    restaurant_id: number;
    type: InventoryReceiptTypeEnum;
    supplier: string | null;
    reason: string | null;
    note: string | null;
    total_value: string;
    supplier_id?: number | null;
    purchase_order_id?: number | null;
    purchase_order_code?: string | null;
    created_by_name?: string | null;
    line_count?: number;
    created_at: string;
    lines?: IInventoryTransaction[];
}

export interface IGetReceipts {
    receipts: IInventoryReceipt[];
    pagination: IPagination;
}

export interface IGetInventoryTransactions {
    transactions: IInventoryTransaction[];
    pagination: IPagination;
}

export interface IReceiptPayload {
    restaurant_id?: number;
    type: InventoryReceiptTypeEnum;
    supplier?: string | null;
    supplier_id?: number | null;
    reason?: string | null;
    note?: string | null;
    lines: {
        ingredient_id: number;
        quantity: number;
        unit_price?: number;
        note?: string | null;
        expiry_date?: string | null;
        lot_code?: string | null;
        lot_id?: number | null;
    }[];
}

/** Lô hàng còn lại theo hạn dùng */
export interface IInventoryLot {
    id: number;
    ingredient_id: number;
    ingredient_name: string;
    unit: string;
    lot_code: string | null;
    expiry_date: string;
    initial_quantity: string;
    quantity: string;
    receipt_code: string | null;
    transfer_id: number | null;
    days_left: number;
    value: string;
}

export interface ILots {
    restaurant_id: number;
    lots: IInventoryLot[];
    summary: { expiring: number; expired: number; warning_days: number };
}
