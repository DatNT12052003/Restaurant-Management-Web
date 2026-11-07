import { createAsyncThunk } from "@reduxjs/toolkit";

import { getAllRestaurants, getRestaurants } from "@/apis";
import type { IGetRestaurants, IResponse, IRestaurant } from "@/interfaces";

export const getRestaurantsThunk = createAsyncThunk<IResponse<IGetRestaurants>>(
    "restaurant/getRestaurants",
    async (_, { rejectWithValue }) => {
        try {
            const response = await getRestaurants();
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);

export const getAllRestaurantsThunk = createAsyncThunk<IResponse<IRestaurant[]>>(
    "restaurant/getAllRestaurants",
    async (_, { rejectWithValue }) => {
        try {
            const response = await getAllRestaurants();
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    },
);
