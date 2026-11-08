import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PackageCheck, Plus, Send, Sparkles, Trash2 } from "lucide-react";

import {
    createPurchaseOrder,
    getIngredients,
    getPurchaseOrder,
    getPurchaseOrders,
    getPurchaseSuggestions,
    getSupplier,
    getSuppliers,
    purchaseOrderAction,
    receivePurchaseOrder,
    updatePurchaseOrder,
} from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import ReasonDialog from "@/components/common/ReasonDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { IPurchaseOrder, PurchaseOrderStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatDateTime, toDateInput } from "@/lib/datetime";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

const PO_STATUS_STYLE: Record<PurchaseOrderStatusEnum, string> = {
    draft: "bg-muted text-muted-foreground border-border",
    sent: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    partial: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    received: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    closed: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    cancelled: "bg-muted text-muted-foreground border-border line-through",
};
const STATUSES: PurchaseOrderStatusEnum[] = ["draft", "sent", "partial", "received", "closed", "cancelled"];

/** Đơn đặt hàng nguyên liệu của chi nhánh */
const OrdersTab = ({ restaurantId, canCreateHere }: { restaurantId?: number; canCreateHere: boolean }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const [status, setStatus] = useState<PurchaseOrderStatusEnum | "all">("all");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<IPurchaseOrder | "new" | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getPurchaseOrders({ currentPage: page, limit: 20, ...(status !== "all" ? { status } : {}) }, restaurantId)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, status, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["inventory:changed"], reload, 1000);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as PurchaseOrderStatusEnum | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-48" aria-label={t("reservation.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`purchasing.order.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {can("purchase.create") && (
                    <Button className="ml-auto" disabled={!canCreateHere} title={canCreateHere ? undefined : t("order.select_branch_first")} onClick={() => setEditing("new")}>
                        <Plus className="h-4 w-4" />
                        {t("purchasing.order.create")}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("purchasing.code")}</TableHead>
                                <TableHead>{t("purchasing.supplier.name")}</TableHead>
                                <TableHead>{t("purchasing.created_at")}</TableHead>
                                <TableHead>{t("purchasing.order.expected")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.order.total")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.order.received_value")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !data?.purchase_orders.length ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.purchase_orders.map((o) => (
                                    <TableRow key={o.id} className="cursor-pointer" onClick={() => setOpenId(o.id)}>
                                        <TableCell className="font-medium">
                                            {o.code}
                                            {!restaurantId && o.restaurant_name && <span className="block text-xs text-muted-foreground">{o.restaurant_name}</span>}
                                        </TableCell>
                                        <TableCell>{o.supplier_name}</TableCell>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(o.created_at, i18n.language)}</TableCell>
                                        <TableCell>{o.expected_date || "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatMoney(o.total)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{Number(o.received_value) > 0 ? formatMoney(o.received_value) : "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={PO_STATUS_STYLE[o.status]}>
                                                {t(`purchasing.order.status.${o.status}`)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}

            <OrderFormDialog
                order={editing}
                restaurantId={restaurantId}
                onOpenChange={(v) => !v && setEditing(null)}
                onSaved={(o) => {
                    reload();
                    setOpenId(o.id);
                }}
            />
            <OrderDetailDialog
                orderId={openId}
                onOpenChange={(v) => !v && setOpenId(null)}
                onEdit={(o) => {
                    setOpenId(null);
                    setEditing(o);
                }}
                onChanged={reload}
            />
        </div>
    );
};

// ---------------------------------------------------------------------------
// Lập / sửa đơn
// ---------------------------------------------------------------------------

interface FormLine {
    key: number;
    ingredient_id: string;
    quantity: string;
    unit_price: string;
}
let lineKey = 0;
const newLine = (ingredientId = "", quantity = "", price = ""): FormLine => ({ key: ++lineKey, ingredient_id: ingredientId, quantity, unit_price: price });

const OrderFormDialog = ({
    order,
    restaurantId,
    onOpenChange,
    onSaved,
}: {
    order: IPurchaseOrder | "new" | null;
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onSaved: (order: IPurchaseOrder) => void;
}) => (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
            {order && (
                <OrderForm
                    key={order === "new" ? "new" : order.id}
                    order={order === "new" ? null : order}
                    restaurantId={restaurantId}
                    onClose={() => onOpenChange(false)}
                    onSaved={onSaved}
                />
            )}
        </DialogContent>
    </Dialog>
);

const OrderForm = ({
    order,
    restaurantId,
    onClose,
    onSaved,
}: {
    order: IPurchaseOrder | null;
    restaurantId?: number;
    onClose: () => void;
    onSaved: (order: IPurchaseOrder) => void;
}) => {
    const { t } = useTranslation("admin");
    const [supplierId, setSupplierId] = useState(order ? String(order.supplier_id) : "");
    const [expected, setExpected] = useState(order?.expected_date ?? toDateInput(addDays(new Date(), 1)));
    const [note, setNote] = useState(order?.note ?? "");
    const [lines, setLines] = useState<FormLine[]>(
        order?.lines?.length
            ? order.lines.map((l) => newLine(String(l.ingredient_id), String(Number(l.quantity)), String(Number(l.unit_price))))
            : [newLine()],
    );
    const [coverDays, setCoverDays] = useState("7");
    const [busy, setBusy] = useState(false);

    const baseFetcher = useCallback(async () => {
        const [suppliers, ingredients] = await Promise.all([getSuppliers({ status: "active" }), getIngredients({ status: "active" })]);
        return { suppliers: suppliers.data || [], ingredients: ingredients.data || [] };
    }, []);
    const { data: base } = useAsyncData(baseFetcher);
    // Bảng giá của nhà cung cấp đang chọn: điền đơn giá mặc định
    const pricesFetcher = useCallback(async () => (supplierId ? (await getSupplier(Number(supplierId))).data?.prices || [] : []), [supplierId]);
    const { data: prices = [] } = useAsyncData(pricesFetcher);
    const priceOf = useMemo(() => new Map(prices.map((p) => [p.ingredient_id, Number(p.unit_price)])), [prices]);
    const unitOf = useMemo(() => new Map((base?.ingredients || []).map((g) => [g.id, g.unit])), [base]);

    const patch = (key: number, change: Partial<FormLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
    const picked = lines.filter((l) => l.ingredient_id && Number(l.quantity) > 0);
    const total = picked.reduce((s, l) => s + Number(l.quantity) * (l.unit_price !== "" ? Number(l.unit_price) : (priceOf.get(Number(l.ingredient_id)) ?? 0)), 0);

    /** Điền các dòng theo gợi ý (đủ dùng N ngày theo mức tiêu hao), chỉ nguyên liệu nhà cung cấp có bán */
    const suggest = async () => {
        try {
            const res = await getPurchaseSuggestions({ supplier_id: supplierId ? Number(supplierId) : undefined, cover_days: Number(coverDays) || 7 }, restaurantId);
            const items = (res.data?.items || []).filter((i) => i.suggested_quantity > 0);
            if (items.length === 0) return toast.info(t("purchasing.order.no_suggestions"));
            setLines(items.map((i) => newLine(String(i.ingredient_id), String(i.suggested_quantity), i.unit_price === null ? "" : String(i.unit_price))));
            toast.success(t("purchasing.order.suggested", { count: items.length }));
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const save = async (send: boolean) => {
        if (!supplierId || picked.length === 0) return;
        setBusy(true);
        try {
            const payload = {
                supplier_id: Number(supplierId),
                expected_date: expected || null,
                note: note.trim() || null,
                lines: picked.map((l) => ({
                    ingredient_id: Number(l.ingredient_id),
                    quantity: Number(l.quantity),
                    ...(l.unit_price !== "" ? { unit_price: Number(l.unit_price) } : {}),
                })),
            };
            let res = order ? await updatePurchaseOrder(order.id, payload) : await createPurchaseOrder({ ...payload, restaurant_id: restaurantId, send });
            if (order && send) res = await purchaseOrderAction(order.id, "send");
            toast.success(res.message);
            onSaved(res.data!);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{order ? t("purchasing.order.edit", { code: order.code }) : t("purchasing.order.create")}</DialogTitle>
                <DialogDescription>{t("purchasing.order.form_desc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                    <div className="grid gap-1.5">
                        <Label>{t("purchasing.supplier.name")} *</Label>
                        <Select value={supplierId} onValueChange={setSupplierId}>
                            <SelectTrigger className="w-full" aria-label={t("purchasing.supplier.name")}>
                                <SelectValue placeholder={t("purchasing.order.pick_supplier")} />
                            </SelectTrigger>
                            <SelectContent>
                                {(base?.suppliers || []).map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="po-expected">{t("purchasing.order.expected")}</Label>
                        <Input id="po-expected" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
                    <div className="grid gap-1">
                        <Label htmlFor="po-cover" className="text-xs">
                            {t("purchasing.order.cover_days")}
                        </Label>
                        <Input id="po-cover" type="number" min={1} max={90} className="w-24" value={coverDays} onChange={(e) => setCoverDays(e.target.value)} />
                    </div>
                    <Button type="button" variant="secondary" onClick={suggest} disabled={!supplierId}>
                        <Sparkles className="h-4 w-4" />
                        {t("purchasing.order.suggest")}
                    </Button>
                    <p className="w-full text-xs text-muted-foreground sm:w-auto sm:flex-1">{t("purchasing.order.suggest_hint")}</p>
                </div>

                <div className="grid gap-2">
                    {lines.map((l) => {
                        const id = Number(l.ingredient_id);
                        const listPrice = priceOf.get(id);
                        return (
                            <div key={l.key} className="grid grid-cols-[1fr_100px_auto] items-end gap-2 sm:grid-cols-[1fr_110px_140px_auto]">
                                <div className="grid gap-1">
                                    <Label className="text-xs">{t("inventory.ingredient")}</Label>
                                    <Select value={l.ingredient_id} onValueChange={(v) => patch(l.key, { ingredient_id: v, unit_price: "" })}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t("inventory.receipt.pick_ingredient")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(base?.ingredients || [])
                                                .filter((g) => String(g.id) === l.ingredient_id || !lines.some((x) => x.ingredient_id === String(g.id)))
                                                .map((g) => (
                                                    <SelectItem key={g.id} value={String(g.id)}>
                                                        {g.name} ({g.unit}){priceOf.has(g.id) ? ` · ${formatMoney(priceOf.get(g.id))}` : ""}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-xs">
                                        {t("inventory.quantity")}
                                        {l.ingredient_id && ` (${unitOf.get(id) ?? ""})`}
                                    </Label>
                                    <Input type="number" min={0} step="0.001" value={l.quantity} onChange={(e) => patch(l.key, { quantity: e.target.value })} />
                                </div>
                                <div className="col-span-2 grid gap-1 sm:col-span-1">
                                    <Label className="text-xs">{t("inventory.unit_price")}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder={listPrice !== undefined ? String(listPrice) : "0"}
                                        value={l.unit_price}
                                        onChange={(e) => patch(l.key, { unit_price: e.target.value })}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={lines.length === 1}
                                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                                    aria-label={t("common.delete")}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        );
                    })}
                    <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setLines((ls) => [...ls, newLine()])}>
                        <Plus className="h-4 w-4" />
                        {t("inventory.receipt.add_line")}
                    </Button>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="po-note">{t("inventory.note")}</Label>
                    <Textarea id="po-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="flex justify-between border-t pt-2 text-sm">
                    <span>{t("purchasing.order.total")}</span>
                    <strong>{formatMoney(Math.round(total))}</strong>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="button" variant="secondary" onClick={() => save(false)} disabled={busy || !supplierId || picked.length === 0}>
                    {t("purchasing.order.save_draft")}
                </Button>
                <Button type="button" onClick={() => save(true)} disabled={busy || !supplierId || picked.length === 0}>
                    <Send className="h-4 w-4" />
                    {t("purchasing.order.save_send")}
                </Button>
            </DialogFooter>
        </>
    );
};

// ---------------------------------------------------------------------------
// Chi tiết đơn, nhận hàng
// ---------------------------------------------------------------------------

const OrderDetailDialog = ({
    orderId,
    onOpenChange,
    onEdit,
    onChanged,
}: {
    orderId: number | null;
    onOpenChange: (open: boolean) => void;
    onEdit: (order: IPurchaseOrder) => void;
    onChanged: () => void;
}) => (
    <Dialog open={!!orderId} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
            {orderId && <DetailBody key={orderId} orderId={orderId} onEdit={onEdit} onChanged={onChanged} />}
        </DialogContent>
    </Dialog>
);

interface ReceiveRow {
    quantity: string;
    unit_price: string;
    expiry_date: string;
    lot_code: string;
}

const DetailBody = ({ orderId, onEdit, onChanged }: { orderId: number; onEdit: (order: IPurchaseOrder) => void; onChanged: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const fetcher = useCallback(async () => {
        try {
            return (await getPurchaseOrder(orderId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [orderId]);
    const { data: order, loading, reload } = useAsyncData(fetcher);
    const [receiving, setReceiving] = useState<Record<number, ReceiveRow> | null>(null);
    const [busy, setBusy] = useState(false);
    const [reasonFor, setReasonFor] = useState<"cancel" | "close" | null>(null);

    if (!order) {
        return (
            <DialogHeader>
                <DialogTitle>{t("purchasing.order.title")}</DialogTitle>
                <DialogDescription>{loading ? t("common.loading") : t("common.no_data")}</DialogDescription>
            </DialogHeader>
        );
    }

    const lines = order.lines || [];
    const run = async (action: () => Promise<{ message: string }>) => {
        setBusy(true);
        try {
            toast.success((await action()).message);
            reload();
            onChanged();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        } finally {
            setBusy(false);
        }
    };

    /** Bắt đầu nhận hàng: mặc định số còn thiếu, giá đặt, hạn dùng gợi ý theo số ngày bảo quản */
    const startReceive = () =>
        setReceiving(
            Object.fromEntries(
                lines.map((l) => {
                    const rest = Math.max(0, Number(l.quantity) - Number(l.received_quantity));
                    const expiry = l.track_expiry && l.shelf_life_days ? toDateInput(addDays(new Date(), l.shelf_life_days)) : "";
                    return [l.id, { quantity: rest ? String(Math.round(rest * 1000) / 1000) : "", unit_price: String(Number(l.unit_price)), expiry_date: expiry, lot_code: "" }];
                }),
            ),
        );
    const rowsToReceive = receiving ? lines.filter((l) => Number(receiving[l.id]?.quantity) > 0) : [];
    const missingExpiry = rowsToReceive.some((l) => l.track_expiry && !receiving![l.id].expiry_date);
    const submitReceive = () =>
        run(() =>
            receivePurchaseOrder(order.id, {
                lines: rowsToReceive.map((l) => {
                    const r = receiving![l.id];
                    return {
                        line_id: l.id,
                        quantity: Number(r.quantity),
                        unit_price: Number(r.unit_price),
                        expiry_date: l.track_expiry ? r.expiry_date : null,
                        lot_code: r.lot_code.trim() || null,
                    };
                }),
            }),
        )
            .then(() => setReceiving(null))
            .catch(() => undefined);

    const canCreate = can("purchase.create");
    const openForReceive = order.status === "sent" || order.status === "partial";

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                    {order.code}
                    <Badge variant="outline" className={PO_STATUS_STYLE[order.status]}>
                        {t(`purchasing.order.status.${order.status}`)}
                    </Badge>
                </DialogTitle>
                <DialogDescription>
                    {order.supplier_name} · {order.restaurant_name} · {formatDateTime(order.created_at, i18n.language)} · {order.created_by_name || "—"}
                    {order.expected_date && ` · ${t("purchasing.order.expected_on", { date: order.expected_date })}`}
                </DialogDescription>
            </DialogHeader>
            {order.note && <p className="text-sm">{order.note}</p>}
            {order.cancel_reason && (
                <p className="rounded-md bg-muted px-3 py-2 text-sm">
                    {t("order.reason")}: {order.cancel_reason}
                </p>
            )}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("inventory.ingredient")}</TableHead>
                        <TableHead className="text-right">{t("purchasing.order.ordered")}</TableHead>
                        <TableHead className="text-right">{t("purchasing.order.received")}</TableHead>
                        <TableHead className="text-right">{t("inventory.unit_price")}</TableHead>
                        {receiving && <TableHead>{t("purchasing.order.receive_now")}</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lines.map((l) => {
                        const r = receiving?.[l.id];
                        const done = Number(l.received_quantity) >= Number(l.quantity);
                        const setR = (change: Partial<ReceiveRow>) => setReceiving((x) => ({ ...x!, [l.id]: { ...x![l.id], ...change } }));
                        return (
                            <TableRow key={l.id}>
                                <TableCell className="font-medium">
                                    {l.ingredient_name}
                                    {l.track_expiry && (
                                        <Badge variant="outline" className="ml-2">
                                            {t("inventory.track_expiry_badge")}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatQty(l.quantity)} {l.unit}
                                </TableCell>
                                <TableCell className={cn("text-right tabular-nums", done && "text-emerald-600")}>{formatQty(l.received_quantity)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatMoney(l.unit_price)}</TableCell>
                                {r && (
                                    <TableCell>
                                        <div className="grid gap-1">
                                            <div className="flex gap-1">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.001"
                                                    className="h-8 w-24"
                                                    aria-label={t("purchasing.order.receive_qty_of", { name: l.ingredient_name })}
                                                    value={r.quantity}
                                                    onChange={(e) => setR({ quantity: e.target.value })}
                                                />
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-8 w-28"
                                                    aria-label={t("purchasing.order.receive_price_of", { name: l.ingredient_name })}
                                                    value={r.unit_price}
                                                    onChange={(e) => setR({ unit_price: e.target.value })}
                                                />
                                            </div>
                                            {l.track_expiry && Number(r.quantity) > 0 && (
                                                <div className="flex gap-1">
                                                    <Input
                                                        type="date"
                                                        className={cn("h-8 w-36", !r.expiry_date && "border-destructive")}
                                                        aria-label={t("inventory.lot.expiry")}
                                                        value={r.expiry_date}
                                                        onChange={(e) => setR({ expiry_date: e.target.value })}
                                                    />
                                                    <Input
                                                        className="h-8 w-24"
                                                        placeholder={t("inventory.lot.code")}
                                                        maxLength={60}
                                                        value={r.lot_code}
                                                        onChange={(e) => setR({ lot_code: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <div className="grid gap-1 text-sm">
                <div className="flex justify-between">
                    <span>{t("purchasing.order.total")}</span>
                    <strong>{formatMoney(order.total)}</strong>
                </div>
                {Number(order.received_value) > 0 && (
                    <div className="flex justify-between">
                        <span>{t("purchasing.order.received_value")}</span>
                        <strong>{formatMoney(order.received_value)}</strong>
                    </div>
                )}
                {!!order.receipts?.length && (
                    <p className="text-xs text-muted-foreground">
                        {t("purchasing.order.receipts")}:{" "}
                        {order.receipts.map((r) => `${r.code} (${formatMoney(r.total_value)})`).join(" · ")}
                    </p>
                )}
                {receiving && missingExpiry && <p className="text-xs text-destructive">{t("purchasing.order.expiry_missing")}</p>}
            </div>

            <DialogFooter className="flex-wrap gap-2">
                {receiving ? (
                    <>
                        <Button variant="outline" onClick={() => setReceiving(null)} disabled={busy}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={submitReceive} disabled={busy || rowsToReceive.length === 0 || missingExpiry}>
                            <PackageCheck className="h-4 w-4" />
                            {busy ? t("common.processing") : t("purchasing.order.confirm_receive")}
                        </Button>
                    </>
                ) : (
                    <>
                        {canCreate && order.status === "draft" && (
                            <Button variant="outline" onClick={() => onEdit(order)} disabled={busy}>
                                {t("common.edit")}
                            </Button>
                        )}
                        {canCreate && (order.status === "draft" || order.status === "sent") && (
                            <Button variant="outline" className="text-destructive" onClick={() => setReasonFor("cancel")} disabled={busy}>
                                {t("purchasing.order.cancel")}
                            </Button>
                        )}
                        {canCreate && order.status === "partial" && (
                            <Button variant="outline" onClick={() => setReasonFor("close")} disabled={busy}>
                                {t("purchasing.order.close")}
                            </Button>
                        )}
                        {canCreate && order.status === "draft" && (
                            <Button onClick={() => run(() => purchaseOrderAction(order.id, "send")).catch(() => undefined)} disabled={busy}>
                                <Send className="h-4 w-4" />
                                {t("purchasing.order.send")}
                            </Button>
                        )}
                        {can("purchase.receive") && openForReceive && (
                            <Button onClick={startReceive} disabled={busy}>
                                <PackageCheck className="h-4 w-4" />
                                {t("purchasing.order.receive")}
                            </Button>
                        )}
                    </>
                )}
            </DialogFooter>

            <ReasonDialog
                open={!!reasonFor}
                onOpenChange={(v) => !v && setReasonFor(null)}
                title={reasonFor === "close" ? t("purchasing.order.close_title", { code: order.code }) : t("purchasing.order.cancel_title", { code: order.code })}
                description={reasonFor === "close" ? t("purchasing.order.close_desc") : undefined}
                onConfirm={(reason) => run(() => purchaseOrderAction(order.id, reasonFor!, reason))}
            />
        </>
    );
};

export default OrdersTab;
