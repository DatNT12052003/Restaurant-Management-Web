import type { IGetEmployees, IGetQuery, IResponse } from "@/interfaces";
import api from "./axios";

export const getEmployeesByRestaurantId = async (
    query: IGetQuery,
    restaurant_id: number,
): Promise<IResponse<IGetEmployees>> => {
    const params: IGetQuery = {
        ...query,
        filters: [...(query.filters || []), { field: "restaurant_id", value: restaurant_id }],
    };
    const response = await api.get<IResponse<IGetEmployees>>("/users/employees", { params });
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};
