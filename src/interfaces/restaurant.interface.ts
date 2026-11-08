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
}
