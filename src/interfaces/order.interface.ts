import type { KitchenStationEnum, OrderItemStatusEnum, OrderStatusEnum } from "@/enum";
import type { IPagination } from "./common.interface";
import type { IReservationTable } from "./reservation.interface";
import type { IPayment } from "./payment.interface";

export type OrderLineKind = "dish" | "combo";

export type IOrderTable = IReservationTable;

export interface IOrderLine {
    id: number;
    kind: OrderLineKind;
    order_id: number;
    round_id: number;
    /** dish_id hoặc combo_id */
    item_id: number;
    name: string;
    quantity: number;
    /** Giá tại thời điểm gọi */
    current_price: string;
    note: string | null;
    station: KitchenStationEnum;
    status: OrderItemStatusEnum;
    confirmed_at: string | null;
    cooking_at: string | null;
    ready_at: string | null;
    served_at: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    combo_items?: { dish_id: number; name: string; quantity: number }[] | null;
}

export interface IOrderRound {
    id: number;
    round_no: number;
    table_id: number | null;
    table_name: string | null;
    note: string | null;
    sent_at: string;
    created_by_name: string | null;
    lines: IOrderLine[];
}

export interface IOrder {
    id: number;
    code: string;
    restaurant_id: number;
    reservation_id: number | null;
    guest_user_id: number | null;
    guest_count: number;
    assigned_staff_id: number | null;
    status: OrderStatusEnum;
    subtotal: string;
    discount_amount: string;
    total: string;
    note: string | null;
    cancel_reason: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    tables: IOrderTable[];
    created_by_name?: string | null;
    assigned_staff_name?: string | null;
    guest?: { id: number; full_name: string; phone_number: string | null } | null;
    line_counts?: Partial<Record<OrderItemStatusEnum, number>>;
    /** Giai đoạn 5: phí / thuế, đã thu, đang chờ, mã giảm giá */
    service_fee_rate?: string;
    tax_rate?: string;
    service_fee?: string;
    tax?: string;
    paid_amount?: string;
    pending_amount?: string;
    discount?: { id: number; code: string; name: string; type: string; value: string; min_order_value: string; amount: string } | null;
}

export interface IOrderDetail extends IOrder {
    rounds: IOrderRound[];
    payments: IPayment[];
}

export interface IGetOrders {
    orders: IOrder[];
    pagination: IPagination;
}

export interface IOrderPayload {
    restaurant_id?: number;
    reservation_id?: number;
    table_ids?: number[];
    guest_count?: number;
    guest_user_id?: number | null;
    assigned_staff_id?: number | null;
    note?: string | null;
}

export interface IRoundPayload {
    table_id?: number;
    note?: string | null;
    items?: { dish_id: number; quantity: number; note?: string | null }[];
    combos?: { combo_id: number; quantity: number; note?: string | null }[];
}

/** Một dòng trên màn hình bếp / pha chế */
export interface IKitchenLine extends IOrderLine {
    order_code: string;
    order_note: string | null;
    round_no: number;
    sent_at: string;
    table_names: string | null;
}
