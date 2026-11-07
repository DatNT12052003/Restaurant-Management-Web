import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Sparkles, UserRound, Users, X } from "lucide-react";

import { createReservation, getAvailableTables, getGuests, updateReservation } from "@/apis";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ROOM_TYPES } from "@/constants/roles";
import { DEFAULT_RESERVATION_MINUTES, MAX_RESERVATION_HOURS } from "@/constants/reservation";
import type { RoomTypeEnum } from "@/enum";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IReservation, IReservationPayload, IReservationTable } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addMinutes, combineDateTime, toDateInput, toTimeInput } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export interface IReservationFormDefaults {
    date: string;
    start?: string;
    tableId?: number;
}

interface ReservationFormDialogProps {
    open: boolean;
    /** null = tạo mới */
    reservation: IReservation | null;
    defaults: IReservationFormDefaults;
    /** Admin: chi nhánh đang chọn; người khác: undefined (backend tự giới hạn) */
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onSaved: (reservation: IReservation) => void;
}

/** Hộp thoại tạo / sửa đặt bàn. Nội dung được mount lại mỗi lần mở để khởi tạo state từ props. */
export const ReservationFormDialog = ({ open, onOpenChange, ...props }: ReservationFormDialogProps) => {
    const [saving, setSaving] = useState(false);
    return (
        <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
                {open && (
                    <FormBody
                        key={props.reservation?.id ?? "new"}
                        {...props}
                        saving={saving}
                        setSaving={setSaving}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

interface FormBodyProps extends Omit<ReservationFormDialogProps, "open" | "onOpenChange"> {
    saving: boolean;
    setSaving: (v: boolean) => void;
    onClose: () => void;
}

interface IGuestPick {
    id: number;
    full_name: string;
    phone_number: string | null;
}

const initialTimes = (reservation: IReservation | null, defaults: IReservationFormDefaults) => {
    if (reservation) {
        const start = new Date(reservation.start_time);
        return { date: toDateInput(start), start: toTimeInput(start), end: toTimeInput(new Date(reservation.end_time)) };
    }
    // Mặc định: giờ tròn kế tiếp (nếu là hôm nay) hoặc 18:00
    let start = defaults.start;
    if (!start) {
        const now = new Date();
        start = defaults.date === toDateInput(now) ? `${String(Math.min(now.getHours() + 1, 22)).padStart(2, "0")}:00` : "18:00";
    }
    const startDate = combineDateTime(defaults.date, start)!;
    return { date: defaults.date, start, end: toTimeInput(addMinutes(startDate, DEFAULT_RESERVATION_MINUTES)) };
};

const FormBody = ({ reservation, defaults, restaurantId, saving, setSaving, onClose, onSaved }: FormBodyProps) => {
    const { t } = useTranslation("admin");
    const canSearchGuests = usePermission("guest.view");
    const isEdit = !!reservation;

    const times = initialTimes(reservation, defaults);
    const [date, setDate] = useState(times.date);
    const [start, setStart] = useState(times.start);
    const [end, setEnd] = useState(times.end);
    const [guestCount, setGuestCount] = useState(String(reservation?.guest_count ?? 2));
    const [roomType, setRoomType] = useState<RoomTypeEnum | "all">("all");
    const [contactName, setContactName] = useState(reservation?.contact_name ?? "");
    const [contactPhone, setContactPhone] = useState(reservation?.contact_phone ?? "");
    const [note, setNote] = useState(reservation?.note ?? "");
    const [confirmNow, setConfirmNow] = useState(false);
    const [guest, setGuest] = useState<IGuestPick | null>(
        reservation?.guest
            ? { id: reservation.guest.id, full_name: reservation.guest.full_name, phone_number: reservation.guest.phone_number }
            : null,
    );
    const [tableIds, setTableIds] = useState<number[]>(
        reservation ? reservation.tables.map((tb) => tb.id) : defaults.tableId ? [defaults.tableId] : [],
    );
    const [guestSearch, setGuestSearch] = useState("");
    const debouncedGuestSearch = useDebounce(guestSearch.trim(), 400);

    // Ngày kết thúc: nếu giờ kết thúc <= giờ bắt đầu thì hiểu là qua ngày hôm sau (ví dụ 22:00 -> 01:00)
    const range = useMemo(() => {
        const s = combineDateTime(date, start);
        let e = combineDateTime(date, end);
        if (!s || !e) return null;
        if (e.getTime() <= s.getTime()) e = new Date(e.getTime() + 24 * 60 * 60 * 1000);
        if (e.getTime() - s.getTime() > MAX_RESERVATION_HOURS * 60 * 60 * 1000) return null;
        return { start: s, end: e };
    }, [date, start, end]);
    const count = Number(guestCount) || 0;

    // ---- Bàn trống trong khung giờ ----
    const excludeId = reservation?.id;
    const availabilityFetcher = useCallback(async () => {
        if (!range) return null;
        try {
            const res = await getAvailableTables({
                restaurant_id: restaurantId,
                start_time: range.start.toISOString(),
                end_time: range.end.toISOString(),
                guest_count: count > 0 ? count : undefined,
                room_type: roomType === "all" ? undefined : roomType,
                exclude_reservation_id: excludeId,
            });
            return res.data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [range, count, roomType, restaurantId, excludeId]);
    const { data: availability, loading: loadingTables } = useAsyncData(availabilityFetcher);
    const available = useMemo(() => availability?.tables ?? [], [availability]);
    const availableIds = useMemo(() => new Set(available.map((tb) => tb.id)), [available]);

    // Bàn đã chọn nhưng không còn trống trong khung giờ mới (hoặc bị lọc theo loại phòng) thì không gửi đi
    const selected = useMemo(
        () => (availability ? tableIds.filter((id) => availableIds.has(id)) : tableIds),
        [availability, tableIds, availableIds],
    );
    const droppedCount = tableIds.length - selected.length;
    const seats = available.filter((tb) => selected.includes(tb.id)).reduce((sum, tb) => sum + tb.capacity, 0);

    const groups = useMemo(() => {
        const map = new Map<number, { name: string; type: RoomTypeEnum; tables: IReservationTable[] }>();
        available.forEach((tb) => {
            const g = map.get(tb.room_id) ?? { name: tb.room_name, type: tb.room_type, tables: [] };
            g.tables.push(tb);
            map.set(tb.room_id, g);
        });
        return [...map.values()].map((g) => ({
            ...g,
            tables: g.tables.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        }));
    }, [available]);

    const toggleTable = (id: number, checked: boolean) =>
        setTableIds((prev) => (checked ? [...new Set([...prev.filter((x) => availableIds.has(x)), id])] : prev.filter((x) => x !== id)));

    // ---- Tìm khách có tài khoản ----
    const guestFetcher = useCallback(async () => {
        if (!canSearchGuests || debouncedGuestSearch.length < 2) return [];
        const res = await getGuests({
            search: { text: debouncedGuestSearch, fields: ["full_name", "phone_number", "email"] },
            limit: 5,
        }).catch(() => null);
        return res?.data?.guests ?? [];
    }, [canSearchGuests, debouncedGuestSearch]);
    const { data: guestResults } = useAsyncData(guestFetcher);

    const pickGuest = (g: IGuestPick) => {
        setGuest(g);
        setGuestSearch("");
        if (!contactName) setContactName(g.full_name);
        if (!contactPhone && g.phone_number) setContactPhone(g.phone_number);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!range) return toast.error(t("reservation.form.invalid_time", { max: MAX_RESERVATION_HOURS }));
        if (count < 1) return toast.error(t("reservation.form.invalid_guest_count"));
        if (selected.length === 0) return toast.error(t("reservation.form.tables_required"));

        const payload: IReservationPayload = {
            guest_user_id: guest?.id ?? null,
            contact_name: contactName.trim() || null,
            contact_phone: contactPhone.trim() || null,
            guest_count: count,
            start_time: range.start.toISOString(),
            end_time: range.end.toISOString(),
            note: note.trim() || null,
            table_ids: selected,
        };
        setSaving(true);
        try {
            const res = reservation
                ? await updateReservation(reservation.id, payload)
                : await createReservation({
                      ...payload,
                      restaurant_id: restaurantId,
                      status: confirmNow ? "confirmed" : "pending",
                  });
            toast.success(res.message);
            onSaved(res.data!);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{isEdit ? t("reservation.edit") : t("reservation.create")}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-5 py-4 md:grid-cols-2">
                {/* Cột trái: thời gian, khách */}
                <div className="grid content-start gap-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="rs-date">{t("reservation.form.date")} *</Label>
                            <Input id="rs-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rs-start">{t("reservation.form.start")} *</Label>
                            <Input id="rs-start" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rs-end">{t("reservation.form.end")} *</Label>
                            <Input id="rs-end" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
                        </div>
                    </div>
                    {range && range.end.getDate() !== range.start.getDate() && (
                        <p className="-mt-2 text-xs text-muted-foreground">{t("reservation.form.next_day")}</p>
                    )}
                    {!range && (
                        <p className="-mt-2 text-xs text-destructive">
                            {t("reservation.form.invalid_time", { max: MAX_RESERVATION_HOURS })}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-2">
                            <Label htmlFor="rs-guests">{t("reservation.guest_count")} *</Label>
                            <Input
                                id="rs-guests"
                                type="number"
                                min={1}
                                max={500}
                                required
                                value={guestCount}
                                onChange={(e) => setGuestCount(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("room.type")}</Label>
                            <Select value={roomType} onValueChange={(v) => setRoomType(v as RoomTypeEnum | "all")}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("reservation.form.all_room_types")}</SelectItem>
                                    {ROOM_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {t(`status.room_type.${type}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {canSearchGuests && (
                        <div className="grid gap-2">
                            <Label htmlFor="rs-guest-search">{t("reservation.form.guest_account")}</Label>
                            {guest ? (
                                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                    <span className="flex items-center gap-2">
                                        <UserRound className="h-4 w-4" />
                                        {guest.full_name}
                                        {guest.phone_number && (
                                            <span className="text-muted-foreground">· {guest.phone_number}</span>
                                        )}
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => setGuest(null)}
                                        aria-label={t("reservation.form.unlink_guest")}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        id="rs-guest-search"
                                        placeholder={t("reservation.form.guest_search_placeholder")}
                                        value={guestSearch}
                                        onChange={(e) => setGuestSearch(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {guestSearch.trim().length >= 2 && (guestResults?.length ?? 0) > 0 && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                                            {guestResults!.map((g) => (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                                                    onClick={() => pickGuest(g)}
                                                >
                                                    <span>{g.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {[g.phone_number, g.email].filter(Boolean).join(" · ")}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">{t("reservation.form.guest_account_hint")}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-2">
                            <Label htmlFor="rs-name">{t("reservation.contact_name")}{!guest && " *"}</Label>
                            <Input
                                id="rs-name"
                                required={!guest}
                                maxLength={255}
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rs-phone">{t("reservation.contact_phone")}{!guest?.phone_number && " *"}</Label>
                            <Input
                                id="rs-phone"
                                type="tel"
                                required={!guest?.phone_number}
                                maxLength={20}
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="rs-note">{t("reservation.note")}</Label>
                        <Textarea
                            id="rs-note"
                            rows={3}
                            maxLength={2000}
                            placeholder={t("reservation.form.note_placeholder")}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {!isEdit && (
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={confirmNow} onCheckedChange={(v) => setConfirmNow(v === true)} />
                            {t("reservation.form.confirm_now")}
                        </label>
                    )}
                </div>

                {/* Cột phải: chọn bàn */}
                <div className="grid content-start gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <Label>{t("reservation.form.tables")} *</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!availability?.suggested_table_ids.length}
                            onClick={() => setTableIds(availability!.suggested_table_ids)}
                        >
                            <Sparkles className="h-4 w-4" />
                            {t("reservation.form.use_suggestion")}
                        </Button>
                    </div>
                    <div
                        className={cn(
                            "rounded-md border px-3 py-2 text-sm",
                            selected.length > 0 && seats < count && "border-destructive text-destructive",
                        )}
                    >
                        {t("reservation.form.selected_summary", { tables: selected.length, seats, guests: count })}
                    </div>
                    {droppedCount > 0 && (
                        <p className="text-xs text-amber-600">{t("reservation.form.tables_dropped", { count: droppedCount })}</p>
                    )}

                    <div className="max-h-[420px] overflow-y-auto rounded-md border p-2">
                        {!range ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t("reservation.form.pick_time_first")}</p>
                        ) : loadingTables && !availability ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
                        ) : groups.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t("reservation.form.no_free_tables")}</p>
                        ) : (
                            groups.map((g) => (
                                <div key={g.name + g.type} className="mb-3 last:mb-0">
                                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                        {g.name} · {t(`status.room_type.${g.type}`)}
                                    </p>
                                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                                        {g.tables.map((tb) => {
                                            const checked = selected.includes(tb.id);
                                            const suggested = availability?.suggested_table_ids.includes(tb.id);
                                            return (
                                                <label
                                                    key={tb.id}
                                                    className={cn(
                                                        "flex cursor-pointer flex-col gap-0.5 rounded-md border px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                                                        checked && "border-primary bg-primary/10",
                                                        !checked && suggested && "border-dashed border-primary/60",
                                                    )}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(v) => toggleTable(tb.id, v === true)}
                                                        />
                                                        <span className="truncate font-medium">{tb.name}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Users className="h-3 w-3" />
                                                        {tb.capacity}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("reservation.form.tables_hint")}</p>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default ReservationFormDialog;
