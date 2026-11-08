import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IOrder, IOrderDetail, ISplitOrderPayload } from "@/interfaces";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IFreeTable } from "./OrderSheet";

/** Order đang mở khác cùng chi nhánh: hiển thị mã, bàn, tổng tiền */
const OrderOption = ({ order, selected, onSelect }: { order: IOrder; selected: boolean; onSelect: () => void }) => {
    const { t } = useTranslation("admin");
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent",
                selected && "border-primary bg-primary/10",
            )}
        >
            <span className="min-w-0">
                <span className="block font-medium">{order.code}</span>
                <span className="block truncate text-xs text-muted-foreground">
                    {order.tables.map((tb) => tb.name).join(", ") || "—"} · {t("reservation.guests", { count: order.guest_count })}
                </span>
            </span>
            <span className="shrink-0">{formatMoney(order.total)}</span>
        </button>
    );
};

// ---------------------------------------------------------------------------
// Gộp order
// ---------------------------------------------------------------------------

interface MergeDialogProps {
    open: boolean;
    order: IOrderDetail;
    /** Order đang mở khác cùng chi nhánh */
    candidates: IOrder[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (targetOrderId: number) => Promise<unknown>;
}

/** Gộp order này vào một order đang mở khác: mọi món, bàn và số khách chuyển sang order được chọn */
export const MergeOrderDialog = ({ open, order, candidates, onOpenChange, onSubmit }: MergeDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            {open && <MergeBody order={order} candidates={candidates} onClose={() => onOpenChange(false)} onSubmit={onSubmit} />}
        </DialogContent>
    </Dialog>
);

const MergeBody = ({
    order,
    candidates,
    onClose,
    onSubmit,
}: Omit<MergeDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const [target, setTarget] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (!target) return;
        setBusy(true);
        try {
            await onSubmit(target);
            onClose();
        } catch {
            // Lỗi đã hiển thị
        } finally {
            setBusy(false);
        }
    };
    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("order.merge_title", { code: order.code })}</DialogTitle>
                <DialogDescription>{t("order.merge_desc")}</DialogDescription>
            </DialogHeader>
            {candidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("order.no_other_orders")}</p>
            ) : (
                <div className="grid max-h-[50vh] gap-2 overflow-y-auto">
                    {candidates.map((o) => (
                        <OrderOption key={o.id} order={o} selected={target === o.id} onSelect={() => setTarget(o.id)} />
                    ))}
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button onClick={submit} disabled={busy || !target}>
                    {busy ? t("common.processing") : t("order.merge")}
                </Button>
            </DialogFooter>
        </>
    );
};

// ---------------------------------------------------------------------------
// Tách order
// ---------------------------------------------------------------------------

interface SplitDialogProps {
    open: boolean;
    order: IOrderDetail;
    candidates: IOrder[];
    freeTables: IFreeTable[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: ISplitOrderPayload) => Promise<unknown>;
}

/** Tách một phần món sang order mới (chọn bàn) hoặc sang order đang mở khác */
export const SplitOrderDialog = (props: SplitDialogProps) => (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            {props.open && <SplitBody {...props} onClose={() => props.onOpenChange(false)} />}
        </DialogContent>
    </Dialog>
);

const SplitBody = ({ order, candidates, freeTables, onClose, onSubmit }: SplitDialogProps & { onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const lines = order.rounds.flatMap((r) => r.lines).filter((l) => l.status !== "cancelled");
    const [qty, setQty] = useState<Record<string, number>>({});
    const [mode, setMode] = useState<"new" | "existing">("new");
    const [tables, setTables] = useState<number[]>([]);
    const [guests, setGuests] = useState("1");
    const [target, setTarget] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const key = (kind: string, id: number) => `${kind}-${id}`;
    const setLineQty = (k: string, value: number, max: number) =>
        setQty((prev) => ({ ...prev, [k]: Math.max(0, Math.min(max, value)) }));
    const picked = lines
        .map((l) => ({ kind: l.kind, id: l.id, quantity: qty[key(l.kind, l.id)] ?? 0, price: Number(l.current_price) }))
        .filter((l) => l.quantity > 0);
    const movedValue = picked.reduce((s, l) => s + l.price * l.quantity, 0);

    // Bàn cho order mới: bàn trống, hoặc bàn của order này (phải để lại ít nhất một bàn)
    const ownTables = order.tables.map((tb) => ({ id: tb.id, name: tb.name, capacity: tb.capacity, room_name: tb.room_name }));
    const takesAllOwn = ownTables.length > 0 && ownTables.every((tb) => tables.includes(tb.id));
    const toggleTable = (id: number, checked: boolean) =>
        setTables((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

    const invalid =
        picked.length === 0 || (mode === "new" ? tables.length === 0 || takesAllOwn : !target);

    const submit = async () => {
        if (invalid) return;
        setBusy(true);
        try {
            const items = picked.map(({ kind, id, quantity }) => ({ kind, id, quantity }));
            await onSubmit(
                mode === "new"
                    ? { lines: items, table_ids: tables, guest_count: Number(guests) || 1 }
                    : { lines: items, target_order_id: target! },
            );
            onClose();
        } catch {
            // Lỗi đã hiển thị
        } finally {
            setBusy(false);
        }
    };

    const tableOption = (tb: IFreeTable, own: boolean) => (
        <label
            key={tb.id}
            className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent",
                tables.includes(tb.id) && "border-primary bg-primary/10",
            )}
        >
            <Checkbox checked={tables.includes(tb.id)} onCheckedChange={(v) => toggleTable(tb.id, v === true)} />
            <span className="min-w-0">
                <span className="block truncate font-medium">{tb.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                    {own ? t("order.split_own_table") : `${tb.room_name} · ${tb.capacity}`}
                </span>
            </span>
        </label>
    );

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("order.split_title", { code: order.code })}</DialogTitle>
                <DialogDescription>{t("order.split_desc")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
                <div className="grid gap-1">
                    <Label>{t("order.split_items")}</Label>
                    <div className="divide-y rounded-md border">
                        {lines.map((l) => {
                            const k = key(l.kind, l.id);
                            const value = qty[k] ?? 0;
                            return (
                                <div key={k} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{l.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            ×{l.quantity} · {t(`status.order_item.${l.status}`)}
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={() => setLineQty(k, value - 1, l.quantity)}
                                            disabled={value === 0}
                                            aria-label={t("order.split_less", { name: l.name })}
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="w-8 text-center tabular-nums">{value}</span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={() => setLineQty(k, value + 1, l.quantity)}
                                            disabled={value >= l.quantity}
                                            aria-label={t("order.split_more", { name: l.name })}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setLineQty(k, value === l.quantity ? 0 : l.quantity, l.quantity)}
                                        >
                                            {value === l.quantity ? t("order.split_none") : t("order.split_all")}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {picked.length > 0 && (
                        <p className="text-xs text-muted-foreground">{t("order.split_value", { amount: formatMoney(movedValue) })}</p>
                    )}
                </div>

                <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "existing")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="new">{t("order.split_to_new")}</TabsTrigger>
                        <TabsTrigger value="existing">{t("order.split_to_existing")}</TabsTrigger>
                    </TabsList>
                </Tabs>

                {mode === "new" ? (
                    <div className="grid gap-3">
                        <div className="grid gap-1.5">
                            <Label>{t("reservation.form.tables")}</Label>
                            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                                {ownTables.length > 1 && ownTables.map((tb) => tableOption(tb, true))}
                                {freeTables.map((tb) => tableOption(tb, false))}
                            </div>
                            {freeTables.length === 0 && ownTables.length <= 1 && (
                                <p className="text-sm text-muted-foreground">{t("order.no_free_tables")}</p>
                            )}
                            {takesAllOwn && <p className="text-xs text-destructive">{t("order.split_keep_one_table")}</p>}
                        </div>
                        <div className="grid gap-1.5 sm:w-40">
                            <Label htmlFor="split-guests">{t("reservation.guest_count")}</Label>
                            <Input id="split-guests" type="number" min={1} max={500} value={guests} onChange={(e) => setGuests(e.target.value)} />
                        </div>
                    </div>
                ) : candidates.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t("order.no_other_orders")}</p>
                ) : (
                    <div className="grid max-h-56 gap-2 overflow-y-auto">
                        {candidates.map((o) => (
                            <OrderOption key={o.id} order={o} selected={target === o.id} onSelect={() => setTarget(o.id)} />
                        ))}
                    </div>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button onClick={submit} disabled={busy || invalid}>
                    {busy ? t("common.processing") : t("order.split")}
                </Button>
            </DialogFooter>
        </>
    );
};
