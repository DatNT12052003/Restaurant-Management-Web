import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

import { createOrder, getReservationSchedule } from "@/apis";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData, usePermission } from "@/hooks";
import type { IOrderDetail, ITable } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatTime, startOfDay, toDateInput } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { IFreeTable } from "./OrderSheet";

interface OpenOrderDialogProps {
    table: ITable | null;
    freeTables: IFreeTable[];
    /** Admin: chi nhánh đang chọn */
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onOpened: (order: IOrderDetail) => void;
}

/** Mở order cho một bàn trống: khách vãng lai, hoặc theo đặt bàn hôm nay có giữ bàn này */
export const OpenOrderDialog = ({ table, onOpenChange, ...props }: OpenOrderDialogProps) => (
    <Dialog open={!!table} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
            {table && <Body key={table.id} table={table} {...props} onClose={() => onOpenChange(false)} />}
        </DialogContent>
    </Dialog>
);

const Body = ({
    table,
    freeTables,
    restaurantId,
    onClose,
    onOpened,
}: Omit<OpenOrderDialogProps, "table" | "onOpenChange"> & { table: ITable; onClose: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const canSeeReservations = usePermission("reservation.view");
    const [guestCount, setGuestCount] = useState(String(Math.min(table.capacity, 2)));
    const [extra, setExtra] = useState<number[]>([]);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    // Đặt bàn hôm nay (chưa đến) có giữ bàn này
    const fetcher = useCallback(async () => {
        if (!canSeeReservations) return [];
        const from = startOfDay(toDateInput(new Date()));
        const res = await getReservationSchedule(from.toISOString(), addDays(from, 1).toISOString(), restaurantId).catch(
            () => null,
        );
        return (res?.data || []).filter(
            (r) => ["pending", "confirmed"].includes(r.status) && r.tables.some((tb) => tb.id === table.id),
        );
    }, [canSeeReservations, restaurantId, table.id]);
    const { data: reservations } = useAsyncData(fetcher);

    const open = async (payload: Parameters<typeof createOrder>[0]) => {
        setBusy(true);
        try {
            const res = await createOrder({ ...payload, restaurant_id: restaurantId });
            toast.success(res.message);
            onOpened(res.data!);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        open({ table_ids: [table.id, ...extra], guest_count: Number(guestCount) || 1, note: note.trim() || null });
    };

    const others = freeTables.filter((tb) => tb.id !== table.id);
    const seats = table.capacity + others.filter((tb) => extra.includes(tb.id)).reduce((s, tb) => s + tb.capacity, 0);

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t("order.open_title", { name: table.name })}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                {(reservations?.length ?? 0) > 0 && (
                    <div className="grid gap-2 rounded-md border border-dashed p-3">
                        <p className="text-sm font-medium">{t("order.from_reservation")}</p>
                        {reservations!.map((r) => (
                            <Button
                                key={r.id}
                                type="button"
                                variant="outline"
                                className="h-auto justify-start py-2 text-left"
                                disabled={busy}
                                onClick={() => open({ reservation_id: r.id })}
                            >
                                <CalendarClock className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {formatTime(r.start_time, i18n.language)} · {r.contact_name} · {t("reservation.guests", { count: r.guest_count })}
                                </span>
                            </Button>
                        ))}
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="open-guests">{t("reservation.guest_count")} *</Label>
                    <Input
                        id="open-guests"
                        type="number"
                        min={1}
                        max={500}
                        required
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                    />
                    {Number(guestCount) > seats && (
                        <p className="text-xs text-amber-600">{t("order.seats_warning", { seats })}</p>
                    )}
                </div>

                {others.length > 0 && (
                    <div className="grid gap-2">
                        <Label>{t("order.extra_tables")}</Label>
                        <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
                            {others.map((tb) => (
                                <label
                                    key={tb.id}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent",
                                        extra.includes(tb.id) && "border-primary bg-primary/10",
                                    )}
                                >
                                    <Checkbox
                                        checked={extra.includes(tb.id)}
                                        onCheckedChange={(v) =>
                                            setExtra((prev) => (v === true ? [...prev, tb.id] : prev.filter((x) => x !== tb.id)))
                                        }
                                    />
                                    <span className="truncate">
                                        {tb.name} ({tb.capacity})
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="open-note">{t("order.note")}</Label>
                    <Textarea id="open-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy}>
                    {busy ? t("common.processing") : t("order.open")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default OpenOrderDialog;
