import type { RoomTypeEnum, UsageStatusEnum } from "@/enum";
import type { IPagination } from "./common.interface";

export interface IRoom {
    id: number;
    name: string;
    type: RoomTypeEnum;
    description: string | null;
    status: UsageStatusEnum;
    /** false = phòng tạm khóa */
    is_active: boolean;
    restaurant_id: number;
    table_count?: number;
}

export interface IGetRooms {
    rooms: IRoom[];
    pagination: IPagination;
}

export interface IRoomPayload {
    name?: string;
    type?: RoomTypeEnum;
    description?: string | null;
    status?: UsageStatusEnum;
    is_active?: boolean;
    restaurant_id?: number;
}

export interface ITable {
    id: number;
    name: string;
    status: UsageStatusEnum;
    capacity: number;
    room_id: number;
    restaurant_id?: number;
}

export interface ITablePayload {
    name?: string;
    status?: UsageStatusEnum;
    capacity?: number;
    room_id?: number;
}
