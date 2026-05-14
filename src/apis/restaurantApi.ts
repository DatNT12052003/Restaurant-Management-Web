import type { IGetRestaurants, IResponse, IRestaurant } from "@/interfaces";
import api from "./axios";

export const getRestaurants = async (): Promise<IResponse<IGetRestaurants>> => {
    const response = await api.get<IResponse<IGetRestaurants>>("/restaurants");
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};

export const getAllRestaurants = async (): Promise<IResponse<IRestaurant[]>> => {
    const response = await api.get<IResponse<IRestaurant[]>>("/restaurants/all");
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};
