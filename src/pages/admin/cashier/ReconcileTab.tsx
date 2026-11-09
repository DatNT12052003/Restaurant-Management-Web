import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { applyGatewayTransaction, getActiveOrders, getGatewayTransactions, ignoreGatewayTransaction } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GATEWAY_STATUS_STYLE } from "@/constants/payment";
import { useAsyncData, useRealtime } from "@/hooks";
import type { IGatewayTransaction } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

const STATUSES = ["open", "matched", "unmatched", "mismatch", "ignored", "all"] as const;
type StatusFilter = (typeof STATUSES)[number];

/**
 * Giai đoạn 14: đối soát chuyển khoản. SePay báo mọi tiền vào tài khoản; giao dịch không khớp mã QR, sai số tiền, hoặc
 * đến khi order đã đóng nằm ở đây để ghi tay vào một order đang mở hoặc bỏ qua (đều ghi nhật ký).
 */
const ReconcileTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const [status, setStatus] = useState<StatusFilter>("open");
    const [page, setPage] = useState(1);
    const [applying, setApplying] = useState<IGatewayTransaction | null>(null);
    const [ignoring, setIgnoring] = useState<IGatewayTransaction | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (
                await getGatewayTransactions({ currentPage: page, limit: 20, ...(status !== "all" ? { status } : {}) }, restaurantId)
            ).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, status, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["gateway:transaction", "payment:changed"], reload, 800);

    const open = (data?.counts.unmatched ?? 0) + (data?.counts.mismatch ?? 0);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as StatusFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-52" aria-label={t("reconcile.filter")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`reconcile.filter_${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {open > 0 && <Badge variant="destructive">{t("reconcile.open_count", { count: open })}</Badge>}
                <p className="text-xs text-muted-foreground">{t("reconcile.hint")}</p>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("cashier.time")}</TableHead>
                                <TableHead className="text-right">{t("cashier.amount")}</TableHead>
                                <TableHead>{t("reconcile.content")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                                <TableHead>{t("order.code")}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : (data?.transactions.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {formatDateTime(tx.transaction_at ?? tx.created_at, i18n.language)}
                                            {tx.restaurant_name && <div className="text-xs text-muted-foreground">{tx.restaurant_name}</div>}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatMoney(tx.amount)}</TableCell>
                                        <TableCell className="max-w-xs">
                                            <div className="break-words text-sm">{tx.content || "—"}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {tx.bank_reference}
                                                {tx.note && ` · ${t(`reconcile.note.${tx.note}`, { defaultValue: tx.note })}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={GATEWAY_STATUS_STYLE[tx.status]}>
                                                {t(`reconcile.status.${tx.status}`)}
                                            </Badge>
                                            {tx.resolved_by_name && <div className="mt-0.5 text-xs text-muted-foreground">{tx.resolved_by_name}</div>}
                                        </TableCell>
                                        <TableCell>{tx.order_code ?? "—"}</TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            {(tx.status === "unmatched" || tx.status === "mismatch") && (
                                                <>
                                                    <Button size="sm" variant="outline" className="h-7" onClick={() => setApplying(tx)}>
                                                        {t("reconcile.apply")}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setIgnoring(tx)}>
                                                        {t("reconcile.ignore")}
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}

            <ApplyDialog
                transaction={applying}
                restaurantId={restaurantId}
                onOpenChange={(v) => !v && setApplying(null)}
                onDone={reload}
            />
            <ReasonDialog
                open={!!ignoring}
                onOpenChange={(v) => !v && setIgnoring(null)}
                title={t("reconcile.ignore_title", { amount: formatMoney(ignoring?.amount) })}
                description={t("reconcile.ignore_hint")}
                confirmLabel={t("reconcile.ignore")}
                onConfirm={async (note) => {
                    try {
                        const res = await ignoreGatewayTransaction(ignoring!.id, note);
                        toast.success(res.message);
                        reload();
                    } catch (error) {
                        toast.error(getErrorMessage(error));
                        throw error;
                    }
                }}
            />
        </div>
    );
};

/** Chọn order đang mở để ghi nhận giao dịch (số tiền giao dịch không được vượt số còn phải thu) */
const ApplyDialog = ({
    transaction,
    restaurantId,
    onOpenChange,
    onDone,
}: {
    transaction: IGatewayTransaction | null;
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
}) => (
    <Dialog open={!!transaction} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            {transaction && (
                <ApplyBody key={transaction.id} transaction={transaction} restaurantId={restaurantId} onClose={() => onOpenChange(false)} onDone={onDone} />
            )}
        </DialogContent>
    </Dialog>
);

const ApplyBody = ({
    transaction,
    restaurantId,
    onClose,
    onDone,
}: {
    transaction: IGatewayTransaction;
    restaurantId?: number;
    onClose: () => void;
    onDone: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [orderId, setOrderId] = useState<string>("");
    const [busy, setBusy] = useState(false);
    const fetcher = useCallback(async () => (await getActiveOrders(transaction.restaurant_id ?? restaurantId)).data ?? [], [transaction.restaurant_id, restaurantId]);
    const { data: orders } = useAsyncData(fetcher);

    const submit = async () => {
        setBusy(true);
        try {
            const res = await applyGatewayTransaction(transaction.id, Number(orderId));
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
        <>
            <DialogHeader>
                <DialogTitle>{t("reconcile.apply_title", { amount: formatMoney(transaction.amount) })}</DialogTitle>
                <DialogDescription>{transaction.content}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
                <Select value={orderId} onValueChange={setOrderId}>
                    <SelectTrigger aria-label={t("reconcile.choose_order")}>
                        <SelectValue placeholder={t("reconcile.choose_order")} />
                    </SelectTrigger>
                    <SelectContent>
                        {(orders ?? []).map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                                {o.code} · {(o.tables ?? []).map((tb) => tb.name).join(", ")} · {formatMoney(o.total)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {orders && orders.length === 0 && <p className="text-xs text-muted-foreground">{t("reconcile.no_open_orders")}</p>}
                <p className="text-xs text-muted-foreground">{t("reconcile.apply_hint")}</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button disabled={busy || !orderId} onClick={submit}>
                    {busy ? t("common.processing") : t("reconcile.apply")}
                </Button>
            </DialogFooter>
        </>
    );
};

export default ReconcileTab;
