import type { OrderLineKind } from "./order.interface";

/** Một nguyên liệu trong định lượng món (cho 1 phần) */
export interface IRecipeItem {
    ingredient_id: number;
    name: string;
    unit: string;
    quantity: string;
    /** Giá vốn bình quân hiện tại (theo chi nhánh đang xem) */
    unit_cost: string;
    cost: string;
    ingredient_status: string;
}

export interface IDishRecipe {
    dish_id: number;
    name: string;
    price: string;
    items: IRecipeItem[];
    cost: number;
    food_cost_rate: number | null;
}

export interface IRecipePayload {
    items: { ingredient_id: number; quantity: number }[];
}

export interface IMenuCostRow {
    kind: OrderLineKind;
    id: number;
    name: string;
    category: "food" | "drink" | "combo";
    status: string;
    price: number;
    /** null = chưa có định lượng */
    cost: number | null;
    margin: number | null;
    food_cost_rate: number | null;
    ingredient_count: number;
}

export interface IMenuCosts {
    restaurant_id: number | null;
    items: IMenuCostRow[];
    summary: { items: number; missing_recipe: number; avg_food_cost_rate: number | null };
}

/** Ngày nghỉ của chi nhánh */
export interface IClosedDay {
    restaurant_id: number;
    /** YYYY-MM-DD */
    day: string;
    note: string | null;
    created_by_name?: string | null;
    created_at: string;
}
