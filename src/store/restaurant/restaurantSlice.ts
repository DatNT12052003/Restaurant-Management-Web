import type { IRestaurant, IRestaurantState } from "@/interfaces";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "selected_branch";

const loadBranch = (): IRestaurant | null => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
        return null;
    }
};

const initialState: IRestaurantState = {
    currentBranch: loadBranch(),
};

const restaurantSlice = createSlice({
    name: "restaurant",
    initialState,
    reducers: {
        setCurrentBranch: (state, action: PayloadAction<IRestaurant | null>) => {
            state.currentBranch = action.payload;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
            } catch {
                // bỏ qua khi trình duyệt chặn localStorage
            }
        },
    },
});

export const { setCurrentBranch } = restaurantSlice.actions;
const restaurantReducer = restaurantSlice.reducer;
export default restaurantReducer;
