import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarPlus, Copy, LayoutTemplate, Pencil, Trash2 } from "lucide-react";

import {
    copyShiftWeek,
    createShifts,
    createShiftTemplate,
    deleteShift,
    deleteShiftTemplate,
    getHrStaff,
    getShifts,
    getShiftTemplates,
    updateShift,
    updateShiftTemplate,
} from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { MultiSelect } from "@/components/common/MultiSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData, usePermission } from "@/hooks";
import type { IShiftAssignment, IShiftTemplate, IStaffMember } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatDayShort, isoToTime, mondayOf, shiftDay, todayStr, weekDays } from "@/lib/hr";
import { cn } from "@/lib/utils";
import { WeekNav } from "./shared";

interface Props {
    restaurantId?: number;
}

/** Lịch làm việc theo tuần của chi nhánh: nhân viên × ngày. Người có `shift.manage` xếp / sửa / xóa ca, quản lý ca mẫu. */
const ScheduleTab = ({ restaurantId }: Props) => {
    const { t, i18n } = useTranslation("admin");
    const canManage = usePermission("shift.manage");
    const [monday, setMonday] = useState(mondayOf(todayStr()));
    const [createOpen, setCreateOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [editing, setEditing] = useState<IShiftAssignment | null>(null);
    const [copyOpen, setCopyOpen] = useState(false);
    const days = weekDays(monday);

    const staffFetcher = useCallback(async () => (await getHrStaff(restaurantId)).data ?? [], [restaurantId]);
    const { data: staff = [] } = useAsyncData(staffFetcher);
    const templatesFetcher = useCallback(async () => (await getShiftTemplates(restaurantId)).data ?? [], [restaurantId]);
    const { data: templates = [], reload: reloadTemplates } = useAsyncData(templatesFetcher);
    const shiftsFetcher = useCallback(async () => {
        try {
            return (await getShifts({ from: monday, to: shiftDay(monday, 6) }, restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [monday, restaurantId]);
    const { data: shifts = [], loading, reload } = useAsyncData(shiftsFetcher);

    // Người có ca trong tuần nhưng không còn trong danh sách đang làm (đã nghỉ / chuyển chi nhánh) vẫn hiện
    const rows: Pick<IStaffMember, "id" | "full_name" | "roles">[] = [
        ...staff,
        ...[...new Map(shifts.filter((s) => !staff.some((m) => m.id === s.user_id)).map((s) => [s.user_id, { id: s.user_id, full_name: s.full_name ?? `#${s.user_id}`, roles: [] }])).values()],
    ];

    const copyWeek = async () => {
        try {
            const res = await copyShiftWeek(shiftDay(monday, -7), monday, restaurantId);
            toast.success(t("hr.schedule.copied", { created: res.data!.created, skipped: res.data!.skipped }));
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <WeekNav monday={monday} onChange={setMonday} />
                {canManage && (
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
                            <LayoutTemplate className="size-4" />
                            {t("hr.template.manage")}
                        </Button>
                        <Button variant="outline" onClick={() => setCopyOpen(true)}>
                            <Copy className="size-4" />
                            {t("hr.schedule.copy_prev_week")}
                        </Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <CalendarPlus className="size-4" />
                            {t("hr.schedule.add")}
                        </Button>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="overflow-x-auto p-0">
                    <Table className="min-w-[56rem]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-44">{t("hr.staff")}</TableHead>
                                {days.map((d) => (
                                    <TableHead key={d} className={cn("text-center", d === todayStr() && "text-primary")}>
                                        {formatDayShort(d, i18n.language)}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {loading ? t("common.loading") : t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {rows.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="align-top">
                                        <p className="font-medium">{m.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{m.roles.map((r) => t(`roles.${r}`)).join(", ")}</p>
                                    </TableCell>
                                    {days.map((d) => {
                                        const list = shifts.filter((s) => s.user_id === m.id && s.work_date === d);
                                        return (
                                            <TableCell key={d} className="p-1 align-top">
                                                <div className="grid gap-1">
                                                    {list.map((s) => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            disabled={!canManage}
                                                            onClick={() => setEditing(s)}
                                                            className={cn(
                                                                "rounded-md border px-1.5 py-1 text-left text-xs transition-colors",
                                                                canManage && "hover:bg-muted",
                                                                s.attendance_id && "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
                                                                s.on_leave && "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
                                                            )}
                                                        >
                                                            <span className="block font-medium tabular-nums">
                                                                {formatTime(s.start_at, i18n.language)}–{formatTime(s.end_at, i18n.language)}
                                                            </span>
                                                            {s.template_name && <span className="block text-muted-foreground">{s.template_name}</span>}
                                                            {s.on_leave && <span className="block text-amber-700 dark:text-amber-300">{t("hr.schedule.on_leave")}</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t("hr.schedule.legend")}</p>

            <CreateShiftsDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                restaurantId={restaurantId}
                staff={staff}
                templates={templates}
                days={days}
                onDone={reload}
            />
            <EditShiftDialog shift={editing} onOpenChange={(v) => !v && setEditing(null)} staff={staff} templates={templates} onDone={reload} />
            <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} restaurantId={restaurantId} templates={templates} onDone={reloadTemplates} />
            <ConfirmDialog
                open={copyOpen}
                onOpenChange={setCopyOpen}
                destructive={false}
                title={t("hr.schedule.copy_prev_week")}
                description={t("hr.schedule.copy_confirm")}
                onConfirm={copyWeek}
            />
        </div>
    );
};

// ---------------------------------------------------------------------------
// Xếp ca hàng loạt
// ---------------------------------------------------------------------------

const TimeFields = ({
    templates,
    template,
    setTemplate,
    start,
    setStart,
    end,
    setEnd,
    breakMinutes,
    setBreakMinutes,
}: {
    templates: IShiftTemplate[];
    template: string;
    setTemplate: (v: string) => void;
    start: string;
    setStart: (v: string) => void;
    end: string;
    setEnd: (v: string) => void;
    breakMinutes: string;
    setBreakMinutes: (v: string) => void;
}) => {
    const { t } = useTranslation("admin");
    const active = templates.filter((x) => x.status === "active");
    return (
        <>
            <div className="grid gap-1.5">
                <Label>{t("hr.template.label")}</Label>
                <Select
                    value={template}
                    onValueChange={(v) => {
                        setTemplate(v);
                        const tpl = templates.find((x) => String(x.id) === v);
                        if (tpl) {
                            setStart(tpl.start_time);
                            setEnd(tpl.end_time);
                            setBreakMinutes(String(tpl.break_minutes));
                        }
                    }}
                >
                    <SelectTrigger className="w-full" aria-label={t("hr.template.label")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="custom">{t("hr.template.custom")}</SelectItem>
                        {active.map((x) => (
                            <SelectItem key={x.id} value={String(x.id)}>
                                {x.name} ({x.start_time}–{x.end_time})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="shift-start">{t("hr.template.start")}</Label>
                    <Input id="shift-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="shift-end">{t("hr.template.end")}</Label>
                    <Input id="shift-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="shift-break">{t("hr.template.break")}</Label>
                    <Input id="shift-break" type="number" min={0} max={480} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
                </div>
            </div>
            {start && end && end <= start && <p className="text-xs text-muted-foreground">{t("hr.template.overnight_hint")}</p>}
        </>
    );
};

/** Giờ gửi lên: ca mẫu thì chỉ gửi phần đã sửa khác ca mẫu */
const timesPayload = (templates: IShiftTemplate[], template: string, start: string, end: string, breakMinutes: string) => {
    const tpl = templates.find((x) => String(x.id) === template);
    if (!tpl) return { shift_template_id: null, start_time: start, end_time: end, break_minutes: Number(breakMinutes) || 0 };
    return {
        shift_template_id: tpl.id,
        ...(start !== tpl.start_time ? { start_time: start } : {}),
        ...(end !== tpl.end_time ? { end_time: end } : {}),
        ...(Number(breakMinutes) !== tpl.break_minutes ? { break_minutes: Number(breakMinutes) || 0 } : {}),
    };
};

const CreateShiftsDialog = ({
    open,
    onOpenChange,
    ...props
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurantId?: number;
    staff: IStaffMember[];
    templates: IShiftTemplate[];
    days: string[];
    onDone: () => void;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">{open && <CreateShiftsBody {...props} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const CreateShiftsBody = ({
    restaurantId,
    staff,
    templates,
    days,
    onDone,
    onClose,
}: {
    restaurantId?: number;
    staff: IStaffMember[];
    templates: IShiftTemplate[];
    days: string[];
    onDone: () => void;
    onClose: () => void;
}) => {
    const { t, i18n } = useTranslation("admin");
    const first = templates.find((x) => x.status === "active");
    const [users, setUsers] = useState<string[]>([]);
    const [dates, setDates] = useState<string[]>([]);
    const [template, setTemplate] = useState(first ? String(first.id) : "custom");
    const [start, setStart] = useState(first?.start_time ?? "08:00");
    const [end, setEnd] = useState(first?.end_time ?? "17:00");
    const [breakMinutes, setBreakMinutes] = useState(String(first?.break_minutes ?? 0));
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await createShifts({
                restaurant_id: restaurantId,
                user_ids: users.map(Number),
                dates,
                ...timesPayload(templates, template, start, end, breakMinutes),
                note: note.trim() || null,
            });
            toast.success(t("hr.schedule.created", { count: res.data?.length ?? 0 }));
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
                <DialogTitle>{t("hr.schedule.add")}</DialogTitle>
                <DialogDescription>{t("hr.schedule.add_hint")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
                <Label>{t("hr.staff")}</Label>
                <MultiSelect
                    options={staff.map((m) => ({ value: String(m.id), label: m.full_name }))}
                    value={users}
                    onChange={setUsers}
                    placeholder={t("hr.schedule.choose_staff")}
                    emptyText={t("common.no_data")}
                />
            </div>
            <div className="grid gap-1.5">
                <Label>{t("hr.schedule.days")}</Label>
                <div className="flex flex-wrap gap-2">
                    {days.map((d) => (
                        <label key={d} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm">
                            <Checkbox checked={dates.includes(d)} onCheckedChange={(v) => setDates((cur) => (v === true ? [...cur, d] : cur.filter((x) => x !== d)))} />
                            {formatDayShort(d, i18n.language)}
                        </label>
                    ))}
                </div>
            </div>
            <TimeFields {...{ templates, template, setTemplate, start, setStart, end, setEnd, breakMinutes, setBreakMinutes }} />
            <div className="grid gap-1.5">
                <Label htmlFor="shift-note">{t("hr.note")}</Label>
                <Input id="shift-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !users.length || !dates.length || !start || !end || start === end}>
                    {busy ? t("common.processing") : t("hr.schedule.create_count", { count: users.length * dates.length })}
                </Button>
            </DialogFooter>
        </form>
    );
};

// ---------------------------------------------------------------------------
// Sửa / xóa một ca
// ---------------------------------------------------------------------------

const EditShiftDialog = ({
    shift,
    onOpenChange,
    ...props
}: {
    shift: IShiftAssignment | null;
    onOpenChange: (open: boolean) => void;
    staff: IStaffMember[];
    templates: IShiftTemplate[];
    onDone: () => void;
}) => (
    <Dialog open={!!shift} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">{shift && <EditShiftBody key={shift.id} shift={shift} {...props} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const EditShiftBody = ({
    shift,
    staff,
    templates,
    onDone,
    onClose,
}: {
    shift: IShiftAssignment;
    staff: IStaffMember[];
    templates: IShiftTemplate[];
    onDone: () => void;
    onClose: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [userId, setUserId] = useState(String(shift.user_id));
    const [date, setDate] = useState(shift.work_date);
    // Ca mẫu đã ngừng dùng / đã xóa: sửa như ca nhập giờ tay
    const [template, setTemplate] = useState(
        templates.some((x) => x.id === shift.shift_template_id && x.status === "active") ? String(shift.shift_template_id) : "custom",
    );
    const [start, setStart] = useState(isoToTime(shift.start_at));
    const [end, setEnd] = useState(isoToTime(shift.end_at));
    const [breakMinutes, setBreakMinutes] = useState(String(shift.break_minutes));
    const [note, setNote] = useState(shift.note ?? "");
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const locked = !!shift.attendance_id;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const tpl = templates.find((x) => String(x.id) === template);
            await updateShift(shift.id, {
                ...(Number(userId) !== shift.user_id ? { user_id: Number(userId) } : {}),
                work_date: date,
                shift_template_id: tpl ? tpl.id : null,
                start_time: start,
                end_time: end,
                break_minutes: Number(breakMinutes) || 0,
                note: note.trim() || null,
            });
            toast.success(t("hr.schedule.updated"));
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        try {
            await deleteShift(shift.id);
            toast.success(t("hr.schedule.deleted"));
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <form onSubmit={save} className="grid gap-4">
            <DialogHeader>
                <DialogTitle>{t("hr.schedule.edit")}</DialogTitle>
                <DialogDescription>{locked ? t("hr.schedule.locked") : shift.full_name}</DialogDescription>
            </DialogHeader>
            <fieldset disabled={locked} className="grid gap-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                        <Label>{t("hr.staff")}</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger className="w-full" aria-label={t("hr.staff")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {!staff.some((m) => m.id === shift.user_id) && <SelectItem value={String(shift.user_id)}>{shift.full_name}</SelectItem>}
                                {staff.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        {m.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="shift-date">{t("hr.schedule.date")}</Label>
                        <Input id="shift-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                </div>
                <TimeFields {...{ templates, template, setTemplate, start, setStart, end, setEnd, breakMinutes, setBreakMinutes }} />
                <div className="grid gap-1.5">
                    <Label htmlFor="shift-edit-note">{t("hr.note")}</Label>
                    <Input id="shift-edit-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
            </fieldset>
            <DialogFooter className="gap-2 sm:justify-between">
                <Button type="button" variant="destructive" disabled={busy || locked} onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="size-4" />
                    {t("common.delete")}
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                        {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={busy || locked || !start || !end || start === end}>
                        {busy ? t("common.processing") : t("common.save")}
                    </Button>
                </div>
            </DialogFooter>
            <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t("hr.schedule.delete_title")} description={t("hr.schedule.delete_desc")} onConfirm={remove} />
        </form>
    );
};

// ---------------------------------------------------------------------------
// Ca mẫu
// ---------------------------------------------------------------------------

const TemplatesDialog = ({
    open,
    onOpenChange,
    restaurantId,
    templates,
    onDone,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurantId?: number;
    templates: IShiftTemplate[];
    onDone: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [editing, setEditing] = useState<IShiftTemplate | "new" | null>(null);
    const [deleting, setDeleting] = useState<IShiftTemplate | null>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("hr.template.title")}</DialogTitle>
                    <DialogDescription>{t("hr.template.hint")}</DialogDescription>
                </DialogHeader>
                {editing ? (
                    <TemplateForm
                        key={editing === "new" ? "new" : editing.id}
                        template={editing === "new" ? null : editing}
                        restaurantId={restaurantId}
                        onDone={() => {
                            setEditing(null);
                            onDone();
                        }}
                        onCancel={() => setEditing(null)}
                    />
                ) : (
                    <>
                        <div className="divide-y rounded-md border">
                            {!templates.length && <p className="p-3 text-sm text-muted-foreground">{t("common.no_data")}</p>}
                            {templates.map((x) => (
                                <div key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                    <div>
                                        <p className={cn("font-medium", x.status === "inactive" && "text-muted-foreground line-through")}>{x.name}</p>
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            {x.start_time}–{x.end_time}
                                            {x.break_minutes > 0 && ` · ${t("hr.template.break_short", { minutes: x.break_minutes })}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" aria-label={t("common.edit")} onClick={() => setEditing(x)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" aria-label={t("common.delete")} onClick={() => setDeleting(x)}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setEditing("new")}>{t("hr.template.add")}</Button>
                        </DialogFooter>
                    </>
                )}
                <ConfirmDialog
                    open={!!deleting}
                    onOpenChange={(v) => !v && setDeleting(null)}
                    title={t("hr.template.delete_title")}
                    description={t("hr.template.delete_desc", { name: deleting?.name })}
                    onConfirm={async () => {
                        try {
                            toast.success((await deleteShiftTemplate(deleting!.id)).message);
                            onDone();
                        } catch (error) {
                            toast.error(getErrorMessage(error));
                            throw error;
                        }
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};

const TemplateForm = ({ template, restaurantId, onDone, onCancel }: { template: IShiftTemplate | null; restaurantId?: number; onDone: () => void; onCancel: () => void }) => {
    const { t } = useTranslation("admin");
    const [name, setName] = useState(template?.name ?? "");
    const [start, setStart] = useState(template?.start_time ?? "08:00");
    const [end, setEnd] = useState(template?.end_time ?? "17:00");
    const [breakMinutes, setBreakMinutes] = useState(String(template?.break_minutes ?? 0));
    const [active, setActive] = useState(template?.status !== "inactive");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload = { name: name.trim(), start_time: start, end_time: end, break_minutes: Number(breakMinutes) || 0, status: active ? ("active" as const) : ("inactive" as const) };
            const res = template ? await updateShiftTemplate(template.id, payload) : await createShiftTemplate({ ...payload, restaurant_id: restaurantId });
            toast.success(res.message);
            onDone();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
                <Label htmlFor="tpl-name">{t("hr.template.name")}</Label>
                <Input id="tpl-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="tpl-start">{t("hr.template.start")}</Label>
                    <Input id="tpl-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="tpl-end">{t("hr.template.end")}</Label>
                    <Input id="tpl-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="tpl-break">{t("hr.template.break")}</Label>
                    <Input id="tpl-break" type="number" min={0} max={480} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
                </div>
            </div>
            {end <= start && <p className="text-xs text-muted-foreground">{t("hr.template.overnight_hint")}</p>}
            <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
                {t("hr.template.active")}
            </label>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !name.trim() || start === end}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default ScheduleTab;
