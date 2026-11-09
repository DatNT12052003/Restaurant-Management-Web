import type { IPagination } from "./common.interface";
import type { IPayment } from "./payment.interface";

/** Giai đoạn 14: chuyển khoản VietQR (xác nhận qua webhook SePay), đối soát, hóa đơn điện tử */

export interface IQrInfo {
    /** Chuỗi VietQR (EMVCo) để vẽ mã QR */
    payload: string;
    bank_bin: string;
    account_no: string;
    account_name: string | null;
    amount: number;
    /** Nội dung chuyển khoản (chứa mã đối soát, khách không được sửa) */
    content: string;
    expires_at: string | null;
}

export interface IQrPayment {
    payment: IPayment;
    qr: IQrInfo;
}

export type GatewayTransactionStatus = "matched" | "unmatched" | "mismatch" | "ignored";

export interface IGatewayTransaction {
    id: number;
    provider: string;
    provider_txn_id: string;
    restaurant_id: number | null;
    restaurant_name?: string | null;
    payment_id: number | null;
    order_id: number | null;
    order_code?: string | null;
    account_number: string | null;
    amount: string;
    content: string | null;
    bank_reference: string | null;
    matched_ref: string | null;
    transaction_at: string | null;
    status: GatewayTransactionStatus;
    note: string | null;
    resolved_by_name?: string | null;
    resolved_at: string | null;
    created_at: string;
}

export interface IGetGatewayTransactions {
    transactions: IGatewayTransaction[];
    pagination: IPagination;
    counts: { unmatched: number; mismatch: number };
}

export type EInvoiceStatus = "pending" | "issued" | "failed" | "cancelled";

export interface IEInvoiceBuyer {
    buyer_type: "individual" | "company";
    buyer_name?: string | null;
    buyer_company?: string | null;
    buyer_tax_code?: string | null;
    buyer_address?: string | null;
    buyer_email?: string | null;
    buyer_phone?: string | null;
}

export interface IEInvoice extends IEInvoiceBuyer {
    id: number;
    order_id: number;
    order_code?: string;
    restaurant_id: number;
    restaurant_name?: string;
    provider: string;
    status: EInvoiceStatus;
    source: "auto" | "manual";
    total: string;
    tax_amount: string;
    series: string | null;
    invoice_no: string | null;
    lookup_code: string | null;
    lookup_url: string | null;
    issued_at: string | null;
    attempts: number;
    next_retry_at: string | null;
    error_message: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    created_by_name?: string | null;
    created_at: string;
}

export interface IGetEInvoices {
    e_invoices: IEInvoice[];
    pagination: IPagination;
}

/** Hóa đơn điện tử còn hiệu lực của order (kèm trong IInvoice) */
export interface IInvoiceEInvoice {
    id: number;
    status: EInvoiceStatus;
    series: string | null;
    invoice_no: string | null;
    lookup_code: string | null;
    lookup_url: string | null;
    error_message: string | null;
}

/** Trang bàn công khai: tiền của order và mã chuyển khoản đang hiệu lực */
export interface IPublicTablePayment {
    total: number;
    paid: number;
    remaining: number;
    transfer_qr_enabled: boolean;
    qr: (IQrInfo & { payment_id: number }) | null;
}
