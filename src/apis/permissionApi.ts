import type { IPermission, IResponse, IRoleWithPermissions, IUserPermissions } from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

export const getPermissions = (): Promise<IResponse<IPermission[]>> => unwrap(api.get("/permissions"));

export const getRoles = (): Promise<IResponse<IRoleWithPermissions[]>> => unwrap(api.get("/roles"));

/** Thay thế toàn bộ quyền của role */
export const updateRolePermissions = (
    roleId: number,
    permissions: string[],
): Promise<IResponse<{ role_id: number; permissions: string[] }>> =>
    unwrap(api.put(`/roles/${roleId}/permissions`, { permissions }));

export const getUserPermissions = (userId: number): Promise<IResponse<IUserPermissions>> =>
    unwrap(api.get(`/users/${userId}/permissions`));

/** Thay thế toàn bộ quyền cấp trực tiếp của user */
export const updateUserPermissions = (
    userId: number,
    permissions: string[],
): Promise<IResponse<{ user_id: number; direct_permissions: string[] }>> =>
    unwrap(api.put(`/users/${userId}/permissions`, { permissions }));
