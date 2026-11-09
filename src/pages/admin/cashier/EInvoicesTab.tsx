import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cancelEInvoice, getEInvoices, retryEInvoice } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EINVOICE_STATUS_STYLE } from "@/constants/payment";
import { useAsyncData, useDebounce, usePermission, useRealtime } from "@/hooks";
import type { EInvoiceStatus, IEInvoice } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

const STATUSES: EInvoiceStatus[] = ["pending", "issued", "failed", "cancelled"];

/** Giai đoạn 14: danh sách hóa đơn điện tử của chi nhánh; gửi lại hóa đơn lỗi, hủy hóa đơn */
const EInvoicesTab = ({ restaurantId, onInvoice }: { restaurantId?: number; onInvoice: (orderId: number) => void }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const [status, setStatus] = useState<EInvoiceStatus | "all">("all");
    const [search, setSearch] = useState("");
    const text = useDebounce(search, 400);
    const [page, setPage] = useState(1);
    const [cancelling, setCancelling] = useState<IEInvoice | null>(null);
    const [busy, setBusy] = useState(false);

    const fetcher = useCallback(async () => {
        try {
            return (
                await getEInvoices(
                    {
                        currentPage: page,
                        limit: 20,
                        ...(status !== "all" ? { status } : {}),
                        ...(text.trim() ? { search: { text: text.trim(), fields: ["invoice_no"] } } : {}),
                    },
                    restaurantId,
                )
            ).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, status, text, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["einvoice:changed"], reload, 800);

    const retry = async (e: IEInvoice) => {
        setBusy(true);
        try {
            const res = await retryEInvoice(e.id);
            if (res.data?.status === "failed") toast.warning(t("einvoice.failed_toast", { error: res.data.error_message ?? "" }));
            else toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const buyer = (e: IEInvoice) =>
        e.buyer_type === "company" ? `${e.buyer_company ?? ""} · ${e.buyer_tax_code ?? ""}` : e.buyer_name || t("einvoice.walk_in");

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    className="w-64"
                    placeholder={t("einvoice.search")}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as EInvoiceStatus | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44" aria-label={t("reservation.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`einvoice.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("cashier.time")}</TableHead>
                                <TableHead>{t("order.code")}</TableHead>
                                <TableHead>{t("einvoice.buyer")}</TableHead>
                                <TableHead className="text-right">{t("order.total")}</TableHead>
                                <TableHead>{t("einvoice.number")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : (data?.e_invoices.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.e_invoices.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(e.issued_at ?? e.created_at, i18n.language)}</TableCell>
                                        <TableCell>
                                            {e.order_code}
                                            {e.source === "auto" && <div className="text-xs text-muted-foreground">{t("einvoice.auto")}</div>}
                                        </TableCell>
                                        <TableCell className="max-w-xs break-words">{buyer(e)}</TableCell>
                                        <TableCell className="text-right">{formatMoney(e.total)}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {e.invoice_no ? `${e.series ?? ""} · ${e.invoice_no}` : "—"}
                                            {e.lookup_code && <div className="text-xs text-muted-foreground">{e.lookup_code}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={EINVOICE_STATUS_STYLE[e.status]}>
                                                {t(`einvoice.status.${e.status}`)}
                                            </Badge>
                                            {e.status === "failed" && e.error_message && (
                                                <div className="mt-0.5 max-w-[14rem] text-xs text-destructive">{e.error_message}</div>
                                            )}
                                            {e.status === "cancelled" && e.cancel_reason && (
                                                <div className="mt-0.5 max-w-[14rem] text-xs text-muted-foreground">{e.cancel_reason}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            <Button size="sm" variant="ghost" className="h-7" onClick={() => onInvoice(e.order_id)}>
                                                {t("cashier.invoice_short")}
                                            </Button>
                                            {can("einvoice.issue") && (e.status === "failed" || e.status === "pending") && (
                                                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => retry(e)}>
                                                    {t("einvoice.retry")}
                                                </Button>
                                            )}
                                            {can("einvoice.cancel") && e.status !== "cancelled" && (
                                                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setCancelling(e)}>
                                                    {t("einvoice.cancel")}
                                                </Button>
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

            <ReasonDialog
                open={!!cancelling}
                onOpenChange={(v) => !v && setCancelling(null)}
                title={t("einvoice.cancel_title", { number: cancelling?.invoice_no ?? cancelling?.order_code ?? "" })}
                description={t("einvoice.cancel_hint")}
                confirmLabel={t("einvoice.cancel")}
                onConfirm={async (reason) => {
                    try {
                        const res = await cancelEInvoice(cancelling!.id, reason);
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

export default EInvoicesTab;
