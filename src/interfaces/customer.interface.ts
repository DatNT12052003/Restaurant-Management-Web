import type { IPublicTablePayment } from "./integration.interface";
/** Giai đoạn 13: kênh khách hàng. pg trả numeric dưới dạng chuỗi. */
type Numeric = string | number;

export type ReservationStatus = "pending" | "confirmed" | "arrived" | "completed" | "cancelled" | "no_show";
export type OrderRequestStatus = "pending" | "accepted" | "rejected";
export type FeedbackStatus = "new" | "in_progress" | "resolved";
export type LoyaltyTransactionType = "earn" | "redeem" | "revoke" | "adjust";

export interface IPublicRestaurant {
    id: number;
    name: string;
    address: string;
    phone: string | null;
    open_time: string;
    close_time: string;
    image_url: string | null;
    online_booking_enabled: boolean;
    online_booking_max_guests: number;
    online_booking_max_days: number;
    online_booking_lead_minutes: number;
    online_booking_minutes: number;
}

export interface IPublicMenuItem {
    id: number;
    kind: "dish" | "combo";
    name: string;
    description: string | null;
    category: "food" | "drink" | null;
    price: Numeric;
    image_url: string | null;
    tags: { id: number; name: string }[];
    items?: { name: string; quantity: number }[];
}

export interface IPublicMenu {
    restaurant: IPublicRestaurant;
    images: string[];
    dishes: IPublicMenuItem[];
    combos: IPublicMenuItem[];
}

export interface IBookingSlot {
    time: string;
    available: boolean;
}

export interface IOnlineBookingPayload {
    restaurant_id: number;
    date: string;
    time: string;
    guest_count: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    note?: string | null;
    otp_code?: string;
}

export interface IPublicReservation {
    id?: number;
    lookup_code: string | null;
    restaurant_id: number;
    restaurant_name: string;
    restaurant_address: string;
    restaurant_phone: string | null;
    contact_name: string;
    contact_phone: string;
    guest_count: number;
    start_time: string;
    end_time: string;
    status: ReservationStatus;
    note: string | null;
    cancel_reason: string | null;
    created_at: string;
}

export interface IOrderRequestLine {
    kind: "dish" | "combo";
    id: number;
    name: string;
    quantity: number;
    note: string | null;
    price: Numeric | null;
}

export interface IOrderRequest {
    id: number;
    restaurant_id: number;
    table_id: number;
    table_name?: string;
    room_name?: string;
    order_id: number | null;
    order_code?: string | null;
    guest_user_id?: number | null;
    guest_name?: string | null;
    guest_count: number | null;
    lines?: IOrderRequestLine[];
    note: string | null;
    status: OrderRequestStatus;
    reject_reason: string | null;
    decided_by_name?: string | null;
    decided_at: string | null;
    created_at: string;
}

export interface IOrderRequestPayload {
    client_token: string;
    guest_count?: number | null;
    note?: string | null;
    dishes?: { dish_id: number; quantity: number; note?: string | null }[];
    combos?: { combo_id: number; quantity: number; note?: string | null }[];
}

export interface IPublicTable {
    table: { id: number; name: string; room_name: string };
    restaurant: { id: number; name: string; qr_ordering_enabled: boolean };
    order: {
        code: string;
        total: Numeric;
        lines: { kind: string; name: string; quantity: number; status: string; price: Numeric }[];
        /** Giai đoạn 14: số còn phải trả, mã chuyển khoản */
        payment?: IPublicTablePayment | null;
    } | null;
    feedback_order: { id: number; code: string; completed_at: string } | null;
}

export interface IFeedbackPayload {
    food_rating: number;
    service_rating: number;
    ambience_rating: number;
    comment?: string | null;
    is_complaint?: boolean;
    contact_phone?: string | null;
}

export interface IFeedback extends IFeedbackPayload {
    id: number;
    order_id: number;
    order_code?: string;
    restaurant_id: number;
    restaurant_name?: string;
    guest_user_id: number | null;
    guest_name?: string | null;
    comment: string | null;
    is_complaint: boolean;
    contact_phone: string | null;
    status: FeedbackStatus;
    reply: string | null;
    replied_by_name?: string | null;
    replied_at: string | null;
    created_at: string;
}

export interface IFeedbackSummary {
    count: number;
    complaints: number;
    open: number;
    avg_food: number | null;
    avg_service: number | null;
    avg_ambience: number | null;
    by_restaurant: { restaurant_id: number; restaurant_name: string; count: number; complaints: number; avg_overall: number | null }[];
}

export interface IGetFeedbacks {
    feedbacks: IFeedback[];
    summary: IFeedbackSummary;
    pagination: { limit: number; currentPage: number; totalPages: number; totalItems: number };
}

export interface ILoyaltySettings {
    enabled: boolean;
    earn_amount: number;
    point_value: number;
    max_redeem_percent: number;
    regular_visit_count: number;
    regular_window_months: number;
    updated_at?: string;
}

export interface ILoyaltyGuest {
    id: number;
    full_name: string;
    phone_number: string | null;
    email: string | null;
    guest_status: string | null;
    loyalty_points: number;
    available_points: number;
}

export interface ILoyaltyTransaction {
    id: number;
    order_id: number | null;
    order_code?: string | null;
    type: LoyaltyTransactionType;
    points: number;
    balance_after: number;
    note: string | null;
    created_by_name?: string | null;
    created_at: string;
}

export interface ICustomerProfile {
    id: number;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    guest_status: string | null;
    loyalty_points: number;
    visits: number;
    total_spent: Numeric;
    regular_progress: { visits: number; required: number; months: number };
    loyalty: ILoyaltySettings;
}

export interface ICustomerOrder {
    id: number;
    code: string;
    restaurant_id: number;
    restaurant_name: string;
    status: string;
    total: Numeric;
    points_redeemed: number;
    points_awarded: number;
    created_at: string;
    completed_at: string | null;
    lines: { name: string; quantity: number; price: Numeric }[];
    feedback: IFeedback | null;
}

export interface IRegisterPayload {
    user: { full_name: string; phone_number?: string; email?: string };
    account: { username: string; password: string };
}
