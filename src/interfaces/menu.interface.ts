import type { DishCategoryEnum, ImageEntityEnum, MenuItemStatusEnum } from "@/enum";
import type { IPagination } from "./common.interface";

export interface ITag {
    id: number;
    name: string;
    dish_count?: number;
}

export interface IDish {
    id: number;
    name: string;
    description: string | null;
    /** numeric từ PostgreSQL -> chuỗi, ví dụ "120000.00" */
    price: string;
    category: DishCategoryEnum;
    status: MenuItemStatusEnum;
    image_url: string | null;
    tags: ITag[];
}

export interface IGetDishes {
    dishes: IDish[];
    pagination: IPagination;
}

export interface IDishPayload {
    name?: string;
    description?: string | null;
    price?: number;
    category?: DishCategoryEnum;
    status?: MenuItemStatusEnum;
    tag_ids?: number[];
}

export interface IComboItem {
    dish_id: number;
    quantity: number;
    name?: string;
    price?: string;
    status?: MenuItemStatusEnum;
}

export interface ICombo {
    id: number;
    name: string;
    description: string | null;
    price: string;
    status: MenuItemStatusEnum;
    image_url: string | null;
    items: IComboItem[];
    /** Tổng giá gốc các món trong combo */
    items_total: string;
}

export interface IGetCombos {
    combos: ICombo[];
    pagination: IPagination;
}

export interface IComboPayload {
    name?: string;
    description?: string | null;
    price?: number;
    status?: MenuItemStatusEnum;
    items?: { dish_id: number; quantity: number }[];
}

export interface IRestaurantMenuItem {
    id: number;
    name: string;
    status: MenuItemStatusEnum;
    category?: DishCategoryEnum;
    image_url: string | null;
    base_price: string;
    /** Giá riêng của chi nhánh; null = giá gốc */
    override_price: string | null;
    /** Giá đang bán */
    price: string;
    is_available: boolean;
}

export interface IRestaurantMenu {
    restaurant_id: number;
    dishes: IRestaurantMenuItem[];
    combos: IRestaurantMenuItem[];
}

export interface IImage {
    id: number;
    url: string;
    entity_type: ImageEntityEnum;
    entity_id: number;
    is_primary: boolean;
    sort_order: number;
}
