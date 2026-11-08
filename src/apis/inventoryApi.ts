import type {
    IGetInventoryTransactions,
    IGetQuery,
    IGetReceipts,
    IIngredient,
    IIngredientPayload,
    IInventoryReceipt,
    IReceiptPayload,
    IResponse,
    IStock,
    ILots,
    InventoryReceiptTypeEnum,
    InventoryTransactionTypeEnum,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

// ---- Nguyên liệu ----

export const getIngredients = (params: { search?: string; status?: string } = {}): Promise<IResponse<IIngredient[]>> =>
    unwrap(api.get("/ingredients", { params }));

export const createIngredient = (payload: IIngredientPayload): Promise<IResponse<IIngredient>> =>
    unwrap(api.post("/ingredients", payload));

export const updateIngredient = (id: number, payload: IIngredientPayload): Promise<IResponse<IIngredient>> =>
    unwrap(api.patch(`/ingredients/${id}`, payload));

export const deleteIngredient = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/ingredients/${id}`));

// ---- Lô hàng (giai đoạn 11) ----

export const getLots = (
    params: { ingredient_id?: number; expiring_days?: number } = {},
    restaurantId?: number | null,
): Promise<IResponse<ILots>> => unwrap(api.get("/inventory/lots", { params: { ...params, ...scope(restaurantId) } }));

// ---- Tồn kho ----

export const getStock = (
    options: { low_only?: boolean; include_inactive?: boolean } = {},
    restaurantId?: number | null,
): Promise<IResponse<IStock>> => unwrap(api.get("/inventory", { params: { ...options, ...scope(restaurantId) } }));

export const setMinQuantity = (
    ingredientId: number,
    minQuantity: number,
    restaurantId?: number | null,
): Promise<IResponse<{ ingredient_id: number; min_quantity: number }>> =>
    unwrap(api.patch("/inventory/settings", { ingredient_id: ingredientId, min_quantity: minQuantity, ...scope(restaurantId) }));

// ---- Phiếu kho ----

export const createReceipt = (payload: IReceiptPayload): Promise<IResponse<IInventoryReceipt>> =>
    unwrap(api.post("/inventory/receipts", payload));

export const getReceipt = (id: number): Promise<IResponse<IInventoryReceipt>> => unwrap(api.get(`/inventory/receipts/${id}`));

export const getReceipts = (
    query: IGetQuery & { type?: InventoryReceiptTypeEnum; from?: string; to?: string } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetReceipts>> =>
    unwrap(api.get("/inventory/receipts", { params: { ...query, ...scope(restaurantId) } }));

export const getInventoryTransactions = (
    query: IGetQuery & { ingredient_id?: number; type?: InventoryTransactionTypeEnum; from?: string; to?: string } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetInventoryTransactions>> =>
    unwrap(api.get("/inventory/transactions", { params: { ...query, ...scope(restaurantId) } }));
