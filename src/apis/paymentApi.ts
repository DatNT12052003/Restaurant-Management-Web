import type {
    IEInvoice,
    IEInvoiceBuyer,
    IGatewayTransaction,
    IGetEInvoices,
    IGetGatewayTransactions,
    IQrPayment,
    IDiscount,
    IDiscountPayload,
    IGetDiscounts,
    IGetPayments,
    IGetQuery,
    IInvoice,
    IPayment,
    IPaymentPayload,
    IResponse,
} from "@/interfaces";
import type { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from "@/enum";
import api from "./axios";
import { unwrap } from "./request";

const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

// ---- Mã giảm giá ----

export const getDiscounts = (query: IGetQuery = {}, restaurantId?: number | null): Promise<IResponse<IGetDiscounts>> =>
    unwrap(api.get("/discounts", { params: { ...query, ...scope(restaurantId) } }));

export const createDiscount = (payload: IDiscountPayload): Promise<IResponse<IDiscount>> =>
    unwrap(api.post("/discounts", payload));

export const updateDiscount = (id: number, payload: IDiscountPayload): Promise<IResponse<IDiscount>> =>
    unwrap(api.patch(`/discounts/${id}`, payload));

export const deleteDiscount = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/discounts/${id}`));

export const applyOrderDiscount = (orderId: number, code: string): Promise<IResponse<{ order_id: number }>> =>
    unwrap(api.post(`/orders/${orderId}/discount`, { code }));

export const removeOrderDiscount = (orderId: number): Promise<IResponse<{ order_id: number }>> =>
    unwrap(api.delete(`/orders/${orderId}/discount`));

// ---- Thanh toán ----

export const getInvoice = (orderId: number): Promise<IResponse<IInvoice>> => unwrap(api.get(`/orders/${orderId}/invoice`));

export const createPayment = (orderId: number, payload: IPaymentPayload): Promise<IResponse<IPayment>> =>
    unwrap(api.post(`/orders/${orderId}/payments`, payload));

export const confirmPayment = (id: number): Promise<IResponse<IPayment>> => unwrap(api.post(`/payments/${id}/confirm`));
export const cancelPayment = (id: number): Promise<IResponse<IPayment>> => unwrap(api.post(`/payments/${id}/cancel`));
export const failPayment = (id: number): Promise<IResponse<IPayment>> => unwrap(api.post(`/payments/${id}/fail`));

export const refundPayment = (id: number, amount: number, reason: string): Promise<IResponse<IPayment>> =>
    unwrap(api.post(`/payments/${id}/refund`, { amount, reason }));

export const getPayments = (
    query: IGetQuery & {
        from?: string;
        to?: string;
        method?: PaymentMethodEnum;
        status?: PaymentStatusEnum;
        type?: PaymentTypeEnum;
        order_id?: number;
    } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetPayments>> => unwrap(api.get("/payments", { params: { ...query, ...scope(restaurantId) } }));

// ---- Giai đoạn 14: chuyển khoản VietQR, đối soát, hóa đơn điện tử ----

/** Tạo (hoặc dùng lại) mã QR chuyển khoản; bỏ trống số tiền = toàn bộ số còn phải thu */
export const createQrPayment = (orderId: number, amount?: number): Promise<IResponse<IQrPayment>> =>
    unwrap(api.post(`/orders/${orderId}/payments/qr`, amount ? { amount } : {}));

export const getGatewayTransactions = (
    query: IGetQuery & { status?: string; from?: string; to?: string } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetGatewayTransactions>> =>
    unwrap(api.get("/payment-gateway/transactions", { params: { ...query, ...scope(restaurantId) } }));

export const applyGatewayTransaction = (id: number, orderId: number): Promise<IResponse<IGatewayTransaction>> =>
    unwrap(api.post(`/payment-gateway/transactions/${id}/apply`, { order_id: orderId }));

export const ignoreGatewayTransaction = (id: number, note?: string): Promise<IResponse<IGatewayTransaction>> =>
    unwrap(api.post(`/payment-gateway/transactions/${id}/ignore`, note ? { note } : {}));

export const issueEInvoice = (orderId: number, buyer: IEInvoiceBuyer): Promise<IResponse<IEInvoice>> =>
    unwrap(api.post(`/orders/${orderId}/e-invoice`, buyer));

export const getEInvoices = (
    query: IGetQuery & { status?: string; from?: string; to?: string; order_id?: number } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetEInvoices>> => unwrap(api.get("/e-invoices", { params: { ...query, ...scope(restaurantId) } }));

export const retryEInvoice = (id: number): Promise<IResponse<IEInvoice>> => unwrap(api.post(`/e-invoices/${id}/retry`));

export const cancelEInvoice = (id: number, reason: string): Promise<IResponse<IEInvoice>> =>
    unwrap(api.post(`/e-invoices/${id}/cancel`, { reason }));
