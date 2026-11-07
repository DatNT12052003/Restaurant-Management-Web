import type { IGetQuery, IGetRestaurants, IResponse, IRestaurant, IRestaurantPayload } from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

export const getRestaurants = (query: IGetQuery = {}): Promise<IResponse<IGetRestaurants>> =>
    unwrap(api.get("/restaurants", { params: query }));

/** Danh sách rút gọn cho bộ chọn chi nhánh (người không phải admin chỉ nhận nhà hàng của mình). */
export const getAllRestaurants = (): Promise<IResponse<IRestaurant[]>> => unwrap(api.get("/restaurants/all"));

export const createRestaurant = (payload: IRestaurantPayload): Promise<IResponse<IRestaurant>> =>
    unwrap(api.post("/restaurants", payload));

export const updateRestaurant = (id: number, payload: Partial<IRestaurantPayload>): Promise<IResponse<IRestaurant>> =>
    unwrap(api.patch(`/restaurants/${id}`, payload));

export const deleteRestaurant = (id: number): Promise<IResponse<{ id: number }>> =>
    unwrap(api.delete(`/restaurants/${id}`));
