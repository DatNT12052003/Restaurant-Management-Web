import type { IGetEmployees, IGetQuery, IResponse } from "@/interfaces";
import api from "./axios";

export const getEmployeesByRestaurantId = async (
    query: IGetQuery,
    restaurant_id: number,
): Promise<IResponse<IGetEmployees>> => {
    const response = await api.get<IResponse<IGetEmployees>>(`/users/employees/${restaurant_id}`, { params: query });
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data;
};
