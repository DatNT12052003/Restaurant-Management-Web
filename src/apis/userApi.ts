import type {
    IEmployee,
    IEmployeePayload,
    IGetEmployees,
    IGetGuests,
    IGetQuery,
    IGuestPayload,
    IProfileFields,
    IResponse,
    IUser,
} from "@/interfaces";
import api from "./axios";
import { MULTIPART, toFormData, unwrap } from "./request";

// ---- Nhân viên ----

export const getEmployees = (query: IGetQuery = {}): Promise<IResponse<IGetEmployees>> =>
    unwrap(api.get("/users/employees", { params: query }));

export const getEmployeesByRestaurantId = (query: IGetQuery, restaurant_id: number) =>
    getEmployees({ ...query, filters: [...(query.filters || []), { field: "restaurant_id", value: restaurant_id }] });

const employeeForm = ({ avatar, ...payload }: IEmployeePayload) =>
    toFormData({ ...payload, ...(avatar ? { avatar } : {}) } as Record<string, unknown>);

export const createEmployee = (payload: IEmployeePayload): Promise<IResponse<IEmployee>> =>
    unwrap(api.post("/users/employee", employeeForm(payload), MULTIPART));

export const updateEmployee = (id: number, payload: IEmployeePayload): Promise<IResponse<IEmployee>> =>
    unwrap(api.patch(`/users/employee/${id}`, employeeForm(payload), MULTIPART));

export const deleteEmployee = (id: number): Promise<IResponse<IUser>> =>
    unwrap(api.patch(`/users/employee/delete/${id}`));

// ---- Khách hàng ----

export const getGuests = (query: IGetQuery = {}): Promise<IResponse<IGetGuests>> =>
    unwrap(api.get("/users/guests", { params: query }));

const guestForm = ({ avatar, ...payload }: IGuestPayload) =>
    toFormData({ ...payload, ...(avatar ? { avatar } : {}) } as Record<string, unknown>);

export const createGuest = (payload: IGuestPayload): Promise<IResponse<{ user: IUser }>> =>
    unwrap(api.post("/users/guest", guestForm(payload), MULTIPART));

export const updateGuest = (id: number, payload: IGuestPayload): Promise<IResponse<{ user: IUser }>> =>
    unwrap(api.patch(`/users/guest/${id}`, guestForm(payload), MULTIPART));

export const deleteGuest = (id: number): Promise<IResponse<IUser>> => unwrap(api.patch(`/users/guest/delete/${id}`));

// ---- Hồ sơ cá nhân ----

export const updateProfile = (id: number, payload: IProfileFields, avatar?: File | null): Promise<IResponse<IUser>> =>
    unwrap(
        api.patch(
            `/users/${id}`,
            toFormData({ ...payload, ...(avatar ? { avatar } : {}) } as Record<string, unknown>),
            MULTIPART,
        ),
    );
