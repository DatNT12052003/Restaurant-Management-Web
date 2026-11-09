import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Banknote, CircleCheck, CreditCard, Landmark, Printer, QrCode, TicketPercent, Undo2, X } from "lucide-react";

import {
    applyOrderDiscount,
    cancelPayment,
    completeOrder,
    confirmPayment,
    createPayment,
    createQrPayment,
    failPayment,
    getInvoice,
    refundPayment,
    removeOrderDiscount,
} from "@/apis";
import TransferQr from "@/components/common/TransferQr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPEN_ORDER_STATUSES, ORDER_STATUS_STYLE } from "@/constants/order";
import { PAYMENT_METHODS, PAYMENT_STATUS_STYLE, WAITING_PAYMENT_STATUSES, cashSuggestions } from "@/constants/payment";
import type { PaymentMethodEnum } from "@/enum";
import { useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { IInvoice, IPayment, IQrPayment } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InvoiceView } from "./InvoiceDialog";
import LoyaltyCard from "./LoyaltyCard";

const METHOD_ICON: Record<PaymentMethodEnum, React.ComponentType<{ className?: string }>> = {
    cash: Banknote,
    card: CreditCard,
    transfer: Landmark,
};

interface CheckoutPanelProps {
    orderId: number;
    /** Số món chưa phục vụ xong (từ danh sách order đang mở); hoàn tất cần bằng 0 */
    unfinished: number;
    onPrint: () => void;
}

/** Thanh toán một order: hóa đơn, mã giảm giá, thu nhiều lần / nhiều phương thức, hoàn tiền */
export const CheckoutPanel = ({ orderId, unfinished, onPrint }: CheckoutPanelProps) => {
    const { t } = useTranslation("admin");
    const can = usePermission();

    const fetcher = useCallback(async () => {
        try {
            return (await getInvoice(orderId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [orderId]);
    const { data: invoice, loading, reload } = useAsyncData(fetcher);
    useRealtime(["payment:changed", "order:updated", "order_item:status_changed", "order:round_sent"], reload);

    const [busy, setBusy] = useState(false);
    const [code, setCode] = useState("");
    const [refunding, setRefunding] = useState<IPayment | null>(null);
    // Giai đoạn 14: mã QR chuyển khoản đang hiển thị
    const [qr, setQr] = useState<IQrPayment | null>(null);

    /** Tạo (hoặc lấy lại) mã QR; mã cùng số tiền còn hạn thì backend trả lại mã cũ */
    const openQr = async (amount?: number) => {
        setBusy(true);
        try {
            const res = await createQrPayment(orderId, amount);
            setQr(res.data ?? null);
            reload();
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const run = async (action: () => Promise<{ message: string }>) => {
        setBusy(true);
        try {
            const res = await action();
            toast.success(res.message);
            reload();
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setBusy(false);
        }
    };

    if (loading && !invoice) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
    if (!invoice) return null;

    const open = OPEN_ORDER_STATUSES.includes(invoice.order.status);
    const due = Math.max(0, invoice.remaining - pendingSum(invoice));
    const canComplete = open && invoice.remaining <= 0 && pendingSum(invoice) === 0 && unfinished === 0;

    return (
        <div className="grid gap-4">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                        <CardTitle className="flex flex-wrap items-center gap-2">
                            {invoice.order.code}
                            <Badge variant="outline" className={ORDER_STATUS_STYLE[invoice.order.status]}>
                                {t(`status.order.${invoice.order.status}`)}
                            </Badge>
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {invoice.order.tables.join(", ")} · {t("reservation.guests", { count: invoice.order.guest_count })}
                        </p>
                        {open && unfinished > 0 && (
                            <p className="mt-1 text-xs text-amber-600">{t("cashier.unfinished_hint", { count: unfinished })}</p>
                        )}
                    </div>
                    <Button size="sm" variant="outline" onClick={onPrint}>
                        <Printer className="h-4 w-4" />
                        {t("cashier.print")}
                    </Button>
                </CardHeader>
                <CardContent>
                    <InvoiceView invoice={invoice} />
                </CardContent>
            </Card>

            {/* Mã giảm giá */}
            {open && can("discount.apply") && (
                <Card>
                    <CardContent className="grid gap-2 pt-6">
                        <Label htmlFor="discount-code" className="flex items-center gap-1.5">
                            <TicketPercent className="h-4 w-4" />
                            {t("cashier.discount_code")}
                        </Label>
                        {invoice.discount ? (
                            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <span>
                                    <strong>{invoice.discount.code}</strong> · {invoice.discount.name} · -{formatMoney(invoice.discount.amount)}
                                    {Number(invoice.discount.amount) === 0 && (
                                        <span className="ml-1 text-xs text-amber-600">{t("cashier.discount_zero")}</span>
                                    )}
                                </span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    disabled={busy}
                                    onClick={() => run(() => removeOrderDiscount(orderId))}
                                    aria-label={t("cashier.remove_discount")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <form
                                className="flex gap-2"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (code.trim() && (await run(() => applyOrderDiscount(orderId, code.trim())))) setCode("");
                                }}
                            >
                                <Input
                                    id="discount-code"
                                    className="uppercase"
                                    placeholder={t("cashier.discount_placeholder")}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                                <Button type="submit" variant="outline" disabled={busy || !code.trim()}>
                                    {t("cashier.apply")}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Giai đoạn 13: khách hàng và điểm thưởng */}
            {open && can("loyalty.view") && <LoyaltyCard key={orderId} invoice={invoice} onChanged={reload} />}

            {/* Thu tiền */}
            {open && can("payment.create") && due > 0 && (
                <PaymentForm
                    key={`${orderId}-${due}`}
                    due={due}
                    busy={busy}
                    staffName={invoice.order.staff_name}
                    onSubmit={(payload) => run(() => createPayment(orderId, payload))}
                    onQr={invoice.transfer_qr_enabled ? openQr : undefined}
                />
            )}

            {/* Các giao dịch */}
            {invoice.payments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("cashier.payments")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {invoice.payments.map((p) => {
                            const Icon = METHOD_ICON[p.method];
                            const refundable = Number(p.amount) - Number(p.refunded_amount ?? 0);
                            return (
                                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {p.type === "refund" ? `${t("cashier.refund_label")} -` : ""}
                                        {formatMoney(p.amount)}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {t(`cashier.method.${p.method}`)}
                                        {p.reference && ` · ${p.reference}`} · {formatTime(p.paid_at ?? p.created_at)}
                                        {p.cashier_name && ` · ${p.cashier_name}`}
                                    </span>
                                    {Number(p.tip_amount ?? 0) > 0 && (
                                        <span className="text-xs text-emerald-700 dark:text-emerald-300">
                                            {t("cashier.tip_line", { amount: formatMoney(p.tip_amount), name: p.tip_staff_name || "—" })}
                                        </span>
                                    )}
                                    {p.note && <span className="w-full text-xs italic text-muted-foreground">{p.note}</span>}
                                    <div className="ml-auto flex items-center gap-1">
                                        <Badge variant="outline" className={PAYMENT_STATUS_STYLE[p.status]}>
                                            {t(`status.payment.${p.status}`)}
                                        </Badge>
                                        {can("payment.create") && p.gateway_ref && p.status === "processing" && open && (
                                            <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => openQr(Number(p.amount))}>
                                                <QrCode className="h-3.5 w-3.5" />
                                                {t("cashier.qr.show")}
                                            </Button>
                                        )}
                                        {can("payment.create") && WAITING_PAYMENT_STATUSES.includes(p.status) && (
                                            <>
                                                <Button size="sm" className="h-7" disabled={busy} onClick={() => run(() => confirmPayment(p.id))}>
                                                    {t("cashier.confirm")}
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => run(() => failPayment(p.id))}>
                                                    {t("cashier.mark_failed")}
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7" disabled={busy} onClick={() => run(() => cancelPayment(p.id))}>
                                                    {t("common.cancel")}
                                                </Button>
                                            </>
                                        )}
                                        {can("payment.refund") && p.type === "payment" && ["paid", "refunded"].includes(p.status) && refundable > 0 && (
                                            <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => setRefunding(p)}>
                                                <Undo2 className="h-3.5 w-3.5" />
                                                {t("cashier.refund")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {canComplete && (can("payment.create") || can("order.update")) && (
                <Button disabled={busy} onClick={() => run(() => completeOrder(orderId))}>
                    <CircleCheck className="h-4 w-4" />
                    {t("cashier.complete")}
                </Button>
            )}

            <QrDialog qr={qr} invoice={invoice} onOpenChange={(v) => !v && setQr(null)} />

            <RefundDialog
                payment={refunding}
                onOpenChange={(v) => !v && setRefunding(null)}
                onSubmit={(amount, reason) => run(() => refundPayment(refunding!.id, amount, reason))}
            />
        </div>
    );
};

/** Tổng giao dịch đang chờ xác nhận */
const pendingSum = (invoice: IInvoice) =>
    invoice.payments
        .filter((p) => p.type === "payment" && WAITING_PAYMENT_STATUSES.includes(p.status))
        .reduce((s, p) => s + Number(p.amount), 0);

/** Form thu tiền: phương thức, số tiền (mặc định số còn phải thu), tiền khách đưa / mã giao dịch */
const PaymentForm = ({
    due,
    busy,
    staffName,
    onSubmit,
    onQr,
}: {
    due: number;
    busy: boolean;
    /** Nhân viên phụ trách order (nhận tip) */
    staffName: string | null;
    onSubmit: (payload: Parameters<typeof createPayment>[1]) => Promise<boolean>;
    /** Giai đoạn 14: có khi nhà hàng đã bật chuyển khoản QR (xác nhận tự động) */
    onQr?: (amount: number) => Promise<boolean>;
}) => {
    const { t } = useTranslation("admin");
    const [method, setMethod] = useState<PaymentMethodEnum>("cash");
    const [amount, setAmount] = useState(String(due));
    const [received, setReceived] = useState("");
    const [reference, setReference] = useState("");
    const [pending, setPending] = useState(false);
    const [tip, setTip] = useState("");

    const value = Number(amount) || 0;
    const tipValue = Math.max(0, Number(tip) || 0);
    const receivedValue = Number(received) || 0;
    // Tiền mặt: khách đưa phải đủ cả tiền thanh toán và tip
    const change = method === "cash" && received ? receivedValue - value - tipValue : 0;
    const invalid =
        value <= 0 || value > due || Number(tip) < 0 || (method === "cash" && !!received && receivedValue < value + tipValue);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (invalid) return;
        await onSubmit({
            method,
            amount: value,
            received_amount: method === "cash" && received ? receivedValue : null,
            reference: method !== "cash" ? reference.trim() || null : null,
            confirm: method === "cash" ? true : !pending,
            tip_amount: tipValue > 0 ? tipValue : undefined,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t("cashier.take_payment", { amount: formatMoney(due) })}</CardTitle>
            </CardHeader>
            <CardContent>
                <form className="grid gap-3" onSubmit={submit}>
                    <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map((m) => {
                            const Icon = METHOD_ICON[m];
                            return (
                                <Button key={m} type="button" variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                                    <Icon className="h-4 w-4" />
                                    {t(`cashier.method.${m}`)}
                                </Button>
                            );
                        })}
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="pay-amount">{t("cashier.amount")}</Label>
                        <Input id="pay-amount" type="number" min={1} max={due} value={amount} onChange={(e) => setAmount(e.target.value)} />
                        {value > due && <p className="text-xs text-destructive">{t("cashier.amount_too_high")}</p>}
                        {value < due && value > 0 && <p className="text-xs text-muted-foreground">{t("cashier.split_hint", { rest: formatMoney(due - value) })}</p>}
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="pay-tip">{t("cashier.tip")}</Label>
                        <Input id="pay-tip" type="number" min={0} step={1000} placeholder="0" value={tip} onChange={(e) => setTip(e.target.value)} />
                        <p className="text-xs text-muted-foreground">{t("cashier.tip_hint", { name: staffName || "—" })}</p>
                    </div>
                    {method === "cash" ? (
                        <div className="grid gap-1.5">
                            <Label htmlFor="pay-received">{t("cashier.received")}</Label>
                            <Input id="pay-received" type="number" min={0} value={received} onChange={(e) => setReceived(e.target.value)} />
                            <div className="flex flex-wrap gap-1.5">
                                {cashSuggestions(value + tipValue).map((s) => (
                                    <Button key={s} type="button" size="sm" variant="secondary" className="h-7" onClick={() => setReceived(String(s))}>
                                        {formatMoney(s)}
                                    </Button>
                                ))}
                            </div>
                            {received && (
                                <p className={cn("text-sm", change < 0 ? "text-destructive" : "font-semibold")}>
                                    {change < 0 ? t("cashier.received_too_low") : `${t("cashier.change")}: ${formatMoney(change)}`}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-1.5">
                            {method === "transfer" && onQr && (
                                <div className="grid gap-1.5 rounded-md border border-dashed p-3">
                                    <Button type="button" variant="secondary" disabled={busy || value <= 0 || value > due} onClick={() => onQr(value)}>
                                        <QrCode className="h-4 w-4" />
                                        {t("cashier.qr.create", { amount: formatMoney(value) })}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">{t("cashier.qr.hint")}</p>
                                </div>
                            )}
                            <Label htmlFor="pay-ref">{t("cashier.reference")}</Label>
                            <Input id="pay-ref" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={pending} onCheckedChange={(v) => setPending(v === true)} />
                                {t("cashier.pending_hint")}
                            </label>
                        </div>
                    )}
                    <Button type="submit" disabled={busy || invalid}>
                        {busy
                            ? t("common.processing")
                            : tipValue > 0
                              ? t("cashier.collect_with_tip", { amount: formatMoney(value), tip: formatMoney(tipValue) })
                              : t("cashier.collect", { amount: formatMoney(value) })}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

/** Giai đoạn 14: mã QR cho khách quét; khi webhook ngân hàng báo về, hóa đơn tải lại và hộp thoại báo đã nhận tiền */
const QrDialog = ({ qr, invoice, onOpenChange }: { qr: IQrPayment | null; invoice: IInvoice; onOpenChange: (open: boolean) => void }) => {
    const { t } = useTranslation("admin");
    const status = qr ? (invoice.payments.find((p) => p.id === qr.payment.id)?.status ?? qr.payment.status) : null;
    return (
        <Dialog open={!!qr} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t("cashier.qr.title", { code: invoice.order.code })}</DialogTitle>
                </DialogHeader>
                {qr && status === "paid" ? (
                    <div className="grid justify-items-center gap-2 py-6 text-center" data-testid="qr-paid">
                        <CircleCheck className="h-12 w-12 text-emerald-600" />
                        <p className="font-semibold">{t("cashier.qr.paid", { amount: formatMoney(qr.qr.amount) })}</p>
                    </div>
                ) : qr && status === "processing" ? (
                    <>
                        <TransferQr qr={qr.qr} />
                        <p className="text-center text-xs text-muted-foreground">{t("cashier.qr.waiting")}</p>
                    </>
                ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("cashier.qr.closed")}</p>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.close")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

/** Hoàn tiền một giao dịch (cần lý do; được ghi nhật ký) */
const RefundDialog = ({
    payment,
    onOpenChange,
    onSubmit,
}: {
    payment: IPayment | null;
    onOpenChange: (open: boolean) => void;
    onSubmit: (amount: number, reason: string) => Promise<boolean>;
}) => (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            {payment && <RefundBody key={payment.id} payment={payment} onClose={() => onOpenChange(false)} onSubmit={onSubmit} />}
        </DialogContent>
    </Dialog>
);

const RefundBody = ({
    payment,
    onClose,
    onSubmit,
}: {
    payment: IPayment;
    onClose: () => void;
    onSubmit: (amount: number, reason: string) => Promise<boolean>;
}) => {
    const { t } = useTranslation("admin");
    const max = Number(payment.amount) - Number(payment.refunded_amount ?? 0);
    const [amount, setAmount] = useState(String(max));
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const value = Number(amount) || 0;
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSubmit(value, reason.trim());
        setBusy(false);
        if (ok) onClose();
    };
    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t("cashier.refund_title", { amount: formatMoney(payment.amount), method: t(`cashier.method.${payment.method}`) })}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="refund-amount">{t("cashier.refund_amount", { max: formatMoney(max) })}</Label>
                    <Input id="refund-amount" type="number" min={1} max={max} required value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="refund-reason">{t("order.reason")} *</Label>
                    <Textarea id="refund-reason" rows={3} required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
                    <p className="text-xs text-muted-foreground">{t("cashier.refund_audit_hint")}</p>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" variant="destructive" disabled={busy || value <= 0 || value > max || !reason.trim()}>
                    {busy ? t("common.processing") : t("cashier.refund")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default CheckoutPanel;
