/** Giai đoạn 12: nhân sự — ca làm, chấm công, nghỉ phép, lương. pg trả numeric dưới dạng chuỗi. */
type Numeric = string | number;

export type PayTypeEnum = "monthly" | "hourly";
export type ShiftSwapStatusEnum = "pending_target" | "pending_approval" | "approved" | "rejected" | "declined" | "cancelled";
export type OvertimeStatusEnum = "none" | "pending" | "approved" | "rejected";
export type LeaveTypeEnum = "paid" | "unpaid";
export type LeaveStatusEnum = "pending" | "approved" | "rejected" | "cancelled";
export type AdjustmentTypeEnum = "bonus" | "penalty";
export type PayrollStatusEnum = "draft" | "finalized";

export interface IHrSettings {
    restaurant_id: number;
    standard_work_days: number;
    standard_hours_per_day: Numeric;
    late_grace_minutes: number;
    early_leave_grace_minutes: number;
    late_penalty_amount: Numeric;
    overtime_threshold_minutes: number;
    overtime_multiplier: Numeric;
    early_clock_in_minutes: number;
}

export interface IStaffMember {
    id: number;
    full_name: string;
    avatar_url: string | null;
    status: string;
    restaurant_id: number;
    roles: string[];
    /** Chỉ có khi người xem có quyền xem lương */
    pay_type?: PayTypeEnum | null;
    pay_amount?: Numeric | null;
}

export interface IShiftTemplate {
    id: number;
    restaurant_id: number;
    name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    status: "active" | "inactive";
}

export interface IShiftTemplatePayload {
    restaurant_id?: number;
    name?: string;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
    status?: "active" | "inactive";
}

export interface IShiftAssignment {
    id: number;
    restaurant_id: number;
    user_id: number;
    full_name?: string;
    shift_template_id: number | null;
    template_name?: string | null;
    work_date: string;
    start_at: string;
    end_at: string;
    break_minutes: number;
    note: string | null;
    attendance_id?: number | null;
    on_leave?: boolean;
}

export interface ICreateShiftsPayload {
    restaurant_id?: number;
    user_ids: number[];
    dates: string[];
    shift_template_id?: number | null;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
    note?: string | null;
}

export interface IUpdateShiftPayload {
    user_id?: number;
    work_date?: string;
    shift_template_id?: number | null;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
    note?: string | null;
}

interface IShiftBrief {
    work_date: string;
    start_at: string;
    end_at: string;
}

export interface IShiftSwap {
    id: number;
    restaurant_id: number;
    assignment_id: number;
    requester_id: number;
    requester_name?: string;
    target_user_id: number;
    target_name?: string;
    target_assignment_id: number | null;
    status: ShiftSwapStatusEnum;
    reason: string | null;
    decided_by_name?: string | null;
    decided_at: string | null;
    decision_note: string | null;
    created_at: string;
    shift?: IShiftBrief | null;
    target_shift?: IShiftBrief | null;
}

export interface IAttendance {
    id: number;
    restaurant_id: number;
    user_id: number;
    full_name?: string;
    assignment_id: number | null;
    work_date: string;
    clock_in_at: string;
    clock_out_at: string | null;
    method: "qr" | "manual";
    late_minutes: number;
    early_leave_minutes: number;
    worked_minutes: number;
    overtime_minutes: number;
    overtime_status: OvertimeStatusEnum;
    note: string | null;
    shift_start_at?: string | null;
    shift_end_at?: string | null;
}

export interface IManualAttendancePayload {
    restaurant_id?: number;
    user_id: number;
    assignment_id?: number | null;
    clock_in_at: string;
    clock_out_at?: string | null;
    note?: string | null;
}

export interface IClockResult {
    action: "clock_in" | "clock_out";
    attendance: IAttendance;
}

export interface IMyHrStatus {
    open_attendance: IAttendance | null;
    next_shift: IShiftAssignment | null;
}

export interface IQrToken {
    restaurant_id: number;
    token: string;
    expires_at: string;
    period_seconds: number;
}

export interface ILeaveRequest {
    id: number;
    restaurant_id: number;
    user_id: number;
    full_name?: string;
    start_date: string;
    end_date: string;
    days: number;
    type: LeaveTypeEnum;
    reason: string | null;
    status: LeaveStatusEnum;
    decided_by_name?: string | null;
    decided_at: string | null;
    decision_note: string | null;
    created_at: string;
}

export interface ICompensation {
    id: number;
    user_id: number;
    pay_type: PayTypeEnum;
    amount: Numeric;
    effective_from: string;
    note: string | null;
    created_by_name?: string | null;
    created_at: string;
}

export interface IAllowance {
    id: number;
    user_id: number;
    name: string;
    amount: Numeric;
    status: "active" | "inactive";
}

export interface IAdjustment {
    id: number;
    restaurant_id: number;
    user_id: number;
    full_name?: string;
    type: AdjustmentTypeEnum;
    amount: Numeric;
    reason: string;
    effective_date: string;
    source: "manual" | "late";
    payroll_id: number | null;
    created_by_name?: string | null;
    created_at: string;
}

export interface IPayrollItem {
    id: number;
    payroll_id: number;
    user_id: number;
    full_name: string;
    pay_type: PayTypeEnum | null;
    rate: Numeric | null;
    work_days: number;
    paid_leave_days: number;
    unpaid_leave_days: number;
    worked_minutes: number;
    overtime_minutes: number;
    late_count: number;
    base_pay: Numeric;
    overtime_pay: Numeric;
    allowance_total: Numeric;
    bonus_total: Numeric;
    penalty_total: Numeric;
    tip_total: Numeric;
    net_pay: Numeric;
    details: {
        rates: { pay_type: PayTypeEnum; amount: number; days: number; minutes: number; base_pay: number }[];
        allowances: { name: string; amount: number }[];
        adjustments: { id: number; type: AdjustmentTypeEnum; amount: number; reason: string; effective_date: string }[];
        missing_rate_days: number;
        pending_overtime_minutes: number;
    };
}

export interface IPayslip extends IPayrollItem {
    period_month: string;
    restaurant_name: string;
    finalized_at: string | null;
}

export interface IPayroll {
    id: number;
    restaurant_id: number;
    restaurant_name?: string;
    period_month: string;
    status: PayrollStatusEnum;
    total_net: Numeric;
    labor_cost: Numeric;
    employee_count: number;
    note: string | null;
    calculated_at: string;
    finalized_by_name?: string | null;
    finalized_at: string | null;
    items?: IPayrollItem[];
}

export interface IStaffReview {
    id: number;
    user_id: number;
    period_month: string;
    rating: number;
    comment: string | null;
    reviewer_name?: string | null;
}

export interface IStaffPerformance {
    user_id: number;
    full_name: string;
    roles: string[];
    scheduled_shifts: number;
    work_days: number;
    worked_minutes: number;
    overtime_minutes: number;
    late_count: number;
    late_minutes: number;
    early_leave_count: number;
    absent_shifts: number;
    leave_days: number;
    orders_served: number;
    tip_total: Numeric;
    bonus_total: Numeric;
    penalty_total: Numeric;
    review: IStaffReview | null;
}
