import type { RestaurantStatusEnum } from "@/enum";
import type { IPagination } from "./common.interface";

export interface IRestaurant {
    id: number;
    name: string;
    status: RestaurantStatusEnum;
    address: string;
    /** Phí dịch vụ / thuế (%) áp cho order mới */
    service_fee_percent?: string;
    tax_percent?: string;
    /** Giờ mở / đóng cửa ("HH:mm:ss"), dùng tính tỷ lệ lấp đầy bàn */
    open_time?: string;
    close_time?: string;
    /** Giữ bàn trước giờ hẹn / tự đánh dấu không đến sau số phút trễ (0 = tắt) */
    reservation_hold_minutes?: number;
    no_show_after_minutes?: number;
    /** Giai đoạn 13: kênh khách hàng */
    phone?: string | null;
    online_booking_enabled?: boolean;
    online_booking_minutes?: number;
    online_booking_lead_minutes?: number;
    online_booking_max_days?: number;
    online_booking_max_guests?: number;
    qr_ordering_enabled?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface IGetRestaurants {
    restaurants: IRestaurant[];
    pagination: IPagination;
}

export interface IRestaurantState {
    currentBranch: IRestaurant | null;
}

export interface IRestaurantPayload {
    name: string;
    address: string;
    status?: RestaurantStatusEnum;
    service_fee_percent?: number | string;
    tax_percent?: number | string;
    open_time?: string;
    close_time?: string;
    reservation_hold_minutes?: number | string;
    no_show_after_minutes?: number | string;
    phone?: string | null;
    online_booking_enabled?: boolean;
    online_booking_minutes?: number | string;
    online_booking_lead_minutes?: number | string;
    online_booking_max_days?: number | string;
    online_booking_max_guests?: number | string;
    qr_ordering_enabled?: boolean;
}
