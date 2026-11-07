import type { IRestaurant, IRestaurantState } from "@/interfaces";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getAllRestaurantsThunk } from "./restaurantThunk";

const STORAGE_KEY = "selected_branch";

const loadBranch = (): IRestaurant | null => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
        return null;
    }
};

const saveBranch = (branch: IRestaurant | null) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
    } catch {
        // bỏ qua khi trình duyệt chặn localStorage
    }
};

const initialState: IRestaurantState & { branches: IRestaurant[]; branchesLoaded: boolean } = {
    currentBranch: loadBranch(),
    branches: [],
    branchesLoaded: false,
};

const restaurantSlice = createSlice({
    name: "restaurant",
    initialState,
    reducers: {
        setCurrentBranch: (state, action: PayloadAction<IRestaurant | null>) => {
            state.currentBranch = action.payload;
            saveBranch(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getAllRestaurantsThunk.fulfilled, (state, action) => {
            state.branches = action.payload.data || [];
            state.branchesLoaded = true;
            // Chi nhánh đang chọn đã bị xóa / không còn trong phạm vi -> bỏ chọn; cập nhật tên nếu đã đổi
            if (state.currentBranch) {
                const fresh = state.branches.find((b) => b.id === state.currentBranch!.id) || null;
                state.currentBranch = fresh;
                saveBranch(fresh);
            }
            // Người chỉ thuộc một nhà hàng: tự chọn luôn
            if (!state.currentBranch && state.branches.length === 1) {
                state.currentBranch = state.branches[0];
                saveBranch(state.currentBranch);
            }
        });
        builder.addCase(getAllRestaurantsThunk.rejected, (state) => {
            state.branchesLoaded = true;
        });
    },
});

export const { setCurrentBranch } = restaurantSlice.actions;
const restaurantReducer = restaurantSlice.reducer;
export default restaurantReducer;
