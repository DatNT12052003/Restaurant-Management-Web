import type { IClosedDay, IDishRecipe, IMenuCosts, IRecipePayload, IResponse } from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** `restaurantId`: chỉ admin dùng (bỏ trống = giá vốn trung bình cả chuỗi); người khác luôn là chi nhánh của mình */
const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

/** Bảng giá vốn lý thuyết của mọi món và combo */
export const getMenuCosts = (restaurantId?: number | null): Promise<IResponse<IMenuCosts>> =>
    unwrap(api.get("/recipes", { params: scope(restaurantId) }));

export const getRecipe = (dishId: number, restaurantId?: number | null): Promise<IResponse<IDishRecipe>> =>
    unwrap(api.get(`/recipes/dishes/${dishId}`, { params: scope(restaurantId) }));

/** Thay toàn bộ định lượng của món (dùng chung cả chuỗi) */
export const updateRecipe = (dishId: number, payload: IRecipePayload): Promise<IResponse<IDishRecipe>> =>
    unwrap(api.put(`/recipes/dishes/${dishId}`, payload));

// ---- Ngày nghỉ của chi nhánh ----

export const getClosedDays = (restaurantId: number, range: { from?: string; to?: string } = {}): Promise<IResponse<IClosedDay[]>> =>
    unwrap(api.get(`/restaurants/${restaurantId}/closed-days`, { params: range }));

export const createClosedDay = (restaurantId: number, day: string, note?: string | null): Promise<IResponse<IClosedDay>> =>
    unwrap(api.post(`/restaurants/${restaurantId}/closed-days`, { day, note: note || null }));

export const deleteClosedDay = (restaurantId: number, day: string): Promise<IResponse<{ day: string }>> =>
    unwrap(api.delete(`/restaurants/${restaurantId}/closed-days/${day}`));
