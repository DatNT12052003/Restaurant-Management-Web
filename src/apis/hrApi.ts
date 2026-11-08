import type {
    AdjustmentTypeEnum,
    IAdjustment,
    IAllowance,
    IAttendance,
    IClockResult,
    ICompensation,
    ICreateShiftsPayload,
    IHrSettings,
    ILeaveRequest,
    IManualAttendancePayload,
    IMyHrStatus,
    IPayroll,
    IPayslip,
    IQrToken,
    IResponse,
    IShiftAssignment,
    IShiftSwap,
    IShiftTemplate,
    IShiftTemplatePayload,
    IStaffMember,
    IStaffPerformance,
    IStaffReview,
    IUpdateShiftPayload,
    LeaveStatusEnum,
    LeaveTypeEnum,
    OvertimeStatusEnum,
    PayTypeEnum,
    ShiftSwapStatusEnum,
} from "@/interfaces";
import api from "./axios";
import { unwrap } from "./request";

/** Giai đoạn 12: nhân sự (`/api/hr`). `restaurantId` chỉ admin dùng; người khác luôn là chi nhánh của mình. */
const scope = (restaurantId?: number | null) => (restaurantId ? { restaurant_id: restaurantId } : {});
type Range = { from: string; to: string };

// ---- Của tôi ----

export const getMyHrStatus = (): Promise<IResponse<IMyHrStatus>> => unwrap(api.get("/hr/me/status"));
export const clockWithQr = (token: string): Promise<IResponse<IClockResult>> => unwrap(api.post("/hr/me/clock", { token }));
export const getMyAttendance = (month: string): Promise<IResponse<IAttendance[]>> => unwrap(api.get("/hr/me/attendance", { params: { month } }));
export const getMyShifts = (range: Range): Promise<IResponse<IShiftAssignment[]>> => unwrap(api.get("/hr/me/shifts", { params: range }));
export const getColleagues = (): Promise<IResponse<Pick<IStaffMember, "id" | "full_name" | "roles">[]>> => unwrap(api.get("/hr/me/colleagues"));
export const getColleagueShifts = (userId: number, range: Range): Promise<IResponse<IShiftAssignment[]>> =>
    unwrap(api.get("/hr/me/colleague-shifts", { params: { user_id: userId, ...range } }));
export const getMySwaps = (): Promise<IResponse<IShiftSwap[]>> => unwrap(api.get("/hr/me/swaps"));
export const createSwap = (payload: { assignment_id: number; target_user_id: number; target_assignment_id?: number | null; reason?: string | null }): Promise<IResponse<IShiftSwap>> =>
    unwrap(api.post("/hr/me/swaps", payload));
export const respondSwap = (id: number, action: "accept" | "decline" | "cancel"): Promise<IResponse<IShiftSwap>> => unwrap(api.post(`/hr/me/swaps/${id}/${action}`));
export const getMyLeaves = (): Promise<IResponse<ILeaveRequest[]>> => unwrap(api.get("/hr/me/leaves"));
export const createLeave = (payload: { start_date: string; end_date: string; type: LeaveTypeEnum; reason?: string | null }): Promise<IResponse<ILeaveRequest>> =>
    unwrap(api.post("/hr/me/leaves", payload));
export const cancelLeave = (id: number): Promise<IResponse<ILeaveRequest>> => unwrap(api.post(`/hr/me/leaves/${id}/cancel`));
export const getMyPayslips = (): Promise<IResponse<IPayslip[]>> => unwrap(api.get("/hr/me/payslips"));

// ---- Cấu hình, nhân viên ----

export const getHrSettings = (restaurantId?: number | null): Promise<IResponse<IHrSettings>> => unwrap(api.get("/hr/settings", { params: scope(restaurantId) }));
export const updateHrSettings = (payload: Partial<Omit<IHrSettings, "restaurant_id">>, restaurantId?: number | null): Promise<IResponse<IHrSettings>> =>
    unwrap(api.patch("/hr/settings", { ...payload, ...scope(restaurantId) }));
export const rotateAttendanceQr = (restaurantId?: number | null): Promise<IResponse<{ restaurant_id: number }>> =>
    unwrap(api.post("/hr/settings/rotate-qr", scope(restaurantId)));
export const getHrStaff = (restaurantId?: number | null, includeInactive = false): Promise<IResponse<IStaffMember[]>> =>
    unwrap(api.get("/hr/staff", { params: { ...scope(restaurantId), ...(includeInactive ? { include_inactive: true } : {}) } }));

// ---- Ca mẫu, lịch làm việc, đổi ca ----

export const getShiftTemplates = (restaurantId?: number | null): Promise<IResponse<IShiftTemplate[]>> =>
    unwrap(api.get("/hr/shift-templates", { params: scope(restaurantId) }));
export const createShiftTemplate = (payload: IShiftTemplatePayload): Promise<IResponse<IShiftTemplate>> => unwrap(api.post("/hr/shift-templates", payload));
export const updateShiftTemplate = (id: number, payload: IShiftTemplatePayload): Promise<IResponse<IShiftTemplate>> =>
    unwrap(api.patch(`/hr/shift-templates/${id}`, payload));
export const deleteShiftTemplate = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/hr/shift-templates/${id}`));

export const getShifts = (range: Range & { user_id?: number }, restaurantId?: number | null): Promise<IResponse<IShiftAssignment[]>> =>
    unwrap(api.get("/hr/shifts", { params: { ...range, ...scope(restaurantId) } }));
export const createShifts = (payload: ICreateShiftsPayload): Promise<IResponse<IShiftAssignment[]>> => unwrap(api.post("/hr/shifts", payload));
export const updateShift = (id: number, payload: IUpdateShiftPayload): Promise<IResponse<IShiftAssignment>> => unwrap(api.patch(`/hr/shifts/${id}`, payload));
export const deleteShift = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/hr/shifts/${id}`));
export const copyShiftWeek = (fromWeek: string, toWeek: string, restaurantId?: number | null): Promise<IResponse<{ created: number; skipped: number }>> =>
    unwrap(api.post("/hr/shifts/copy-week", { from_week: fromWeek, to_week: toWeek, ...scope(restaurantId) }));

export const getShiftSwaps = (status?: ShiftSwapStatusEnum, restaurantId?: number | null): Promise<IResponse<IShiftSwap[]>> =>
    unwrap(api.get("/hr/shift-swaps", { params: { ...(status ? { status } : {}), ...scope(restaurantId) } }));
export const decideShiftSwap = (id: number, approve: boolean, note?: string | null): Promise<IResponse<IShiftSwap>> =>
    unwrap(api.post(`/hr/shift-swaps/${id}/${approve ? "approve" : "reject"}`, { note: note || null }));

// ---- Chấm công ----

export const getAttendanceQr = (restaurantId?: number | null): Promise<IResponse<IQrToken>> => unwrap(api.get("/hr/attendance/qr", { params: scope(restaurantId) }));
export const getAttendances = (
    query: Range & { user_id?: number; overtime_status?: OvertimeStatusEnum },
    restaurantId?: number | null,
): Promise<IResponse<IAttendance[]>> => unwrap(api.get("/hr/attendance", { params: { ...query, ...scope(restaurantId) } }));
export const createAttendance = (payload: IManualAttendancePayload): Promise<IResponse<IAttendance>> => unwrap(api.post("/hr/attendance", payload));
export const updateAttendance = (id: number, payload: { clock_in_at?: string; clock_out_at?: string | null; note?: string | null }): Promise<IResponse<IAttendance>> =>
    unwrap(api.patch(`/hr/attendance/${id}`, payload));
export const deleteAttendance = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/hr/attendance/${id}`));
export const decideOvertime = (id: number, approve: boolean): Promise<IResponse<IAttendance>> => unwrap(api.post(`/hr/attendance/${id}/overtime`, { approve }));

// ---- Nghỉ phép ----

export const getLeaves = (query: { status?: LeaveStatusEnum; user_id?: number; from?: string; to?: string }, restaurantId?: number | null): Promise<IResponse<ILeaveRequest[]>> =>
    unwrap(api.get("/hr/leaves", { params: { ...query, ...scope(restaurantId) } }));
export const decideLeave = (id: number, approve: boolean, note?: string | null): Promise<IResponse<ILeaveRequest>> =>
    unwrap(api.post(`/hr/leaves/${id}/${approve ? "approve" : "reject"}`, { note: note || null }));

// ---- Đánh giá, hiệu suất ----

export const getPerformance = (month: string, restaurantId?: number | null): Promise<IResponse<IStaffPerformance[]>> =>
    unwrap(api.get("/hr/performance", { params: { month, ...scope(restaurantId) } }));
export const upsertReview = (payload: { user_id: number; month: string; rating: number; comment?: string | null }, restaurantId?: number | null): Promise<IResponse<IStaffReview>> =>
    unwrap(api.put("/hr/reviews", { ...payload, ...scope(restaurantId) }));

// ---- Lương, phụ cấp, thưởng / phạt, bảng lương ----

export const getCompensations = (userId: number): Promise<IResponse<ICompensation[]>> => unwrap(api.get(`/hr/employees/${userId}/compensations`));
export const createCompensation = (userId: number, payload: { pay_type: PayTypeEnum; amount: number; effective_from: string; note?: string | null }): Promise<IResponse<ICompensation>> =>
    unwrap(api.post(`/hr/employees/${userId}/compensations`, payload));
export const getAllowances = (userId: number): Promise<IResponse<IAllowance[]>> => unwrap(api.get(`/hr/employees/${userId}/allowances`));
export const createAllowance = (userId: number, payload: { name: string; amount: number }): Promise<IResponse<IAllowance>> =>
    unwrap(api.post(`/hr/employees/${userId}/allowances`, payload));
export const updateAllowance = (id: number, payload: { name?: string; amount?: number; status?: "active" | "inactive" }): Promise<IResponse<IAllowance>> =>
    unwrap(api.patch(`/hr/allowances/${id}`, payload));
export const deleteAllowance = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/hr/allowances/${id}`));

export const getAdjustments = (month: string, restaurantId?: number | null, userId?: number): Promise<IResponse<IAdjustment[]>> =>
    unwrap(api.get("/hr/adjustments", { params: { month, ...scope(restaurantId), ...(userId ? { user_id: userId } : {}) } }));
export const createAdjustment = (
    payload: { user_id: number; type: AdjustmentTypeEnum; amount: number; reason: string; effective_date: string },
    restaurantId?: number | null,
): Promise<IResponse<IAdjustment>> => unwrap(api.post("/hr/adjustments", { ...payload, ...scope(restaurantId) }));
export const deleteAdjustment = (id: number): Promise<IResponse<{ id: number }>> => unwrap(api.delete(`/hr/adjustments/${id}`));

export const getPayrolls = (restaurantId?: number | null, year?: number): Promise<IResponse<IPayroll[]>> =>
    unwrap(api.get("/hr/payrolls", { params: { ...scope(restaurantId), ...(year ? { year } : {}) } }));
export const getPayroll = (id: number): Promise<IResponse<IPayroll>> => unwrap(api.get(`/hr/payrolls/${id}`));
export const calculatePayroll = (month: string, restaurantId?: number | null): Promise<IResponse<IPayroll>> =>
    unwrap(api.post("/hr/payrolls/calculate", { month, ...scope(restaurantId) }));
export const finalizePayroll = (id: number): Promise<IResponse<IPayroll>> => unwrap(api.post(`/hr/payrolls/${id}/finalize`));
