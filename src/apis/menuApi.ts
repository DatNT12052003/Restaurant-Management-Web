import type {
    ICombo,
    IComboPayload,
    IDish,
    IDishPayload,
    IGetCombos,
    IGetDishes,
    IGetQuery,
    IResponse,
    IRestaurantMenu,
    ITag,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

// ---- Thẻ ----
export const getTags = (): Promise<IResponse<ITag[]>> => unwrap(api.get("/tags"));
export const createTag = (name: string): Promise<IResponse<ITag>> => unwrap(api.post("/tags", { name }));
export const updateTag = (id: number, name: string): Promise<IResponse<ITag>> =>
    unwrap(api.patch(`/tags/${id}`, { name }));
export const deleteTag = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/tags/${id}`));

// ---- Món ăn ----
/** Lọc theo thẻ: `filters: [{ field: "tag_id", value: [1, 2] }]` */
export const getDishes = (query: IGetQuery = {}): Promise<IResponse<IGetDishes>> =>
    unwrap(api.get("/dishes", { params: query }));
export const createDish = (payload: IDishPayload): Promise<IResponse<IDish>> => unwrap(api.post("/dishes", payload));
export const updateDish = (id: number, payload: IDishPayload): Promise<IResponse<IDish>> =>
    unwrap(api.patch(`/dishes/${id}`, payload));
export const deleteDish = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/dishes/${id}`));

// ---- Combo ----
export const getCombos = (query: IGetQuery = {}): Promise<IResponse<IGetCombos>> =>
    unwrap(api.get("/combos", { params: query }));
export const createCombo = (payload: IComboPayload): Promise<IResponse<ICombo>> => unwrap(api.post("/combos", payload));
export const updateCombo = (id: number, payload: IComboPayload): Promise<IResponse<ICombo>> =>
    unwrap(api.patch(`/combos/${id}`, payload));
export const deleteCombo = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/combos/${id}`));

// ---- Thực đơn chi nhánh ----
export const getRestaurantMenu = (restaurantId: number): Promise<IResponse<IRestaurantMenu>> =>
    unwrap(api.get(`/restaurant-menus/${restaurantId}`));

/** `price: null` = bỏ giá riêng, dùng lại giá gốc */
export const updateRestaurantMenuItem = (
    restaurantId: number,
    kind: "dishes" | "combos",
    itemId: number,
    payload: { is_available?: boolean; price?: number | null },
): Promise<IResponse<IRestaurantMenu>> =>
    unwrap(api.patch(`/restaurant-menus/${restaurantId}/${kind}/${itemId}`, payload));
