import { getEmployeesByRestaurantId } from "@/apis";
import type { IGetQuery } from "@/interfaces";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const getEmployeesByRestaurantIdThunk = createAsyncThunk(
    "user/getEmployeesByRestaurantId",
    async ({ query, restaurant_id }: { query: IGetQuery; restaurant_id: number }, { rejectWithValue }) => {
        try {
            const response = await getEmployeesByRestaurantId(query, restaurant_id);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);
