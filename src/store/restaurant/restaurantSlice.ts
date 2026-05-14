import type { IRestaurantState } from "@/interfaces";
import { createSlice } from "@reduxjs/toolkit";

const initialState: IRestaurantState = {
    currentBranch: JSON.parse(localStorage.getItem("selected_branch") || "null"),
};

const restaurantSlice = createSlice({
    name: "restaurant",
    initialState,
    reducers: {
        setCurrentBranch: (state, action) => {
            state.currentBranch = action.payload;
            localStorage.setItem("selected_branch", JSON.stringify(action.payload));
        },
    },
    extraReducers: () => {},
});

export const { setCurrentBranch } = restaurantSlice.actions;
const restaurantReducer = restaurantSlice.reducer;
export default restaurantReducer;
