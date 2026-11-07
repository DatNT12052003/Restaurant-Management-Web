import type { IResponse, IRoom, IRoomPayload, ITable, ITablePayload } from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** `restaurantId`: chỉ admin dùng để lọc; người bị giới hạn nhà hàng luôn nhận nhà hàng của mình. */
export const getAllRooms = (restaurantId?: number | null): Promise<IResponse<IRoom[]>> =>
    unwrap(api.get("/rooms/all", { params: restaurantId ? { restaurant_id: restaurantId } : {} }));

export const createRoom = (payload: IRoomPayload): Promise<IResponse<IRoom>> => unwrap(api.post("/rooms", payload));

export const updateRoom = (id: number, payload: IRoomPayload): Promise<IResponse<IRoom>> =>
    unwrap(api.patch(`/rooms/${id}`, payload));

export const deleteRoom = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/rooms/${id}`));

export const getAllTables = (restaurantId?: number | null): Promise<IResponse<ITable[]>> =>
    unwrap(api.get("/tables/all", { params: restaurantId ? { restaurant_id: restaurantId } : {} }));

export const createTable = (payload: ITablePayload): Promise<IResponse<ITable>> => unwrap(api.post("/tables", payload));

/** Cũng dùng để đổi trạng thái bàn: `updateTable(id, { status })` */
export const updateTable = (id: number, payload: ITablePayload): Promise<IResponse<ITable>> =>
    unwrap(api.patch(`/tables/${id}`, payload));

export const deleteTable = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/tables/${id}`));
