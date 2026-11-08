import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Plus, Trash2, Truck } from "lucide-react";

import {
    cancelStockTransfer,
    createStockTransfer,
    getStock,
    getStockTransfer,
    getStockTransfers,
    getTransferDestinations,
    receiveStockTransfer,
} from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector, useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { IStockTransfer, StockTransferStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<StockTransferStatusEnum, string> = {
    in_transit: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    received: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    cancelled: "bg-muted text-muted-foreground border-border",
};

/** Chuyển kho giữa các chi nhánh: trừ kho khi gửi, cộng kho khi chi nhánh nhận xác nhận */
const TransfersTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const user = useAppSelector((s) => s.auth.user);
    // Chi nhánh đang thao tác: admin theo chi nhánh đang chọn, người khác là chi nhánh của mình
    const myBranch = restaurantId ?? user?.restaurant_id ?? undefined;
    const [status, setStatus] = useState<StockTransferStatusEnum | "all">("all");
    const [page, setPage] = useState(1);
    const [creating, setCreating] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getStockTransfers({ currentPage: page, limit: 20, ...(status !== "all" ? { status } : {}) }, restaurantId)).data;
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
                        setStatus(v as StockTransferStatusEnum | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44" aria-label={t("reservation.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {(["in_transit", "received", "cancelled"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`purchasing.transfer.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {can("inventory.transfer") && myBranch && (
                    <Button className="ml-auto" onClick={() => setCreating(true)}>
                        <Truck className="h-4 w-4" />
                        {t("purchasing.transfer.create")}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("purchasing.code")}</TableHead>
                                <TableHead>{t("purchasing.transfer.route")}</TableHead>
                                <TableHead>{t("purchasing.created_at")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.transfer.value")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !data?.transfers.length ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.transfers.map((x) => {
                                    const incoming = x.to_restaurant_id === myBranch;
                                    return (
                                        <TableRow key={x.id} className="cursor-pointer" onClick={() => setOpenId(x.id)}>
                                            <TableCell className="font-medium">{x.code}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1">
                                                    {x.from_restaurant_name}
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                    {x.to_restaurant_name}
                                                </span>
                                                {myBranch && (
                                                    <Badge variant="outline" className="ml-2">
                                                        {incoming ? t("purchasing.transfer.incoming") : t("purchasing.transfer.outgoing")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{formatDateTime(x.created_at, i18n.language)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatMoney(x.total_value)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={STATUS_STYLE[x.status]}>
                                                    {t(`purchasing.transfer.status.${x.status}`)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}

            <CreateTransferDialog
                open={creating}
                restaurantId={restaurantId}
                fromId={myBranch}
                onOpenChange={setCreating}
                onCreated={(x) => {
                    reload();
                    setOpenId(x.id);
                }}
            />
            <TransferDetailDialog transferId={openId} myBranch={myBranch} onOpenChange={(v) => !v && setOpenId(null)} onChanged={reload} />
        </div>
    );
};

interface CreateLine {
    key: number;
    ingredient_id: string;
    quantity: string;
}
let lineKey = 0;

const CreateTransferDialog = ({
    open,
    restaurantId,
    fromId,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    restaurantId?: number;
    fromId?: number;
    onOpenChange: (open: boolean) => void;
    onCreated: (transfer: IStockTransfer) => void;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            {open && <CreateBody restaurantId={restaurantId} fromId={fromId} onClose={() => onOpenChange(false)} onCreated={onCreated} />}
        </DialogContent>
    </Dialog>
);

const CreateBody = ({
    restaurantId,
    fromId,
    onClose,
    onCreated,
}: {
    restaurantId?: number;
    fromId?: number;
    onClose: () => void;
    onCreated: (transfer: IStockTransfer) => void;
}) => {
    const { t } = useTranslation("admin");
    // Người không phải admin chỉ thấy chi nhánh của mình ở bộ chọn chi nhánh: lấy danh sách chi nhánh nhận riêng
    const destinationsFetcher = useCallback(async () => (await getTransferDestinations(restaurantId)).data || [], [restaurantId]);
    const { data: branches = [] } = useAsyncData(destinationsFetcher);
    const [to, setTo] = useState("");
    const [note, setNote] = useState("");
    const [lines, setLines] = useState<CreateLine[]>([{ key: ++lineKey, ingredient_id: "", quantity: "" }]);
    const [busy, setBusy] = useState(false);

    const stockFetcher = useCallback(async () => (await getStock({}, restaurantId)).data?.items || [], [restaurantId]);
    const { data: stock = [] } = useAsyncData(stockFetcher);
    const available = useMemo(() => stock.filter((s) => Number(s.quantity) > 0), [stock]);
    const byId = useMemo(() => new Map(stock.map((s) => [s.ingredient_id, s])), [stock]);
    const patch = (key: number, change: Partial<CreateLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
    const picked = lines.filter((l) => l.ingredient_id && Number(l.quantity) > 0);
    const over = picked.some((l) => Number(l.quantity) > Number(byId.get(Number(l.ingredient_id))?.quantity ?? 0));
    const value = picked.reduce((s, l) => s + Number(l.quantity) * Number(byId.get(Number(l.ingredient_id))?.avg_unit_cost ?? 0), 0);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!to || picked.length === 0 || over) return;
        setBusy(true);
        try {
            const res = await createStockTransfer({
                from_restaurant_id: restaurantId,
                to_restaurant_id: Number(to),
                note: note.trim() || null,
                lines: picked.map((l) => ({ ingredient_id: Number(l.ingredient_id), quantity: Number(l.quantity) })),
            });
            toast.success(res.message);
            onCreated(res.data!);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t("purchasing.transfer.create")}</DialogTitle>
                <DialogDescription>{t("purchasing.transfer.create_desc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                    <Label>{t("purchasing.transfer.to")} *</Label>
                    <Select value={to} onValueChange={setTo}>
                        <SelectTrigger className="w-full" aria-label={t("purchasing.transfer.to")}>
                            <SelectValue placeholder={t("purchasing.transfer.pick_branch")} />
                        </SelectTrigger>
                        <SelectContent>
                            {branches
                                .filter((b) => b.id !== fromId)
                                .map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    {lines.map((l) => {
                        const item = l.ingredient_id ? byId.get(Number(l.ingredient_id)) : undefined;
                        const tooMuch = item && Number(l.quantity) > Number(item.quantity);
                        return (
                            <div key={l.key} className="grid grid-cols-[1fr_120px_auto] items-end gap-2">
                                <div className="grid gap-1">
                                    <Label className="text-xs">{t("inventory.ingredient")}</Label>
                                    <Select value={l.ingredient_id} onValueChange={(v) => patch(l.key, { ingredient_id: v })}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t("inventory.receipt.pick_ingredient")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {available
                                                .filter((s) => String(s.ingredient_id) === l.ingredient_id || !lines.some((x) => x.ingredient_id === String(s.ingredient_id)))
                                                .map((s) => (
                                                    <SelectItem key={s.ingredient_id} value={String(s.ingredient_id)}>
                                                        {s.name} ({s.unit}) · {t("inventory.in_stock", { qty: formatQty(s.quantity) })}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-xs">
                                        {t("inventory.quantity")}
                                        {item && ` (${item.unit})`}
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        className={cn(tooMuch && "border-destructive")}
                                        value={l.quantity}
                                        onChange={(e) => patch(l.key, { quantity: e.target.value })}
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
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-self-start"
                        onClick={() => setLines((ls) => [...ls, { key: ++lineKey, ingredient_id: "", quantity: "" }])}
                    >
                        <Plus className="h-4 w-4" />
                        {t("inventory.receipt.add_line")}
                    </Button>
                    {over && <p className="text-xs text-destructive">{t("purchasing.transfer.over_stock")}</p>}
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="tr-note">{t("inventory.note")}</Label>
                    <Textarea id="tr-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="flex justify-between border-t pt-2 text-sm">
                    <span>{t("purchasing.transfer.value")}</span>
                    <strong>{formatMoney(Math.round(value))}</strong>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !to || picked.length === 0 || over}>
                    {busy ? t("common.processing") : t("purchasing.transfer.send")}
                </Button>
            </DialogFooter>
        </form>
    );
};

/** Chi tiết phiếu chuyển: nhận hàng (chi nhánh nhận, nhập số thực nhận) hoặc hủy (chi nhánh gửi) */
const TransferDetailDialog = ({
    transferId,
    myBranch,
    onOpenChange,
    onChanged,
}: {
    transferId: number | null;
    myBranch?: number;
    onOpenChange: (open: boolean) => void;
    onChanged: () => void;
}) => (
    <Dialog open={!!transferId} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            {transferId && <DetailBody key={transferId} transferId={transferId} myBranch={myBranch} onChanged={onChanged} />}
        </DialogContent>
    </Dialog>
);

const DetailBody = ({ transferId, myBranch, onChanged }: { transferId: number; myBranch?: number; onChanged: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const isAdmin = useAppSelector((s) => s.auth.roles.includes("admin"));
    const fetcher = useCallback(async () => {
        try {
            return (await getStockTransfer(transferId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [transferId]);
    const { data: transfer, loading, reload } = useAsyncData(fetcher);
    const [received, setReceived] = useState<Record<number, string>>({});
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

    if (!transfer) {
        return (
            <DialogHeader>
                <DialogTitle>{t("purchasing.transfer.title")}</DialogTitle>
                <DialogDescription>{loading ? t("common.loading") : t("common.no_data")}</DialogDescription>
            </DialogHeader>
        );
    }

    const inTransit = transfer.status === "in_transit";
    // Admin xem cả chuỗi thao tác được cả hai phía; người khác theo chi nhánh của mình
    const canReceive = inTransit && (can("inventory.transfer") || can("inventory.import")) && (isAdmin || transfer.to_restaurant_id === myBranch);
    const canCancel = inTransit && can("inventory.transfer") && (isAdmin || transfer.from_restaurant_id === myBranch);
    const lines = transfer.lines || [];
    const qtyOf = (lineId: number, sent: string) => received[lineId] ?? String(Number(sent));
    const invalid = lines.some((l) => {
        const v = Number(qtyOf(l.id, l.quantity));
        return Number.isNaN(v) || v < 0 || v > Number(l.quantity);
    });

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

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                    {transfer.code}
                    <Badge variant="outline" className={STATUS_STYLE[transfer.status]}>
                        {t(`purchasing.transfer.status.${transfer.status}`)}
                    </Badge>
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-1">
                    {transfer.from_restaurant_name}
                    <ArrowRight className="h-3.5 w-3.5" />
                    {transfer.to_restaurant_name} · {formatDateTime(transfer.created_at, i18n.language)} · {transfer.created_by_name || "—"}
                </DialogDescription>
            </DialogHeader>
            {transfer.note && <p className="text-sm">{transfer.note}</p>}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("inventory.ingredient")}</TableHead>
                        <TableHead className="text-right">{t("purchasing.transfer.sent")}</TableHead>
                        <TableHead className="text-right">{t("purchasing.transfer.received")}</TableHead>
                        <TableHead className="text-right">{t("purchasing.transfer.unit_cost")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lines.map((l) => (
                        <TableRow key={l.id}>
                            <TableCell>
                                <span className="font-medium">{l.ingredient_name}</span>
                                {l.lots.length > 0 && (
                                    <span className="block text-xs text-muted-foreground">
                                        {l.lots.map((x) => `${x.expiry_date}${x.lot_code ? ` (${x.lot_code})` : ""}: ${formatQty(x.quantity)}`).join(" · ")}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {formatQty(l.quantity)} {l.unit}
                            </TableCell>
                            <TableCell className="text-right">
                                {canReceive ? (
                                    <Input
                                        type="number"
                                        min={0}
                                        max={Number(l.quantity)}
                                        step="0.001"
                                        className="ml-auto h-8 w-28 text-right"
                                        aria-label={t("purchasing.transfer.received_of", { name: l.ingredient_name })}
                                        value={qtyOf(l.id, l.quantity)}
                                        onChange={(e) => setReceived((r) => ({ ...r, [l.id]: e.target.value }))}
                                    />
                                ) : l.received_quantity === null ? (
                                    "—"
                                ) : (
                                    <span className={cn("tabular-nums", Number(l.received_quantity) < Number(l.quantity) && "text-destructive")}>
                                        {formatQty(l.received_quantity)} {l.unit}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(l.unit_cost)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="grid gap-1 text-sm">
                <div className="flex justify-between">
                    <span>{t("purchasing.transfer.value")}</span>
                    <strong>{formatMoney(transfer.total_value)}</strong>
                </div>
                {Number(transfer.loss_value) > 0 && (
                    <div className="flex justify-between text-destructive">
                        <span>{t("purchasing.transfer.loss")}</span>
                        <strong>{formatMoney(transfer.loss_value)}</strong>
                    </div>
                )}
                {transfer.received_at && (
                    <p className="text-xs text-muted-foreground">
                        {t("purchasing.transfer.received_info", {
                            time: formatDateTime(transfer.received_at, i18n.language),
                            name: transfer.received_by_name || "—",
                        })}
                    </p>
                )}
            </div>

            {canReceive && (
                <div className="grid gap-1.5">
                    <Label htmlFor="tr-receive-note">{t("inventory.note")}</Label>
                    <Input id="tr-receive-note" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                    <p className="text-xs text-muted-foreground">{t("purchasing.transfer.receive_hint")}</p>
                </div>
            )}

            {(canReceive || canCancel) && (
                <DialogFooter>
                    {canCancel && (
                        <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)} disabled={busy}>
                            {t("purchasing.transfer.cancel")}
                        </Button>
                    )}
                    {canReceive && (
                        <Button
                            disabled={busy || invalid}
                            onClick={() =>
                                run(() =>
                                    receiveStockTransfer(
                                        transfer.id,
                                        lines.map((l) => ({ line_id: l.id, received_quantity: Number(qtyOf(l.id, l.quantity)) })),
                                        note.trim() || null,
                                    ),
                                ).catch(() => undefined)
                            }
                        >
                            {busy ? t("common.processing") : t("purchasing.transfer.receive")}
                        </Button>
                    )}
                </DialogFooter>
            )}

            <ConfirmDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title={t("purchasing.transfer.cancel_title", { code: transfer.code })}
                description={t("purchasing.transfer.cancel_desc")}
                onConfirm={() => run(() => cancelStockTransfer(transfer.id))}
            />
        </>
    );
};

export default TransfersTab;
