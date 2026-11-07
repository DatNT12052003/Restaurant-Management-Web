import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarClock, ClipboardList, Pencil, Phone, StickyNote, Trash2, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { deleteReservation, updateReservationStatus } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    EDITABLE_RESERVATION_STATUSES,
    RESERVATION_STATUS_STYLE,
    RESERVATION_TRANSITIONS,
} from "@/constants/reservation";
import type { ReservationStatusEnum } from "@/enum";
import { useNow, usePermission } from "@/hooks";
import type { IReservation } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime, formatTime } from "@/lib/datetime";

/** Trạng thái cần nhập lý do */
const NEEDS_REASON: ReservationStatusEnum[] = ["cancelled", "no_show"];

export const ReservationStatusBadge = ({ status }: { status: ReservationStatusEnum }) => {
    const { t } = useTranslation("admin");
    return (
        <Badge variant="outline" className={RESERVATION_STATUS_STYLE[status]}>
            {t(`status.reservation.${status}`)}
        </Badge>
    );
};

interface ReservationDetailDialogProps {
    reservation: IReservation | null;
    onOpenChange: (open: boolean) => void;
    onEdit: (reservation: IReservation) => void;
    /** Gọi sau khi đổi trạng thái / xóa thành công */
    onChanged: (reservation: IReservation | null) => void;
}

export const ReservationDetailDialog = ({ reservation, onOpenChange, onEdit, onChanged }: ReservationDetailDialogProps) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const now = useNow();
    const [busy, setBusy] = useState(false);
    const [reasonFor, setReasonFor] = useState<ReservationStatusEnum | null>(null);
    const [reason, setReason] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const changeStatus = async (status: ReservationStatusEnum, cancelReason?: string) => {
        if (!reservation) return;
        setBusy(true);
        try {
            const res = await updateReservationStatus(reservation.id, status, cancelReason || null);
            toast.success(res.message);
            setReasonFor(null);
            onChanged(res.data ?? null);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const onAction = (status: ReservationStatusEnum) => {
        if (NEEDS_REASON.includes(status)) {
            setReason("");
            setReasonFor(status);
        } else {
            changeStatus(status);
        }
    };

    const remove = async () => {
        if (!reservation) return;
        try {
            const res = await deleteReservation(reservation.id);
            toast.success(res.message);
            onChanged(null);
            onOpenChange(false);
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    const r = reservation;
    const actions = r && can("reservation.update") ? RESERVATION_TRANSITIONS[r.status] : [];
    const startPassed = r ? new Date(r.start_time).getTime() <= now : false;
    const seats = r ? r.tables.reduce((sum, tb) => sum + tb.capacity, 0) : 0;

    return (
        <>
            <Dialog open={!!r && !reasonFor} onOpenChange={(v) => !busy && onOpenChange(v)}>
                <DialogContent className="sm:max-w-lg">
                    {r && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 pr-6">
                                    {r.contact_name}
                                    <ReservationStatusBadge status={r.status} />
                                </DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-3 text-sm">
                                <p className="flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                                    {formatDateTime(r.start_time, i18n.language)} – {formatTime(r.end_time, i18n.language)}
                                </p>
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <a className="hover:underline" href={`tel:${r.contact_phone}`}>
                                        {r.contact_phone}
                                    </a>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    {t("reservation.guests", { count: r.guest_count })} ·{" "}
                                    {t("reservation.seats_total", { count: seats })}
                                </p>
                                {r.guest && (
                                    <p className="flex items-center gap-2">
                                        <UserRound className="h-4 w-4 text-muted-foreground" />
                                        {t("reservation.linked_guest", { name: r.guest.full_name })}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {r.tables.map((tb) => (
                                        <Badge key={tb.id} variant="secondary">
                                            {tb.room_name} · {tb.name} ({tb.capacity})
                                        </Badge>
                                    ))}
                                </div>
                                {r.note && (
                                    <p className="flex items-start gap-2 whitespace-pre-wrap">
                                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                        {r.note}
                                    </p>
                                )}
                                {r.order && (
                                    <p className="flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                        {can("order.view") ? (
                                            <Link className="font-medium hover:underline" to="/admin/orders">
                                                {t("reservation.order_link", { code: r.order.code })}
                                            </Link>
                                        ) : (
                                            t("reservation.order_link", { code: r.order.code })
                                        )}
                                    </p>
                                )}
                                {r.cancel_reason && (
                                    <p className="rounded-md bg-muted px-3 py-2">
                                        {t("reservation.cancel_reason")}: {r.cancel_reason}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {t("reservation.created_info", {
                                        name: r.created_by_name || "—",
                                        time: formatDateTime(r.created_at, i18n.language),
                                    })}
                                </p>
                            </div>

                            {actions.length > 0 && (
                                <div className="flex flex-wrap gap-2 border-t pt-4">
                                    {actions.map((status) => (
                                        <Button
                                            key={status}
                                            size="sm"
                                            variant={NEEDS_REASON.includes(status) ? "outline" : "default"}
                                            disabled={busy || (status === "no_show" && !startPassed)}
                                            title={status === "no_show" && !startPassed ? t("reservation.no_show_hint") : undefined}
                                            onClick={() => onAction(status)}
                                        >
                                            {t(`reservation.action.${status}`)}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            <DialogFooter className="gap-2 sm:justify-between">
                                <div className="flex gap-2">
                                    {can("reservation.update") && EDITABLE_RESERVATION_STATUSES.includes(r.status) && (
                                        <Button variant="outline" size="sm" onClick={() => onEdit(r)} disabled={busy}>
                                            <Pencil className="h-4 w-4" />
                                            {t("common.edit")}
                                        </Button>
                                    )}
                                    {can("reservation.delete") && r.status !== "arrived" && (
                                        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            {t("common.delete")}
                                        </Button>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
                                    {t("common.close")}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Lý do hủy / không đến */}
            <Dialog open={!!reasonFor} onOpenChange={(v) => !busy && !v && setReasonFor(null)}>
                <DialogContent className="sm:max-w-md">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (reasonFor) changeStatus(reasonFor, reason.trim());
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{reasonFor && t(`reservation.action.${reasonFor}`)}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-2 py-4">
                            <Label htmlFor="rs-reason">{t("reservation.cancel_reason")}</Label>
                            <Textarea
                                id="rs-reason"
                                rows={3}
                                maxLength={1000}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t("reservation.cancel_reason_placeholder")}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReasonFor(null)} disabled={busy}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={busy}>
                                {busy ? t("common.processing") : t("common.confirm")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t("reservation.delete_title")}
                description={r ? t("reservation.delete_desc", { name: r.contact_name }) : undefined}
                onConfirm={remove}
            />
        </>
    );
};

export default ReservationDetailDialog;
