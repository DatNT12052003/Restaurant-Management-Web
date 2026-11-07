import type { ReservationStatusEnum, RoomTypeEnum, UsageStatusEnum } from "@/enum";
import type { IPagination } from "./common.interface";

/** Bàn gắn với reservation (kèm thông tin phòng) */
export interface IReservationTable {
    id: number;
    name: string;
    capacity: number;
    status: UsageStatusEnum;
    room_id: number;
    room_name: string;
    room_type: RoomTypeEnum;
}

export interface IReservation {
    id: number;
    restaurant_id: number;
    guest_user_id: number | null;
    contact_name: string;
    contact_phone: string;
    guest_count: number;
    /** ISO 8601 */
    start_time: string;
    end_time: string;
    status: ReservationStatusEnum;
    note: string | null;
    cancel_reason: string | null;
    arrived_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    created_by: number | null;
    created_by_name?: string | null;
    created_at: string;
    tables: IReservationTable[];
    guest?: { id: number; full_name: string; phone_number: string | null; email: string | null } | null;
}

export interface IGetReservations {
    reservations: IReservation[];
    pagination: IPagination;
}

export interface IReservationPayload {
    restaurant_id?: number;
    guest_user_id?: number | null;
    contact_name?: string | null;
    contact_phone?: string | null;
    guest_count?: number;
    start_time?: string;
    end_time?: string;
    note?: string | null;
    /** Chỉ khi tạo: pending | confirmed */
    status?: ReservationStatusEnum;
    table_ids?: number[];
}

export interface IAvailableTablesQuery {
    restaurant_id?: number;
    start_time: string;
    end_time: string;
    guest_count?: number;
    room_type?: RoomTypeEnum;
    exclude_reservation_id?: number;
}

export interface IAvailableTables {
    tables: IReservationTable[];
    suggested_table_ids: number[];
}
