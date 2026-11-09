import type {
    FeedbackStatus,
    IBookingSlot,
    ICustomerOrder,
    ICustomerProfile,
    IFeedback,
    IFeedbackPayload,
    IGetFeedbacks,
    ILoyaltyGuest,
    ILoyaltySettings,
    ILoyaltyTransaction,
    IOnlineBookingPayload,
    IOrderRequest,
    IOrderRequestPayload,
    IPublicMenu,
    IPublicReservation,
    IPublicRestaurant,
    IPublicTable,
    IRegisterPayload,
    IResponse,
    OrderRequestStatus,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** Giai đoạn 13: kênh khách hàng */

// ---- Công khai (không cần đăng nhập; có đăng nhập tài khoản khách thì axios tự gửi token) ----

export const getPublicRestaurants = (): Promise<IResponse<IPublicRestaurant[]>> => unwrap(api.get("/public/restaurants"));
export const getPublicMenu = (restaurantId: number): Promise<IResponse<IPublicMenu>> => unwrap(api.get(`/public/restaurants/${restaurantId}/menu`));
export const getBookingSlots = (restaurantId: number, date: string, guestCount: number): Promise<IResponse<IBookingSlot[]>> =>
    unwrap(api.get(`/public/restaurants/${restaurantId}/slots`, { params: { date, guest_count: guestCount } }));
export const sendBookingOtp = (email: string): Promise<IResponse<{ email: string; expires_in_minutes: number }>> =>
    unwrap(api.post("/public/booking/otp", { email }));
export const createOnlineBooking = (payload: IOnlineBookingPayload): Promise<IResponse<IPublicReservation>> => unwrap(api.post("/public/reservations", payload));
export const lookupBooking = (code: string, phone: string): Promise<IResponse<IPublicReservation>> =>
    unwrap(api.get(`/public/reservations/${encodeURIComponent(code)}`, { params: { phone } }));
export const cancelBookingByCode = (code: string, phone: string, reason?: string): Promise<IResponse<IPublicReservation>> =>
    unwrap(api.post(`/public/reservations/${encodeURIComponent(code)}/cancel`, { phone, reason: reason || null }));

export const getPublicTable = (token: string): Promise<IResponse<IPublicTable>> => unwrap(api.get(`/public/tables/${encodeURIComponent(token)}`));
export const getMyTableRequests = (token: string, clientToken: string): Promise<IResponse<IOrderRequest[]>> =>
    unwrap(api.get(`/public/tables/${encodeURIComponent(token)}/requests`, { params: { client_token: clientToken } }));
export const sendTableRequest = (token: string, payload: IOrderRequestPayload): Promise<IResponse<IOrderRequest>> =>
    unwrap(api.post(`/public/tables/${encodeURIComponent(token)}/requests`, payload));
export const sendTableFeedback = (token: string, orderId: number, payload: IFeedbackPayload): Promise<IResponse<IFeedback>> =>
    unwrap(api.post(`/public/tables/${encodeURIComponent(token)}/feedback`, { order_id: orderId, ...payload }));

export const registerGuest = (payload: IRegisterPayload): Promise<IResponse<unknown>> => unwrap(api.post("/auth/register", payload));

// ---- Tài khoản khách ----

export const getCustomerProfile = (): Promise<IResponse<ICustomerProfile>> => unwrap(api.get("/customer/me"));
export const getCustomerReservations = (): Promise<IResponse<IPublicReservation[]>> => unwrap(api.get("/customer/reservations"));
export const cancelCustomerReservation = (id: number, reason?: string): Promise<IResponse<IPublicReservation>> =>
    unwrap(api.post(`/customer/reservations/${id}/cancel`, { reason: reason || null }));
export const getCustomerOrders = (): Promise<IResponse<ICustomerOrder[]>> => unwrap(api.get("/customer/orders"));
export const sendOrderFeedback = (orderId: number, payload: IFeedbackPayload): Promise<IResponse<IFeedback>> =>
    unwrap(api.post(`/customer/orders/${orderId}/feedback`, payload));
export const getCustomerPoints = (): Promise<IResponse<ILoyaltyTransaction[]>> => unwrap(api.get("/customer/points"));

// ---- Nhân viên ----

const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

export const getOrderRequests = (status?: OrderRequestStatus, restaurantId?: number | null): Promise<IResponse<IOrderRequest[]>> =>
    unwrap(api.get("/order-requests", { params: { ...(status ? { status } : {}), ...scope(restaurantId) } }));
export const acceptOrderRequest = (id: number): Promise<IResponse<IOrderRequest>> => unwrap(api.post(`/order-requests/${id}/accept`));
export const rejectOrderRequest = (id: number, reason?: string): Promise<IResponse<IOrderRequest>> =>
    unwrap(api.post(`/order-requests/${id}/reject`, { reason: reason || null }));
export const rotateTableQr = (tableId: number): Promise<IResponse<{ id: number; qr_token: string }>> => unwrap(api.post(`/order-requests/tables/${tableId}/rotate-qr`));

export const getFeedbacks = (
    query: { from?: string; to?: string; status?: FeedbackStatus; complaint_only?: boolean; max_rating?: number; currentPage?: number; limit?: number },
    restaurantId?: number | null,
): Promise<IResponse<IGetFeedbacks>> => unwrap(api.get("/feedbacks", { params: { ...query, ...scope(restaurantId) } }));
export const replyFeedback = (id: number, payload: { reply?: string | null; status?: FeedbackStatus }): Promise<IResponse<IFeedback>> =>
    unwrap(api.patch(`/feedbacks/${id}`, payload));

export const getLoyaltySettings = (): Promise<IResponse<ILoyaltySettings>> => unwrap(api.get("/loyalty/settings"));
export const updateLoyaltySettings = (payload: Partial<ILoyaltySettings>): Promise<IResponse<ILoyaltySettings>> => unwrap(api.patch("/loyalty/settings", payload));
export const searchLoyaltyGuests = (q: string): Promise<IResponse<ILoyaltyGuest[]>> => unwrap(api.get("/loyalty/guests", { params: { q } }));
export const getLoyaltyGuest = (id: number): Promise<IResponse<ILoyaltyGuest & { transactions: ILoyaltyTransaction[] }>> => unwrap(api.get(`/loyalty/guests/${id}`));
export const adjustLoyaltyPoints = (id: number, points: number, note: string): Promise<IResponse<ILoyaltyGuest>> =>
    unwrap(api.post(`/loyalty/guests/${id}/adjust`, { points, note }));
export const redeemOrderPoints = (
    orderId: number,
    points: number,
): Promise<IResponse<{ order_id: number; points_redeemed: number; points_discount: number; available_points: number }>> =>
    unwrap(api.post(`/loyalty/orders/${orderId}/redeem`, { points }));
/** Thu ngân gắn / gỡ khách của order đang mở (null = gỡ) */
export const attachOrderGuest = (orderId: number, guestUserId: number | null): Promise<IResponse<{ order_id: number; guest_user_id: number | null }>> =>
    unwrap(api.post(`/loyalty/orders/${orderId}/guest`, { guest_user_id: guestUserId }));
