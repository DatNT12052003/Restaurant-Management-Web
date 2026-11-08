import type {
    DiscountStatusEnum,
    DiscountTypeEnum,
    OrderStatusEnum,
    PaymentMethodEnum,
    PaymentStatusEnum,
    PaymentTypeEnum,
} from "@/enum";
import type { IPagination } from "./common.interface";

export interface IDiscount {
    id: number;
    code: string;
    name: string;
    description: string | null;
    /** null = cả chuỗi */
    restaurant_id: number | null;
    restaurant_name?: string | null;
    type: DiscountTypeEnum;
    value: string;
    min_order_value: string;
    max_discount: string | null;
    start_at: string;
    end_at: string | null;
    usage_limit: number | null;
    per_user_limit: number | null;
    used_count: number;
    status: DiscountStatusEnum;
}

export interface IGetDiscounts {
    discounts: IDiscount[];
    pagination: IPagination;
}

export interface IDiscountPayload {
    code?: string;
    name?: string;
    description?: string | null;
    restaurant_id?: number | null;
    type?: DiscountTypeEnum;
    value?: number | string;
    min_order_value?: number | string;
    max_discount?: number | string | null;
    start_at?: string;
    end_at?: string | null;
    usage_limit?: number | string | null;
    per_user_limit?: number | string | null;
    status?: DiscountStatusEnum;
}

export interface IPayment {
    id: number;
    order_id: number;
    restaurant_id: number;
    type: PaymentTypeEnum;
    method: PaymentMethodEnum;
    amount: string;
    status: PaymentStatusEnum;
    received_amount: string | null;
    change_amount: string | null;
    reference: string | null;
    note: string | null;
    refund_of_payment_id: number | null;
    cashier_id: number | null;
    cashier_name?: string | null;
    order_code?: string;
    refunded_amount?: string;
    paid_at: string | null;
    created_at: string;
    /** Tiền tip kèm lần thanh toán (ngoài số tiền hóa đơn) */
    tip_amount?: string;
    tip_staff_id?: number | null;
    tip_staff_name?: string | null;
}

export interface IGetPayments {
    payments: IPayment[];
    pagination: IPagination;
    summary: { collected: string; refunded: string; net: string; tips?: string };
}

export interface IPaymentPayload {
    method: PaymentMethodEnum;
    amount: number;
    received_amount?: number | null;
    reference?: string | null;
    note?: string | null;
    /** false = giao dịch chờ xác nhận (thẻ / chuyển khoản) */
    confirm?: boolean;
    /** Tiền tip (không tính vào hóa đơn); mặc định ghi cho nhân viên phụ trách order */
    tip_amount?: number;
    tip_staff_id?: number | null;
}

export interface IInvoice {
    order: {
        id: number;
        code: string;
        status: OrderStatusEnum;
        guest_count: number;
        created_at: string;
        completed_at: string | null;
        tables: string[];
        staff_name: string | null;
        guest_name: string | null;
    };
    restaurant: { id: number; name: string; address: string };
    lines: { kind: "dish" | "combo"; item_id: number; name: string; unit_price: string; quantity: number; amount: string }[];
    discount: { code: string; name: string; amount: string } | null;
    subtotal: string;
    discount_amount: string;
    service_fee_rate: string;
    service_fee: string;
    tax_rate: string;
    tax: string;
    total: string;
    payments: IPayment[];
    paid: number;
    /** Còn phải thu (âm = thu thừa) */
    remaining: number;
    /** Tổng tip đã nhận */
    tip_total?: number;
}
