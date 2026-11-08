import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { createAttendance, decideOvertime, deleteAttendance, getAttendances, getHrStaff, getShifts, updateAttendance } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData, usePermission } from "@/hooks";
import type { IAttendance, IStaffMember, OvertimeStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatDay, formatMinutes, isoToLocalInput, localInputToIso, mondayOf, shiftDay, todayStr } from "@/lib/hr";
import { AttendanceFlags } from "../my-work/MyClockTab";

/** Chấm công của chi nhánh: lọc theo ngày / nhân viên / tăng ca chờ duyệt; ghi tay, sửa, xóa, duyệt tăng ca */
const AttendanceTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const canManage = usePermission("attendance.manage");
    const [from, setFrom] = useState(mondayOf(todayStr()));
    const [to, setTo] = useState(todayStr());
    const [userId, setUserId] = useState("all");
    const [overtime, setOvertime] = useState<OvertimeStatusEnum | "all">("all");
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<IAttendance | null>(null);
    const [deleting, setDeleting] = useState<IAttendance | null>(null);

    const staffFetcher = useCallback(async () => (await getHrStaff(restaurantId, true)).data ?? [], [restaurantId]);
    const { data: staff = [] } = useAsyncData(staffFetcher);
    const fetcher = useCallback(async () => {
        if (!from || !to || to < from) return [];
        try {
            return (
                (
                    await getAttendances(
                        { from, to, ...(userId !== "all" ? { user_id: Number(userId) } : {}), ...(overtime !== "all" ? { overtime_status: overtime } : {}) },
                        restaurantId,
                    )
                ).data ?? []
            );
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [from, to, userId, overtime, restaurantId]);
    const { data: records = [], loading, reload } = useAsyncData(fetcher);

    const run = async (action: () => Promise<{ message: string }>) => {
        try {
            toast.success((await action()).message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };
    const totalWorked = records.reduce((s, a) => s + a.worked_minutes, 0);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                    <Label htmlFor="att-from" className="text-xs">
                        {t("hr.from")}
                    </Label>
                    <Input id="att-from" type="date" className="w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="att-to" className="text-xs">
                        {t("hr.to")}
                    </Label>
                    <Input id="att-to" type="date" className="w-40" value={to} min={from} max={shiftDay(from, 61)} onChange={(e) => setTo(e.target.value)} />
                </div>
                <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger className="w-52" aria-label={t("hr.staff")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("hr.all_staff")}</SelectItem>
                        {staff.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                                {m.full_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={overtime} onValueChange={(v) => setOvertime(v as typeof overtime)}>
                    <SelectTrigger className="w-48" aria-label={t("hr.attendance.overtime_filter")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("hr.attendance.all_records")}</SelectItem>
                        {(["pending", "approved", "rejected"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                                {t("hr.attendance.overtime_is", { status: t(`hr.overtime_status.${s}`) })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {canManage && (
                    <Button className="ml-auto" onClick={() => setCreating(true)}>
                        <Plus className="size-4" />
                        {t("hr.attendance.add_manual")}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="overflow-x-auto p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("hr.staff")}</TableHead>
                                <TableHead>{t("hr.attendance.date")}</TableHead>
                                <TableHead>{t("hr.attendance.shift")}</TableHead>
                                <TableHead>{t("hr.attendance.in_out")}</TableHead>
                                <TableHead className="text-right">{t("hr.attendance.worked")}</TableHead>
                                <TableHead>{t("hr.attendance.notes")}</TableHead>
                                {canManage && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!records.length && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {loading ? t("common.loading") : t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {records.map((a) => (
                                <TableRow key={a.id}>
                                    <TableCell className="font-medium">{a.full_name}</TableCell>
                                    <TableCell className="tabular-nums">{formatDay(a.work_date, i18n.language)}</TableCell>
                                    <TableCell className="tabular-nums text-muted-foreground">
                                        {a.shift_start_at && a.shift_end_at ? `${formatTime(a.shift_start_at, i18n.language)}–${formatTime(a.shift_end_at, i18n.language)}` : "—"}
                                    </TableCell>
                                    <TableCell className="tabular-nums">
                                        {formatTime(a.clock_in_at, i18n.language)} – {a.clock_out_at ? formatTime(a.clock_out_at, i18n.language) : t("hr.attendance.still_in")}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{a.clock_out_at ? formatMinutes(a.worked_minutes) : "—"}</TableCell>
                                    <TableCell>
                                        <AttendanceFlags a={a} />
                                        {a.note && <p className="mt-1 text-xs text-muted-foreground">{a.note}</p>}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {a.overtime_status === "pending" && (
                                                    <>
                                                        <Button size="icon" variant="ghost" aria-label={t("hr.attendance.approve_ot")} title={t("hr.attendance.approve_ot")} onClick={() => run(() => decideOvertime(a.id, true)).catch(() => undefined)}>
                                                            <Check className="size-4 text-emerald-600" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" aria-label={t("hr.attendance.reject_ot")} title={t("hr.attendance.reject_ot")} onClick={() => run(() => decideOvertime(a.id, false)).catch(() => undefined)}>
                                                            <X className="size-4 text-destructive" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button size="icon" variant="ghost" aria-label={t("common.edit")} onClick={() => setEditing(a)}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" aria-label={t("common.delete")} onClick={() => setDeleting(a)}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {!!records.length && <p className="text-sm text-muted-foreground">{t("hr.attendance.total", { count: records.length, hours: formatMinutes(totalWorked) })}</p>}

            <ManualDialog open={creating} onOpenChange={setCreating} restaurantId={restaurantId} staff={staff.filter((m) => m.status === "active")} onDone={reload} />
            <EditDialog record={editing} onOpenChange={(v) => !v && setEditing(null)} onDone={reload} />
            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("hr.attendance.delete_title")}
                description={t("hr.attendance.delete_desc", { name: deleting?.full_name })}
                onConfirm={() => run(() => deleteAttendance(deleting!.id))}
            />
        </div>
    );
};

const ManualDialog = ({
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
        <DialogContent className="sm:max-w-md">{open && <ManualBody {...props} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const ManualBody = ({ restaurantId, staff, onDone, onClose }: { restaurantId?: number; staff: IStaffMember[]; onDone: () => void; onClose: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [userId, setUserId] = useState("");
    const [date, setDate] = useState(todayStr());
    const [shiftId, setShiftId] = useState("none");
    const [clockIn, setClockIn] = useState("");
    const [clockOut, setClockOut] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const shiftsFetcher = useCallback(async () => {
        if (!userId || !date) return [];
        return ((await getShifts({ from: date, to: date, user_id: Number(userId) }, restaurantId)).data ?? []).filter((s) => !s.attendance_id);
    }, [userId, date, restaurantId]);
    const { data: shifts = [] } = useAsyncData(shiftsFetcher);

    const pickShift = (v: string) => {
        setShiftId(v);
        const s = shifts.find((x) => String(x.id) === v);
        if (s) {
            setClockIn(isoToLocalInput(s.start_at));
            setClockOut(isoToLocalInput(s.end_at));
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await createAttendance({
                restaurant_id: restaurantId,
                user_id: Number(userId),
                assignment_id: shiftId === "none" ? null : Number(shiftId),
                clock_in_at: localInputToIso(clockIn)!,
                clock_out_at: localInputToIso(clockOut),
                note: note.trim() || null,
            });
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
                <DialogTitle>{t("hr.attendance.add_manual")}</DialogTitle>
                <DialogDescription>{t("hr.attendance.manual_hint")}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                    <Label>{t("hr.staff")}</Label>
                    <Select
                        value={userId}
                        onValueChange={(v) => {
                            setUserId(v);
                            setShiftId("none");
                        }}
                    >
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
                <div className="grid gap-1.5">
                    <Label htmlFor="manual-date">{t("hr.attendance.date")}</Label>
                    <Input
                        id="manual-date"
                        type="date"
                        value={date}
                        max={todayStr()}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setShiftId("none");
                        }}
                    />
                </div>
            </div>
            <div className="grid gap-1.5">
                <Label>{t("hr.attendance.shift")}</Label>
                <Select value={shiftId} onValueChange={pickShift} disabled={!userId}>
                    <SelectTrigger className="w-full" aria-label={t("hr.attendance.shift")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t("hr.attendance.no_shift_option")}</SelectItem>
                        {shifts.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                                {formatTime(s.start_at, i18n.language)}–{formatTime(s.end_at, i18n.language)}
                                {s.template_name && ` · ${s.template_name}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="manual-in">{t("hr.attendance.clock_in")}</Label>
                    <Input id="manual-in" type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="manual-out">{t("hr.attendance.clock_out")}</Label>
                    <Input id="manual-out" type="datetime-local" value={clockOut} min={clockIn} onChange={(e) => setClockOut(e.target.value)} />
                </div>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="manual-note">{t("hr.note")}</Label>
                <Input id="manual-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("hr.attendance.note_placeholder")} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !userId || !clockIn || (!!clockOut && clockOut <= clockIn)}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

const EditDialog = ({ record, onOpenChange, onDone }: { record: IAttendance | null; onOpenChange: (open: boolean) => void; onDone: () => void }) => (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">{record && <EditBody key={record.id} record={record} onDone={onDone} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const EditBody = ({ record, onDone, onClose }: { record: IAttendance; onDone: () => void; onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const [clockIn, setClockIn] = useState(isoToLocalInput(record.clock_in_at));
    const [clockOut, setClockOut] = useState(record.clock_out_at ? isoToLocalInput(record.clock_out_at) : "");
    const [note, setNote] = useState(record.note ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await updateAttendance(record.id, { clock_in_at: localInputToIso(clockIn)!, clock_out_at: localInputToIso(clockOut), note: note.trim() || null });
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
                <DialogTitle>{t("hr.attendance.edit_title")}</DialogTitle>
                <DialogDescription>{t("hr.attendance.edit_hint", { name: record.full_name })}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="edit-in">{t("hr.attendance.clock_in")}</Label>
                    <Input id="edit-in" type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="edit-out">{t("hr.attendance.clock_out")}</Label>
                    <Input id="edit-out" type="datetime-local" value={clockOut} min={clockIn} onChange={(e) => setClockOut(e.target.value)} />
                </div>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="edit-note">{t("hr.note")}</Label>
                <Input id="edit-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !clockIn || (!!clockOut && clockOut <= clockIn)}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default AttendanceTab;
