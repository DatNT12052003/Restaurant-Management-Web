import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Receipt, Search } from "lucide-react";

import { getActiveOrders, getPayments } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_STATUS_STYLE } from "@/constants/payment";
import type { PaymentMethodEnum, PaymentStatusEnum, PaymentTypeEnum } from "@/enum";
import { useAppSelector, useAsyncData, useRealtime } from "@/hooks";
import type { IOrder } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatDateTime, startOfDay, toDateInput } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import CheckoutPanel from "./CheckoutPanel";
import InvoiceDialog from "./InvoiceDialog";

const UNFINISHED = ["pending", "confirmed", "cooking", "ready"] as const;
const unfinishedOf = (o: IOrder) => UNFINISHED.reduce((s, k) => s + (o.line_counts?.[k] ?? 0), 0);

/** Thu ngân (đặc tả 4.8): order chờ thanh toán, hóa đơn, mã giảm giá, thu tiền, lịch sử giao dịch */
const Cashier = () => {
    const { t } = useTranslation("admin");
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const needBranch = isAdmin && !currentBranch;

    const [invoiceOf, setInvoiceOf] = useState<number | null>(null);

    if (needBranch) {
        return (
            <div>
                <PageHeader title={t("cashier.title")} description={t("cashier.description")} />
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("order.select_branch_first")}</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={t("cashier.title")} description={t("cashier.description")} />
            <Tabs defaultValue="checkout">
                <TabsList className="mb-4">
                    <TabsTrigger value="checkout">{t("cashier.tab_checkout")}</TabsTrigger>
                    <TabsTrigger value="history">{t("cashier.tab_history")}</TabsTrigger>
                </TabsList>
                <TabsContent value="checkout">
                    <CheckoutTab restaurantId={restaurantId} onPrint={setInvoiceOf} />
                </TabsContent>
                <TabsContent value="history">
                    <PaymentHistory restaurantId={restaurantId} onInvoice={setInvoiceOf} />
                </TabsContent>
            </Tabs>
            <InvoiceDialog orderId={invoiceOf} onOpenChange={(v) => !v && setInvoiceOf(null)} />
        </div>
    );
};

/** Danh sách order đang mở (order đã phục vụ xong lên đầu) + panel thanh toán */
const CheckoutTab = ({ restaurantId, onPrint }: { restaurantId?: number; onPrint: (orderId: number) => void }) => {
    const { t } = useTranslation("admin");
    const [selected, setSelected] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    const fetcher = useCallback(async () => {
        try {
            return (await getActiveOrders(restaurantId)).data || [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["order:created", "order:updated", "order:round_sent", "order_item:status_changed", "payment:changed"], reload);

    const orders = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data || [])
            .filter((o) => !q || o.code.toLowerCase().includes(q) || o.tables.some((tb) => tb.name.toLowerCase().includes(q)))
            .sort((a, b) => Number(unfinishedOf(a) > 0) - Number(unfinishedOf(b) > 0) || a.created_at.localeCompare(b.created_at));
    }, [data, search]);
    const current = (data || []).find((o) => o.id === selected);

    return (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <div className="grid content-start gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder={t("cashier.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {loading && !data ? (
                    <p className="text-muted-foreground">{t("common.loading")}</p>
                ) : orders.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">{t("cashier.no_open_orders")}</CardContent>
                    </Card>
                ) : (
                    orders.map((o) => {
                        const left = unfinishedOf(o);
                        const due = Number(o.total) - Number(o.paid_amount ?? 0);
                        return (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => setSelected(o.id)}
                                className={cn(
                                    "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                                    o.id === selected && "border-primary bg-accent",
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{o.tables.map((tb) => tb.name).join(", ")}</span>
                                    <span className="font-semibold">{formatMoney(o.total)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>{o.code}</span>
                                    {left === 0 ? (
                                        <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-900">
                                            {t("cashier.ready_to_pay")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">{t("cashier.items_left", { count: left })}</Badge>
                                    )}
                                    {Number(o.paid_amount ?? 0) > 0 && (
                                        <span>{due > 0 ? t("cashier.due_left", { amount: formatMoney(due) }) : t("cashier.fully_paid")}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
            <div>
                {selected ? (
                    <CheckoutPanel
                        key={selected}
                        orderId={selected}
                        unfinished={current ? unfinishedOf(current) : 0}
                        onPrint={() => onPrint(selected)}
                    />
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                            <Receipt className="h-8 w-8" />
                            {t("cashier.select_order")}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

/** Lịch sử giao dịch: lọc ngày, phương thức, loại, trạng thái; tổng thu / hoàn / ròng */
const PaymentHistory = ({ restaurantId, onInvoice }: { restaurantId?: number; onInvoice: (orderId: number) => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [date, setDate] = useState(() => toDateInput(new Date()));
    const [method, setMethod] = useState<PaymentMethodEnum | "all">("all");
    const [type, setType] = useState<PaymentTypeEnum | "all">("all");
    const [status, setStatus] = useState<PaymentStatusEnum | "all">("all");
    const [page, setPage] = useState(1);

    const fetcher = useCallback(async () => {
        const query: NonNullable<Parameters<typeof getPayments>[0]> = { currentPage: page, limit: 20 };
        if (date) {
            const from = startOfDay(date);
            query.from = from.toISOString();
            query.to = addDays(from, 1).toISOString();
        }
        if (method !== "all") query.method = method;
        if (type !== "all") query.type = type;
        if (status !== "all") query.status = status;
        try {
            return (await getPayments(query, restaurantId)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, date, method, type, status, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["payment:changed"], reload, 800);

    const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
        set(v);
        setPage(1);
    };

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Input type="date" className="w-auto" value={date} onChange={(e) => resetPage(setDate)(e.target.value)} />
                <Select value={method} onValueChange={(v) => resetPage(setMethod)(v as PaymentMethodEnum | "all")}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("cashier.all_methods")}</SelectItem>
                        {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                                {t(`cashier.method.${m}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={type} onValueChange={(v) => resetPage(setType)(v as PaymentTypeEnum | "all")}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("cashier.all_types")}</SelectItem>
                        <SelectItem value="payment">{t("cashier.type.payment")}</SelectItem>
                        <SelectItem value="refund">{t("cashier.type.refund")}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => resetPage(setStatus)(v as PaymentStatusEnum | "all")}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {PAYMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`status.payment.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {data && (
                <div className="grid gap-2 sm:grid-cols-3">
                    {(["collected", "refunded", "net"] as const).map((k) => (
                        <Card key={k}>
                            <CardContent className="py-4">
                                <p className="text-xs text-muted-foreground">{t(`cashier.summary.${k}`)}</p>
                                <p className="text-xl font-semibold">{formatMoney(data.summary[k])}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("cashier.time")}</TableHead>
                                <TableHead>{t("order.code")}</TableHead>
                                <TableHead>{t("cashier.method_label")}</TableHead>
                                <TableHead className="text-right">{t("cashier.amount")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                                <TableHead>{t("cashier.cashier")}</TableHead>
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
                            ) : (data?.payments.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.payments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(p.paid_at ?? p.created_at, i18n.language)}</TableCell>
                                        <TableCell>{p.order_code}</TableCell>
                                        <TableCell>
                                            {p.type === "refund" && <Badge variant="outline" className="mr-1">{t("cashier.type.refund")}</Badge>}
                                            {t(`cashier.method.${p.method}`)}
                                            {p.reference && <span className="text-xs text-muted-foreground"> · {p.reference}</span>}
                                        </TableCell>
                                        <TableCell className={cn("text-right", p.type === "refund" && "text-destructive")}>
                                            {p.type === "refund" ? "-" : ""}
                                            {formatMoney(p.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={PAYMENT_STATUS_STYLE[p.status]}>
                                                {t(`status.payment.${p.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{p.cashier_name || "—"}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="ghost" onClick={() => onInvoice(p.order_id)}>
                                                {t("cashier.invoice_short")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}
        </div>
    );
};

export default Cashier;
