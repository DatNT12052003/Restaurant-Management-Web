import type { RestaurantStatusEnum } from "@/enum";
import type { IPagination } from "./common.interface";

export interface IRestaurant {
    id: number;
    name: string;
    status: RestaurantStatusEnum;
    address: string;
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
}
