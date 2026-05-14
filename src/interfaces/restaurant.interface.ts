import type { RestaurantStatusEnum } from "@/types";
import type { IPagination } from "./common.interface";

export interface IRestaurant {
    id: number;
    name: string;
    status: RestaurantStatusEnum;
    address: string;
    // created_at: string;
    // updated_at: string;
    // deleted_at: string | null;
}

export interface IGetRestaurants {
    restaurants: Partial<IRestaurant>[];
    pagination: IPagination;
}

export interface IRestaurantState {
    currentBranch: IRestaurant | null;
}
