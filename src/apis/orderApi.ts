import type { KitchenStationEnum, OrderItemStatusEnum } from "@/enum";
import type {
    IBatchLineStatusPayload,
    ISplitOrderPayload,
    IGetOrders,
    IGetQuery,
    IKitchenLine,
    IOrder,
    IOrderDetail,
    IOrderPayload,
    IResponse,
    IRoundPayload,
    OrderLineKind,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** `restaurantId`: chỉ admin dùng; người bị giới hạn nhà hàng luôn nhận nhà hàng của mình. */
const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

export const getOrders = (
    query: IGetQuery & { from?: string; to?: string; table_id?: number } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetOrders>> => unwrap(api.get("/orders", { params: { ...query, ...scope(restaurantId) } }));

/** Order đang mở (sơ đồ phục vụ) */
export const getActiveOrders = (restaurantId?: number | null): Promise<IResponse<IOrder[]>> =>
    unwrap(api.get("/orders/active", { params: scope(restaurantId) }));

export const getKitchenQueue = (
    station?: KitchenStationEnum,
    restaurantId?: number | null,
): Promise<IResponse<IKitchenLine[]>> =>
    unwrap(api.get("/orders/kitchen-queue", { params: { ...scope(restaurantId), ...(station ? { station } : {}) } }));

export const getOrder = (id: number): Promise<IResponse<IOrderDetail>> => unwrap(api.get(`/orders/${id}`));

export const createOrder = (payload: IOrderPayload): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post("/orders", payload));

export const updateOrder = (id: number, payload: IOrderPayload): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.patch(`/orders/${id}`, payload));

export const sendOrderRound = (id: number, payload: IRoundPayload): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post(`/orders/${id}/rounds`, payload));

export const addOrderTables = (id: number, tableIds: number[]): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post(`/orders/${id}/tables`, { table_ids: tableIds }));

export const transferOrderTable = (
    id: number,
    fromTableId: number,
    toTableId: number,
): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post(`/orders/${id}/transfer`, { from_table_id: fromTableId, to_table_id: toTableId }));

export const releaseOrderTable = (id: number, tableId: number): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.delete(`/orders/${id}/tables/${tableId}`));

export const completeOrder = (id: number): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post(`/orders/${id}/complete`));

export const cancelOrder = (id: number, cancelReason?: string | null): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post(`/orders/${id}/cancel`, { cancel_reason: cancelReason || null }));

/** Đổi trạng thái nhiều món một lần (tất cả cùng thành công hoặc cùng thất bại) */
export const updateOrderLinesStatus = (
    payload: IBatchLineStatusPayload,
): Promise<IResponse<{ status: OrderItemStatusEnum; lines: { kind: OrderLineKind; id: number; order_id: number }[] }>> =>
    unwrap(api.patch("/orders/lines/status", payload));

/** Gộp order `id` vào `targetOrderId`; trả về order đích */
export const mergeOrder = (id: number, targetOrderId: number): Promise<IResponse<IOrderDetail>> =>
    unwrap(api.post(`/orders/${id}/merge`, { target_order_id: targetOrderId }));

export const splitOrder = (
    id: number,
    payload: ISplitOrderPayload,
): Promise<IResponse<{ source: IOrderDetail; target: IOrderDetail }>> => unwrap(api.post(`/orders/${id}/split`, payload));

export const updateOrderLineStatus = (
    kind: OrderLineKind,
    lineId: number,
    status: OrderItemStatusEnum,
    cancelReason?: string | null,
): Promise<IResponse<{ id: number; status: OrderItemStatusEnum }>> =>
    unwrap(
        api.patch(`/orders/${kind === "dish" ? "dishes" : "combos"}/${lineId}/status`, {
            status,
            cancel_reason: cancelReason || null,
        }),
    );
