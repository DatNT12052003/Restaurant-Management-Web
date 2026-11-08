import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getSupplierBill, getSupplierBills, getSuppliers, paySupplierBill } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_METHODS } from "@/constants/payment";
import type { PaymentMethodEnum } from "@/enum";
import { useAsyncData, usePermission } from "@/hooks";
import type { SupplierBillStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SupplierBillStatusEnum, string> = {
    unpaid: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    partial: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    paid: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
};

/** Công nợ nhà cung cấp: mỗi lần nhận hàng theo đơn một khoản phải trả, có hạn thanh toán */
const PayablesTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t } = useTranslation("admin");
    const [status, setStatus] = useState<SupplierBillStatusEnum | "open" | "all">("open");
    const [supplier, setSupplier] = useState("all");
    const [overdue, setOverdue] = useState(false);
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<number | null>(null);

    const suppliersFetcher = useCallback(async () => (await getSuppliers()).data || [], []);
    const { data: suppliers = [] } = useAsyncData(suppliersFetcher);

    const fetcher = useCallback(async () => {
        try {
            const query = {
                currentPage: page,
                limit: 20,
                orderBy: [{ field: "due_date", direction: "asc" as const }],
                ...(status === "open" ? { filters: [{ field: "status", operator: "!=" as const, value: "paid" }] } : {}),
                ...(status !== "all" && status !== "open" ? { status } : {}),
                ...(supplier !== "all" ? { supplier_id: Number(supplier) } : {}),
                ...(overdue ? { overdue: true } : {}),
            };
            return (await getSupplierBills(query, restaurantId)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, status, supplier, overdue, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);

    return (
        <div className="grid gap-3">
            {data && (
                <div className="grid gap-2 sm:grid-cols-3">
                    <Card>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("purchasing.payable.outstanding")}</p>
                            <p className="text-xl font-semibold">{formatMoney(data.summary.outstanding)}</p>
                        </CardContent>
                    </Card>
                    <Card className={cn(Number(data.summary.overdue) > 0 && "border-destructive")}>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("purchasing.payable.overdue")}</p>
                            <p className={cn("text-xl font-semibold", Number(data.summary.overdue) > 0 && "text-destructive")}>{formatMoney(data.summary.overdue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("purchasing.payable.bills")}</p>
                            <p className="text-xl font-semibold">{data.summary.bills}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as typeof status);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44" aria-label={t("reservation.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open">{t("purchasing.payable.status.open")}</SelectItem>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {(["unpaid", "partial", "paid"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`purchasing.payable.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={supplier}
                    onValueChange={(v) => {
                        setSupplier(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-56" aria-label={t("purchasing.supplier.name")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("purchasing.payable.all_suppliers")}</SelectItem>
                        {suppliers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={overdue}
                        onCheckedChange={(v) => {
                            setOverdue(v === true);
                            setPage(1);
                        }}
                    />
                    {t("purchasing.payable.overdue_only")}
                </label>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("purchasing.supplier.name")}</TableHead>
                                <TableHead>{t("purchasing.payable.source")}</TableHead>
                                <TableHead>{t("purchasing.payable.due_date")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.payable.amount")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.payable.remaining")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !data?.bills.length ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.bills.map((b) => (
                                    <TableRow key={b.id} className="cursor-pointer" onClick={() => setOpenId(b.id)}>
                                        <TableCell className="font-medium">
                                            {b.supplier_name}
                                            {!restaurantId && <span className="block text-xs text-muted-foreground">{b.restaurant_name}</span>}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {b.purchase_order_code || "—"}
                                            <span className="block text-xs text-muted-foreground">{b.receipt_code}</span>
                                        </TableCell>
                                        <TableCell className={cn("tabular-nums", b.overdue && "font-semibold text-destructive")}>
                                            {b.due_date}
                                            {b.overdue && <span className="block text-xs">{t("purchasing.payable.is_overdue")}</span>}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{formatMoney(b.amount)}</TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">{formatMoney(b.remaining)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={STATUS_STYLE[b.status]}>
                                                {t(`purchasing.payable.status.${b.status}`)}
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

            <BillDialog billId={openId} onOpenChange={(v) => !v && setOpenId(null)} onPaid={reload} />
        </div>
    );
};

const BillDialog = ({ billId, onOpenChange, onPaid }: { billId: number | null; onOpenChange: (open: boolean) => void; onPaid: () => void }) => (
    <Dialog open={!!billId} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
            {billId && <BillBody key={billId} billId={billId} onPaid={onPaid} />}
        </DialogContent>
    </Dialog>
);

const BillBody = ({ billId, onPaid }: { billId: number; onPaid: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const fetcher = useCallback(async () => {
        try {
            return (await getSupplierBill(billId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [billId]);
    const { data: bill, loading, reload } = useAsyncData(fetcher);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethodEnum>("transfer");
    const [reference, setReference] = useState("");
    const [busy, setBusy] = useState(false);

    if (!bill) {
        return (
            <DialogHeader>
                <DialogTitle>{t("purchasing.payable.title")}</DialogTitle>
                <DialogDescription>{loading ? t("common.loading") : t("common.no_data")}</DialogDescription>
            </DialogHeader>
        );
    }
    const remaining = Number(bill.remaining);
    const value = amount === "" ? remaining : Number(amount);
    const invalid = !(value > 0) || value > remaining;

    const pay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (invalid) return;
        setBusy(true);
        try {
            toast.success((await paySupplierBill(bill.id, { amount: value, method, reference: reference.trim() || null })).message);
            setAmount("");
            setReference("");
            reload();
            onPaid();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("purchasing.payable.bill_title", { name: bill.supplier_name })}</DialogTitle>
                <DialogDescription>
                    {[bill.purchase_order_code, bill.receipt_code].filter(Boolean).join(" · ")} · {t("purchasing.payable.due_on", { date: bill.due_date })}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1 text-sm">
                <div className="flex justify-between">
                    <span>{t("purchasing.payable.amount")}</span>
                    <strong>{formatMoney(bill.amount)}</strong>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                    <span>{t("purchasing.payable.paid")}</span>
                    <span>{formatMoney(bill.paid_amount)}</span>
                </div>
                <div className={cn("flex justify-between text-base font-semibold", bill.overdue && "text-destructive")}>
                    <span>{t("purchasing.payable.remaining")}</span>
                    <span>{formatMoney(bill.remaining)}</span>
                </div>
            </div>
            {!!bill.payments?.length && (
                <div className="divide-y rounded-md border text-sm">
                    {bill.payments.map((p) => (
                        <div key={p.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                            <span>
                                {formatDateTime(p.paid_at, i18n.language)} · {t(`cashier.method.${p.method}`)}
                                {p.reference && ` · ${p.reference}`} · {p.created_by_name || "—"}
                            </span>
                            <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
                        </div>
                    ))}
                </div>
            )}
            {can("payable.pay") && remaining > 0 && (
                <form onSubmit={pay} className="grid gap-3 border-t pt-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="bill-amount">{t("purchasing.payable.pay_amount")}</Label>
                            <Input id="bill-amount" type="number" min={1} max={remaining} placeholder={String(remaining)} value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>{t("purchasing.payable.method")}</Label>
                            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethodEnum)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {t(`cashier.method.${m}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="bill-ref">{t("cashier.reference")}</Label>
                        <Input id="bill-ref" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={busy || invalid}>
                            {busy ? t("common.processing") : t("purchasing.payable.pay", { amount: formatMoney(value || 0) })}
                        </Button>
                    </DialogFooter>
                </form>
            )}
        </>
    );
};

export default PayablesTab;
