import { Fragment, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Calculator, ChevronDown, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";

import { calculatePayroll, createAdjustment, deleteAdjustment, finalizePayroll, getAdjustments, getHrStaff, getPayroll, getPayrolls } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData, usePermission } from "@/hooks";
import type { AdjustmentTypeEnum, IStaffMember } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { formatDay, formatMonth, monthBounds, monthStr, STATUS_TONE, todayStr } from "@/lib/hr";
import { MonthInput, PayslipDetail, StatusBadge } from "./shared";

/** Bảng lương theo tháng (tính, xem, chốt) và thưởng / phạt của tháng */
const PayrollTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const canManage = usePermission("payroll.manage");
    const [month, setMonth] = useState(monthStr(-1));
    const [busy, setBusy] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);

    const listFetcher = useCallback(async () => {
        try {
            return (await getPayrolls(restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data: payrolls = [], loading, reload } = useAsyncData(listFetcher);

    const calculate = async () => {
        setBusy(true);
        try {
            const res = await calculatePayroll(month, restaurantId);
            toast.success(res.message);
            reload();
            setOpenId(res.data!.id);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-4">
            <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-base">{t("hr.payroll.title")}</CardTitle>
                    {canManage && (
                        <div className="flex flex-wrap items-center gap-2">
                            <MonthInput value={month} onChange={setMonth} id="payroll-month" />
                            <Button onClick={calculate} disabled={busy}>
                                <Calculator className="size-4" />
                                {busy ? t("common.processing") : t("hr.payroll.calculate")}
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("hr.month")}</TableHead>
                                <TableHead>{t("hr.status")}</TableHead>
                                <TableHead className="text-right">{t("hr.payroll.employees")}</TableHead>
                                <TableHead className="text-right">{t("hr.payroll.total_net")}</TableHead>
                                <TableHead className="text-right">{t("hr.payroll.labor_cost")}</TableHead>
                                <TableHead>{t("hr.payroll.calculated_at")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!payrolls.length && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {loading ? t("common.loading") : t("hr.payroll.none")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {payrolls.map((p) => (
                                <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenId(p.id)}>
                                    <TableCell className="font-medium">
                                        {formatMonth(p.period_month, i18n.language)}
                                        {!restaurantId && <span className="block text-xs text-muted-foreground">{p.restaurant_name}</span>}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge tone={p.status === "finalized" ? STATUS_TONE.ok : STATUS_TONE.pending} label={t(`hr.payroll.status.${p.status}`)} />
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{p.employee_count}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(p.total_net)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(p.labor_cost)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDateTime(p.finalized_at ?? p.calculated_at, i18n.language)}
                                        {p.finalized_by_name && ` · ${p.finalized_by_name}`}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t("hr.payroll.formula")}</p>

            <AdjustmentsCard restaurantId={restaurantId} />

            <PayrollDialog payrollId={openId} onOpenChange={(v) => !v && setOpenId(null)} onChanged={reload} />
        </div>
    );
};

// ---------------------------------------------------------------------------
// Chi tiết bảng lương
// ---------------------------------------------------------------------------

const PayrollDialog = ({ payrollId, onOpenChange, onChanged }: { payrollId: number | null; onOpenChange: (open: boolean) => void; onChanged: () => void }) => (
    <Dialog open={!!payrollId} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">{payrollId && <PayrollBody key={payrollId} payrollId={payrollId} onChanged={onChanged} />}</DialogContent>
    </Dialog>
);

const PayrollBody = ({ payrollId, onChanged }: { payrollId: number; onChanged: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const canManage = usePermission("payroll.manage");
    const [expanded, setExpanded] = useState<number | null>(null);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const fetcher = useCallback(async () => {
        try {
            return (await getPayroll(payrollId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [payrollId]);
    const { data: payroll, loading, reload } = useAsyncData(fetcher);

    if (!payroll) {
        return (
            <DialogHeader>
                <DialogTitle>{t("hr.payroll.title")}</DialogTitle>
                <DialogDescription>{loading ? t("common.loading") : t("common.no_data")}</DialogDescription>
            </DialogHeader>
        );
    }
    const draft = payroll.status === "draft";
    const { to } = monthBounds(payroll.period_month.slice(0, 7));
    const ended = to < todayStr();

    const recalc = async () => {
        setBusy(true);
        try {
            toast.success((await calculatePayroll(payroll.period_month.slice(0, 7), payroll.restaurant_id)).message);
            reload();
            onChanged();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    const finalize = async () => {
        try {
            toast.success((await finalizePayroll(payroll.id)).message);
            reload();
            onChanged();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                    {t("hr.payroll.dialog_title", { month: formatMonth(payroll.period_month, i18n.language), name: payroll.restaurant_name })}
                    <StatusBadge tone={draft ? STATUS_TONE.pending : STATUS_TONE.ok} label={t(`hr.payroll.status.${payroll.status}`)} />
                </DialogTitle>
                <DialogDescription>{draft ? t("hr.payroll.draft_hint") : t("hr.payroll.finalized_hint", { name: payroll.finalized_by_name ?? "—" })}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Summary label={t("hr.payroll.employees")} value={String(payroll.employee_count)} />
                <Summary label={t("hr.payroll.total_net")} value={formatMoney(payroll.total_net)} />
                <Summary label={t("hr.payroll.labor_cost")} value={formatMoney(payroll.labor_cost)} />
            </div>
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("hr.staff")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.days")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.base_pay")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.overtime_pay")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.allowances")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.bonus_penalty")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.tips")}</TableHead>
                            <TableHead className="text-right">{t("hr.payroll.net_pay")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(payroll.items ?? []).map((i) => (
                            <Fragment key={i.id}>
                                <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === i.id ? null : i.id)}>
                                    <TableCell className="font-medium">
                                        <span className="flex items-center gap-1">
                                            {expanded === i.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                            {i.full_name}
                                        </span>
                                        {i.details.missing_rate_days > 0 && <span className="block text-xs text-destructive">{t("hr.payroll.missing_rate_short")}</span>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {i.work_days}
                                        {i.paid_leave_days > 0 && <span className="text-muted-foreground"> +{i.paid_leave_days}</span>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(i.base_pay)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(i.overtime_pay)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(i.allowance_total)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(Number(i.bonus_total) - Number(i.penalty_total))}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(i.tip_total)}</TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums">{formatMoney(i.net_pay)}</TableCell>
                                </TableRow>
                                {expanded === i.id && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="bg-muted/30">
                                            <div className="max-w-xl">
                                                <PayslipDetail item={i} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                        {!payroll.items?.length && (
                            <TableRow>
                                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                                    {t("common.no_data")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {canManage && draft && (
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={recalc} disabled={busy}>
                        <Calculator className="size-4" />
                        {t("hr.payroll.recalculate")}
                    </Button>
                    <Button onClick={() => setConfirm(true)} disabled={busy || !ended} title={!ended ? t("hr.payroll.not_ended") : undefined}>
                        <Lock className="size-4" />
                        {t("hr.payroll.finalize")}
                    </Button>
                </DialogFooter>
            )}
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                destructive={false}
                title={t("hr.payroll.finalize_title")}
                description={t("hr.payroll.finalize_desc")}
                confirmLabel={t("hr.payroll.finalize")}
                onConfirm={finalize}
            />
        </>
    );
};

const Summary = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
);

// ---------------------------------------------------------------------------
// Thưởng / phạt
// ---------------------------------------------------------------------------

const AdjustmentsCard = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const canManage = usePermission("payroll.manage");
    const [month, setMonth] = useState(monthStr());
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const staffFetcher = useCallback(async () => (await getHrStaff(restaurantId)).data ?? [], [restaurantId]);
    const { data: staff = [] } = useAsyncData(staffFetcher);
    const fetcher = useCallback(async () => {
        try {
            return (await getAdjustments(month, restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [month, restaurantId]);
    const { data: rows = [], loading, reload } = useAsyncData(fetcher);

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">{t("hr.adjustment.title")}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <MonthInput value={month} onChange={setMonth} id="adjustment-month" />
                    {canManage && (
                        <Button onClick={() => setCreating(true)}>
                            <Plus className="size-4" />
                            {t("hr.adjustment.add")}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("hr.staff")}</TableHead>
                            <TableHead>{t("hr.adjustment.date")}</TableHead>
                            <TableHead>{t("hr.reason")}</TableHead>
                            <TableHead className="text-right">{t("hr.adjustment.amount")}</TableHead>
                            {canManage && <TableHead />}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!rows.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                                    {loading ? t("common.loading") : t("common.no_data")}
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.full_name}</TableCell>
                                <TableCell className="tabular-nums">{formatDay(a.effective_date, i18n.language)}</TableCell>
                                <TableCell>
                                    {a.reason}
                                    <span className="block text-xs text-muted-foreground">
                                        {a.source === "late" ? t("hr.adjustment.auto_late") : a.created_by_name}
                                        {a.payroll_id && ` · ${t("hr.adjustment.locked")}`}
                                    </span>
                                </TableCell>
                                <TableCell className={a.type === "penalty" ? "text-right text-destructive tabular-nums" : "text-right text-emerald-700 tabular-nums dark:text-emerald-300"}>
                                    {a.type === "penalty" ? "−" : "+"}
                                    {formatMoney(a.amount)}
                                </TableCell>
                                {canManage && (
                                    <TableCell className="text-right">
                                        {!a.payroll_id && (
                                            <Button size="icon" variant="ghost" aria-label={t("common.delete")} onClick={() => setDeleting(a.id)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <AdjustmentDialog open={creating} onOpenChange={setCreating} restaurantId={restaurantId} staff={staff} onDone={reload} />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("hr.adjustment.delete_title")}
                onConfirm={async () => {
                    try {
                        toast.success((await deleteAdjustment(deleting!)).message);
                        reload();
                    } catch (error) {
                        toast.error(getErrorMessage(error));
                        throw error;
                    }
                }}
            />
        </Card>
    );
};

const AdjustmentDialog = ({
    open,
    onOpenChange,
    ...props
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurantId?: number;
    staff: IStaffMember[];
    onDone: () => void;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">{open && <AdjustmentBody {...props} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const AdjustmentBody = ({ restaurantId, staff, onDone, onClose }: { restaurantId?: number; staff: IStaffMember[]; onDone: () => void; onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const [userId, setUserId] = useState("");
    const [type, setType] = useState<AdjustmentTypeEnum>("bonus");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [date, setDate] = useState(todayStr());
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await createAdjustment({ user_id: Number(userId), type, amount: Number(amount), reason: reason.trim(), effective_date: date }, restaurantId);
            toast.success(res.message);
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            <DialogHeader>
                <DialogTitle>{t("hr.adjustment.add")}</DialogTitle>
                <DialogDescription>{t("hr.adjustment.hint")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
                <Label>{t("hr.staff")}</Label>
                <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger className="w-full" aria-label={t("hr.staff")}>
                        <SelectValue placeholder={t("hr.schedule.choose_staff")} />
                    </SelectTrigger>
                    <SelectContent>
                        {staff.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                                {m.full_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                    <Label>{t("hr.adjustment.type_label")}</Label>
                    <Select value={type} onValueChange={(v) => setType(v as AdjustmentTypeEnum)}>
                        <SelectTrigger className="w-full" aria-label={t("hr.adjustment.type_label")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bonus">{t("hr.adjustment.type.bonus")}</SelectItem>
                            <SelectItem value="penalty">{t("hr.adjustment.type.penalty")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="adj-amount">{t("hr.adjustment.amount")}</Label>
                    <Input id="adj-amount" type="number" min={1} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="adj-date">{t("hr.adjustment.date")}</Label>
                <Input id="adj-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="adj-reason">{t("hr.reason")}</Label>
                <Input id="adj-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !userId || !(Number(amount) > 0) || !reason.trim()}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default PayrollTab;
