import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Printer } from "lucide-react";

import { getInvoice } from "@/apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAsyncData } from "@/hooks";
import type { IInvoice } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

/** Nội dung hóa đơn (khổ giấy in nhiệt 80mm khi in) */
export const InvoiceView = ({ invoice }: { invoice: IInvoice }) => {
    const { t, i18n } = useTranslation("admin");
    const payments = invoice.payments.filter((p) => ["paid", "refunded"].includes(p.status));
    const row = (label: string, value: string, strong = false) => (
        <div className={strong ? "flex justify-between text-base font-bold" : "flex justify-between"}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
    return (
        <div className="grid gap-3 font-mono text-sm">
            <div className="text-center">
                <p className="text-base font-bold uppercase">{invoice.restaurant.name}</p>
                <p className="text-xs">{invoice.restaurant.address}</p>
                <p className="mt-2 font-semibold">{t("cashier.invoice.title")}</p>
            </div>
            <div className="grid gap-0.5 text-xs">
                <span>
                    {t("order.code")}: {invoice.order.code}
                </span>
                <span>
                    {t("reservation.form.tables")}: {invoice.order.tables.join(", ") || "—"} ·{" "}
                    {t("reservation.guests", { count: invoice.order.guest_count })}
                </span>
                <span>
                    {t("order.opened_at")}: {formatDateTime(invoice.order.created_at, i18n.language)}
                </span>
                {invoice.order.completed_at && (
                    <span>
                        {t("cashier.invoice.completed_at")}: {formatDateTime(invoice.order.completed_at, i18n.language)}
                    </span>
                )}
                {invoice.order.staff_name && (
                    <span>
                        {t("cashier.invoice.staff")}: {invoice.order.staff_name}
                    </span>
                )}
            </div>
            <table className="w-full border-y border-dashed text-xs">
                <thead>
                    <tr className="border-b border-dashed">
                        <th className="py-1 text-left font-semibold">{t("cashier.invoice.item")}</th>
                        <th className="py-1 text-right font-semibold">{t("cashier.invoice.qty")}</th>
                        <th className="py-1 text-right font-semibold">{t("cashier.invoice.amount")}</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.lines.map((l) => (
                        <tr key={`${l.kind}-${l.item_id}-${l.unit_price}`} className="align-top">
                            <td className="py-0.5">
                                {l.name}
                                <div className="text-[11px] opacity-70">{formatMoney(l.unit_price)}</div>
                            </td>
                            <td className="py-0.5 text-right">{l.quantity}</td>
                            <td className="py-0.5 text-right">{formatMoney(l.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="grid gap-0.5">
                {row(t("order.subtotal"), formatMoney(invoice.subtotal))}
                {Number(invoice.discount_amount) - Number(invoice.points_discount ?? 0) > 0 &&
                    row(
                        `${t("order.discount")}${invoice.discount ? ` (${invoice.discount.code})` : ""}`,
                        `-${formatMoney(Number(invoice.discount_amount) - Number(invoice.points_discount ?? 0))}`,
                    )}
                {Number(invoice.points_discount ?? 0) > 0 &&
                    row(t("loyalty.invoice_points", { count: invoice.points_redeemed }), `-${formatMoney(invoice.points_discount)}`)}
                {Number(invoice.service_fee) > 0 &&
                    row(t("cashier.service_fee", { rate: Number(invoice.service_fee_rate) }), formatMoney(invoice.service_fee))}
                {Number(invoice.tax) > 0 && row(t("cashier.tax", { rate: Number(invoice.tax_rate) }), formatMoney(invoice.tax))}
                {row(t("order.total"), formatMoney(invoice.total), true)}
            </div>
            {payments.length > 0 && (
                <div className="grid gap-0.5 border-t border-dashed pt-2 text-xs">
                    {payments.map((p) => (
                        <div key={p.id} className="flex justify-between">
                            <span>
                                {p.type === "refund" ? t("cashier.refund_label") : t(`cashier.method.${p.method}`)}
                                {p.change_amount && Number(p.change_amount) > 0
                                    ? ` · ${t("cashier.received")} ${formatMoney(p.received_amount)} · ${t("cashier.change")} ${formatMoney(p.change_amount)}`
                                    : ""}
                            </span>
                            <span>
                                {p.type === "refund" ? "-" : ""}
                                {formatMoney(p.amount)}
                            </span>
                        </div>
                    ))}
                    {row(t("cashier.paid"), formatMoney(invoice.paid))}
                    {(invoice.tip_total ?? 0) > 0 && row(t("cashier.tip_received"), formatMoney(invoice.tip_total))}
                    {invoice.remaining !== 0 &&
                        row(invoice.remaining > 0 ? t("cashier.remaining") : t("cashier.overpaid"), formatMoney(Math.abs(invoice.remaining)))}
                </div>
            )}
            <p className="text-center text-xs">{t("cashier.invoice.thanks")}</p>
        </div>
    );
};

/** Xem và in hóa đơn của một order */
export const InvoiceDialog = ({ orderId, onOpenChange }: { orderId: number | null; onOpenChange: (open: boolean) => void }) => {
    const { t } = useTranslation("admin");
    return (
        <Dialog open={!!orderId} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
                <DialogHeader className="no-print">
                    <DialogTitle>{t("cashier.invoice.title")}</DialogTitle>
                </DialogHeader>
                {orderId && <InvoiceBody key={orderId} orderId={orderId} />}
                <DialogFooter className="no-print">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.close")}
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="h-4 w-4" />
                        {t("cashier.print")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const InvoiceBody = ({ orderId }: { orderId: number }) => {
    const { t } = useTranslation("admin");
    const fetcher = useCallback(async () => {
        try {
            return (await getInvoice(orderId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [orderId]);
    const { data, loading } = useAsyncData(fetcher);
    if (loading && !data) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    if (!data) return null;
    return (
        <div className="print-area rounded-md border bg-white p-4 text-black">
            <InvoiceView invoice={data} />
        </div>
    );
};

export default InvoiceDialog;
