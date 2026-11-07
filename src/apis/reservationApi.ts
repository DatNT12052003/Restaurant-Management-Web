import type {
    IAvailableTables,
    IAvailableTablesQuery,
    IGetQuery,
    IGetReservations,
    IReservation,
    IReservationPayload,
    IResponse,
} from "@/interfaces";
import type { ReservationStatusEnum } from "@/enum";
import api from "./axios";
import { unwrap } from "./request";

/** `restaurantId`: chỉ admin dùng; người bị giới hạn nhà hàng luôn nhận nhà hàng của mình. */
const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});

/** Danh sách có phân trang. `from`/`to` (ISO): lấy reservation có thời gian giao với khoảng này. */
export const getReservations = (
    query: IGetQuery & { from?: string; to?: string; table_id?: number } = {},
    restaurantId?: number | null,
): Promise<IResponse<IGetReservations>> =>
    unwrap(api.get("/reservations", { params: { ...query, ...scope(restaurantId) } }));

/** Mọi reservation giao với [from, to) (tối đa 31 ngày), không phân trang — dùng cho lịch theo ngày */
export const getReservationSchedule = (
    from: string,
    to: string,
    restaurantId?: number | null,
): Promise<IResponse<IReservation[]>> =>
    unwrap(api.get("/reservations/schedule", { params: { from, to, ...scope(restaurantId) } }));

export const getAvailableTables = (query: IAvailableTablesQuery): Promise<IResponse<IAvailableTables>> =>
    unwrap(api.get("/reservations/available-tables", { params: query }));

export const getReservation = (id: number): Promise<IResponse<IReservation>> => unwrap(api.get(`/reservations/${id}`));

export const createReservation = (payload: IReservationPayload): Promise<IResponse<IReservation>> =>
    unwrap(api.post("/reservations", payload));

export const updateReservation = (id: number, payload: IReservationPayload): Promise<IResponse<IReservation>> =>
    unwrap(api.patch(`/reservations/${id}`, payload));

export const updateReservationStatus = (
    id: number,
    status: ReservationStatusEnum,
    cancel_reason?: string | null,
): Promise<IResponse<IReservation>> => unwrap(api.patch(`/reservations/${id}/status`, { status, cancel_reason }));

export const deleteReservation = (id: number): Promise<IResponse<{ id: number }>> =>
    unwrap(api.delete(`/reservations/${id}`));
