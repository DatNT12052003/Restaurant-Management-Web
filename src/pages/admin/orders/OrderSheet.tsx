import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRightLeft, Ban, CheckCheck, CircleCheck, Pencil, Plus, Users, UtensilsCrossed, X } from "lucide-react";

import {
    addOrderTables,
    cancelOrder,
    completeOrder,
    getOrder,
    releaseOrderTable,
    transferOrderTable,
    updateOrder,
    updateOrderLineStatus,
} from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ReasonDialog from "@/components/common/ReasonDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ITEM_STATUS_STYLE, OPEN_ORDER_STATUSES, ORDER_STATUS_STYLE, canMoveLine } from "@/constants/order";
import { useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { IOrderDetail, IOrderLine } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import RoundDialog from "./RoundDialog";

/** Bàn có thể ghép / chuyển tới (không thuộc order mở nào, phòng đang hoạt động) */
export interface IFreeTable {
    id: number;
    name: string;
    capacity: number;
    room_name: string;
}

interface OrderSheetProps {
    orderId: number | null;
    freeTables: IFreeTable[];
    onOpenChange: (open: boolean) => void;
    /** Gọi sau mỗi thay đổi để trang cha tải lại sơ đồ */
    onChanged: () => void;
}

export const OrderSheet = ({ orderId, freeTables, onOpenChange, onChanged }: OrderSheetProps) => (
    <Sheet open={!!orderId} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
            {orderId && <Body key={orderId} orderId={orderId} freeTables={freeTables} onChanged={onChanged} />}
        </SheetContent>
    </Sheet>
);

type TableDialog = { mode: "add" } | { mode: "transfer"; from: number } | null;

const Body = ({ orderId, freeTables, onChanged }: { orderId: number; freeTables: IFreeTable[]; onChanged: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();

    const fetcher = useCallback(async () => {
        try {
            return (await getOrder(orderId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [orderId]);
    const { data: order, loading, reload } = useAsyncData(fetcher);
    useRealtime(["order:updated", "order:round_sent", "order_item:status_changed", "payment:changed"], reload);

    const [busy, setBusy] = useState(false);
    const [roundOpen, setRoundOpen] = useState(false);
    const [tableDialog, setTableDialog] = useState<TableDialog>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [cancelLine, setCancelLine] = useState<IOrderLine | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);

    /** Chạy thao tác, báo kết quả, tải lại; ném lỗi tiếp để dialog không tự đóng */
    const run = async (action: () => Promise<{ message: string }>, silent = false) => {
        setBusy(true);
        try {
            const res = await action();
            if (!silent) toast.success(res.message);
            reload();
            onChanged();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        } finally {
            setBusy(false);
        }
    };

    if (loading && !order) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
    if (!order) return <p className="p-6 text-muted-foreground">{t("order.not_found")}</p>;

    const isOpen = OPEN_ORDER_STATUSES.includes(order.status);
    const canEdit = isOpen && can("order.update");
    const lines = order.rounds.flatMap((r) => r.lines);
    const readyLines = lines.filter((l) => l.status === "ready");
    const unfinished = lines.filter((l) => ["pending", "confirmed", "cooking", "ready"].includes(l.status)).length;
    // Giai đoạn 5: hoàn tất cần thu đủ tiền (thường do thu ngân, order tự hoàn tất khi thu đủ)
    const unpaid = Number(order.total) - Number(order.paid_amount ?? 0) > 0;

    const serveAllReady = async () => {
        setBusy(true);
        try {
            for (const l of readyLines) await updateOrderLineStatus(l.kind, l.id, "served");
            toast.success(t("order.served_all", { count: readyLines.length }));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
            reload();
            onChanged();
        }
    };

    return (
        <>
            <SheetHeader className="border-b">
                <SheetTitle className="flex flex-wrap items-center gap-2 pr-8">
                    {order.code}
                    <Badge variant="outline" className={ORDER_STATUS_STYLE[order.status]}>
                        {t(`status.order.${order.status}`)}
                    </Badge>
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    {order.tables.map((tb) => (
                        <Badge key={tb.id} variant="secondary" className="gap-1">
                            {tb.name} · {tb.room_name}
                            {canEdit && order.tables.length > 1 && (
                                <button
                                    type="button"
                                    className="ml-0.5 rounded hover:text-destructive"
                                    onClick={() => run(() => releaseOrderTable(order.id, tb.id)).catch(() => undefined)}
                                    aria-label={t("order.release_table")}
                                    title={t("order.release_table")}
                                    disabled={busy}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    type="button"
                                    className="rounded hover:text-primary"
                                    onClick={() => setTableDialog({ mode: "transfer", from: tb.id })}
                                    aria-label={t("order.transfer_table")}
                                    title={t("order.transfer_table")}
                                    disabled={busy}
                                >
                                    <ArrowRightLeft className="h-3 w-3" />
                                </button>
                            )}
                        </Badge>
                    ))}
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {t("reservation.guests", { count: order.guest_count })}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t("order.opened_info", {
                        time: formatDateTime(order.created_at, i18n.language),
                        name: order.assigned_staff_name || order.created_by_name || "—",
                    })}
                    {order.guest && ` · ${t("reservation.linked_guest", { name: order.guest.full_name })}`}
                </p>
                {order.note && <p className="whitespace-pre-wrap text-sm">{order.note}</p>}
                {order.cancel_reason && (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm">
                        {t("order.reason")}: {order.cancel_reason}
                    </p>
                )}
            </SheetHeader>

            {/* Thao tác */}
            {isOpen && (
                <div className="flex flex-wrap gap-2 border-b p-4">
                    {canEdit && (
                        <Button size="sm" onClick={() => setRoundOpen(true)} disabled={busy}>
                            <Plus className="h-4 w-4" />
                            {t("order.add_round")}
                        </Button>
                    )}
                    {can("order_item.serve") && readyLines.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={serveAllReady} disabled={busy}>
                            <CheckCheck className="h-4 w-4" />
                            {t("order.serve_all", { count: readyLines.length })}
                        </Button>
                    )}
                    {canEdit && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => setTableDialog({ mode: "add" })} disabled={busy}>
                                <Plus className="h-4 w-4" />
                                {t("order.add_table")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={busy}>
                                <Pencil className="h-4 w-4" />
                                {t("common.edit")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCompleteOpen(true)} disabled={busy || unfinished > 0 || unpaid} title={unfinished > 0 ? t("order.complete_hint") : unpaid ? t("order.unpaid_hint") : undefined}>
                                <CircleCheck className="h-4 w-4" />
                                {t("order.complete")}
                            </Button>
                        </>
                    )}
                    {can("order.cancel") && (
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)} disabled={busy}>
                            <Ban className="h-4 w-4" />
                            {t("order.cancel")}
                        </Button>
                    )}
                </div>
            )}

            {/* Các đợt gọi món */}
            <div className="grid gap-4 p-4">
                {order.rounds.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                        <UtensilsCrossed className="h-8 w-8" />
                        {t("order.no_rounds")}
                    </div>
                ) : (
                    [...order.rounds].reverse().map((round) => (
                        <div key={round.id} className="rounded-lg border">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
                                <span className="font-semibold">
                                    {t("order.round_label", { no: round.round_no })}
                                    {round.table_name && ` · ${round.table_name}`}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatTime(round.sent_at, i18n.language)} · {round.created_by_name || "—"}
                                </span>
                            </div>
                            {round.note && <p className="border-b px-3 py-1.5 text-xs italic">{round.note}</p>}
                            <div className="divide-y">
                                {round.lines.map((line) => (
                                    <LineRow
                                        key={`${line.kind}-${line.id}`}
                                        line={line}
                                        orderOpen={isOpen}
                                        busy={busy}
                                        onServe={() =>
                                            run(() => updateOrderLineStatus(line.kind, line.id, "served"), true).catch(() => undefined)
                                        }
                                        onCancel={() => setCancelLine(line)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Tổng tiền */}
            <div className="mt-auto grid gap-1 border-t p-4 text-sm">
                <div className="flex justify-between">
                    <span>{t("order.subtotal")}</span>
                    <span>{formatMoney(order.subtotal)}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>
                            {t("order.discount")}
                            {order.discount && ` (${order.discount.code})`}
                        </span>
                        <span>-{formatMoney(order.discount_amount)}</span>
                    </div>
                )}
                {Number(order.service_fee ?? 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t("cashier.service_fee", { rate: Number(order.service_fee_rate) })}</span>
                        <span>{formatMoney(order.service_fee)}</span>
                    </div>
                )}
                {Number(order.tax ?? 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t("cashier.tax", { rate: Number(order.tax_rate) })}</span>
                        <span>{formatMoney(order.tax)}</span>
                    </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                    <span>{t("order.total")}</span>
                    <span>{formatMoney(order.total)}</span>
                </div>
                {Number(order.paid_amount ?? 0) > 0 && (
                    <>
                        <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                            <span>{t("cashier.paid")}</span>
                            <span>{formatMoney(order.paid_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t("cashier.remaining")}</span>
                            <span>{formatMoney(Math.max(0, Number(order.total) - Number(order.paid_amount)))}</span>
                        </div>
                    </>
                )}
            </div>

            <RoundDialog order={roundOpen ? order : null} onOpenChange={setRoundOpen} onSent={() => (reload(), onChanged())} />

            <TablePickerDialog
                state={tableDialog}
                order={order}
                freeTables={freeTables}
                onOpenChange={(v) => !v && setTableDialog(null)}
                onSubmit={(ids) =>
                    run(() =>
                        tableDialog?.mode === "transfer"
                            ? transferOrderTable(order.id, tableDialog.from, ids[0])
                            : addOrderTables(order.id, ids),
                    )
                }
            />

            <EditOrderDialog
                open={editOpen}
                order={order}
                onOpenChange={setEditOpen}
                onSubmit={(payload) => run(() => updateOrder(order.id, payload))}
            />

            <ReasonDialog
                open={!!cancelLine}
                onOpenChange={(v) => !v && setCancelLine(null)}
                title={t("order.cancel_line_title", { name: cancelLine?.name })}
                placeholder={t("order.cancel_line_placeholder")}
                onConfirm={(reason) => run(() => updateOrderLineStatus(cancelLine!.kind, cancelLine!.id, "cancelled", reason))}
            />
            <ReasonDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title={t("order.cancel_title", { code: order.code })}
                description={t("order.cancel_desc")}
                onConfirm={(reason) => run(() => cancelOrder(order.id, reason))}
            />
            <ConfirmDialog
                open={completeOpen}
                onOpenChange={setCompleteOpen}
                destructive={false}
                title={t("order.complete_title", { code: order.code })}
                description={t("order.complete_desc", { total: formatMoney(order.total) })}
                onConfirm={() => run(() => completeOrder(order.id))}
            />
        </>
    );
};

/** Một dòng món trong đợt gọi */
const LineRow = ({
    line,
    orderOpen,
    busy,
    onServe,
    onCancel,
}: {
    line: IOrderLine;
    orderOpen: boolean;
    busy: boolean;
    onServe: () => void;
    onCancel: () => void;
}) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const cancelled = line.status === "cancelled";
    return (
        <div className={cn("flex items-start gap-3 px-3 py-2", cancelled && "opacity-60")}>
            <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", cancelled && "line-through")}>
                    {line.name} <span className="text-muted-foreground">×{line.quantity}</span>
                </p>
                {line.combo_items && line.combo_items.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {line.combo_items.map((ci) => `${ci.name} ×${ci.quantity}`).join(", ")}
                    </p>
                )}
                {line.note && <p className="text-xs italic text-amber-700 dark:text-amber-300">{line.note}</p>}
                {line.cancel_reason && (
                    <p className="text-xs text-muted-foreground">
                        {t("order.reason")}: {line.cancel_reason}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm">{formatMoney(Number(line.current_price) * line.quantity)}</span>
                <div className="flex items-center gap-1">
                    <Badge variant="outline" className={ITEM_STATUS_STYLE[line.status]}>
                        {t(`status.order_item.${line.status}`)}
                    </Badge>
                    {orderOpen && line.status === "ready" && can("order_item.serve") && (
                        <Button size="sm" variant="default" className="h-6 px-2 text-xs" onClick={onServe} disabled={busy}>
                            {t("order.serve")}
                        </Button>
                    )}
                    {orderOpen && canMoveLine(can, line.status, "cancelled") && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={onCancel}
                            disabled={busy}
                            aria-label={t("order.cancel_line")}
                            title={t("order.cancel_line")}
                        >
                            <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

/** Chọn bàn để ghép thêm (nhiều bàn) hoặc chuyển tới (một bàn) */
const TablePickerDialog = ({
    state,
    order,
    freeTables,
    onOpenChange,
    onSubmit,
}: {
    state: TableDialog;
    order: IOrderDetail;
    freeTables: IFreeTable[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (tableIds: number[]) => Promise<unknown>;
}) => {
    const { t } = useTranslation("admin");
    const [picked, setPicked] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const single = state?.mode === "transfer";
    const from = state?.mode === "transfer" ? order.tables.find((tb) => tb.id === state.from) : undefined;

    const toggle = (id: number, checked: boolean) =>
        setPicked((prev) => (single ? (checked ? [id] : []) : checked ? [...prev, id] : prev.filter((x) => x !== id)));

    const submit = async () => {
        setBusy(true);
        try {
            await onSubmit(picked);
            setPicked([]);
            onOpenChange(false);
        } catch {
            // Lỗi đã hiển thị
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            open={!!state}
            onOpenChange={(v) => {
                if (busy) return;
                if (!v) setPicked([]);
                onOpenChange(v);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {single ? t("order.transfer_title", { name: from?.name }) : t("order.add_table_title")}
                    </DialogTitle>
                </DialogHeader>
                {freeTables.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("order.no_free_tables")}</p>
                ) : (
                    <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                        {freeTables.map((tb) => (
                            <label
                                key={tb.id}
                                className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent",
                                    picked.includes(tb.id) && "border-primary bg-primary/10",
                                )}
                            >
                                <Checkbox checked={picked.includes(tb.id)} onCheckedChange={(v) => toggle(tb.id, v === true)} />
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">{tb.name}</span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {tb.room_name} · {tb.capacity}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={submit} disabled={busy || picked.length === 0}>
                        {busy ? t("common.processing") : t("common.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

/** Sửa số khách và ghi chú của order */
const EditOrderDialog = ({
    open,
    order,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    order: IOrderDetail;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: { guest_count: number; note: string | null }) => Promise<unknown>;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            {open && <EditOrderBody order={order} onClose={() => onOpenChange(false)} onSubmit={onSubmit} />}
        </DialogContent>
    </Dialog>
);

const EditOrderBody = ({
    order,
    onClose,
    onSubmit,
}: {
    order: IOrderDetail;
    onClose: () => void;
    onSubmit: (payload: { guest_count: number; note: string | null }) => Promise<unknown>;
}) => {
    const { t } = useTranslation("admin");
    const [guestCount, setGuestCount] = useState(String(order.guest_count));
    const [note, setNote] = useState(order.note ?? "");
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await onSubmit({ guest_count: Number(guestCount) || 1, note: note.trim() || null });
            onClose();
        } catch {
            // Lỗi đã hiển thị
        } finally {
            setBusy(false);
        }
    };
    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t("order.edit_title", { code: order.code })}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="order-guests">{t("reservation.guest_count")}</Label>
                    <Input id="order-guests" type="number" min={1} max={500} required value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="order-note">{t("order.note")}</Label>
                    <Textarea id="order-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default OrderSheet;
