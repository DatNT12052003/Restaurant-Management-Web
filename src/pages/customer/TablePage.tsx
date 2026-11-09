import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Clock, Landmark, ShoppingBag, XCircle } from "lucide-react";

import { createTableQr, getMyTableRequests, getPublicMenu, getPublicTable, sendTableFeedback, sendTableRequest } from "@/apis";
import TransferQr from "@/components/common/TransferQr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAsyncData } from "@/hooks";
import type { IPublicMenuItem, IPublicTablePayment } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { browserToken } from "@/lib/customer";
import { formatMoney } from "@/lib/format";
import FeedbackForm from "./FeedbackForm";
import MenuList from "./MenuList";

const POLL_MS = 10_000;

type CartLine = { item: IPublicMenuItem; quantity: number; note: string };

/**
 * Trang khách mở khi quét mã QR ở bàn (`/t/:token`): xem thực đơn, gọi món (nhân viên xác nhận rồi mới gửi bếp),
 * xem món đã gọi và trạng thái yêu cầu; sau khi thanh toán xong thì đánh giá bữa ăn.
 */
const TablePage = () => {
    const { t } = useTranslation("public");
    const { token = "" } = useParams();
    const [clientToken] = useState(browserToken);
    const [version, setVersion] = useState(0);
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [cartOpen, setCartOpen] = useState(false);
    const [guests, setGuests] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [thanked, setThanked] = useState(false);

    // Làm mới trạng thái món / yêu cầu định kỳ
    useEffect(() => {
        const timer = window.setInterval(() => setVersion((v) => v + 1), POLL_MS);
        return () => window.clearInterval(timer);
    }, []);

    const tableFetcher = useCallback(async () => {
        void version;
        try {
            return { table: (await getPublicTable(token)).data!, error: null };
        } catch (error) {
            return { table: null, error: getErrorMessage(error) };
        }
    }, [token, version]);
    const { data: tableData } = useAsyncData(tableFetcher);
    const table = tableData?.table;
    const restaurantId = table?.restaurant.id;

    const menuFetcher = useCallback(async () => (restaurantId ? ((await getPublicMenu(restaurantId)).data ?? null) : null), [restaurantId]);
    const { data: menu } = useAsyncData(menuFetcher);
    const requestsFetcher = useCallback(async () => {
        void version;
        try {
            return (await getMyTableRequests(token, clientToken)).data ?? [];
        } catch {
            return [];
        }
    }, [token, clientToken, version]);
    const { data: requests = [] } = useAsyncData(requestsFetcher);

    if (!tableData) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    if (!table) return <p className="py-8 text-center text-destructive">{tableData.error}</p>;

    const lines = Object.values(cart);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const total = lines.reduce((s, l) => s + l.quantity * Number(l.item.price), 0);
    const quantities = Object.fromEntries(Object.entries(cart).map(([k, l]) => [k, l.quantity]));

    const change = (item: IPublicMenuItem, quantity: number) =>
        setCart((c) => {
            const key = `${item.kind}-${item.id}`;
            const next = { ...c };
            if (quantity <= 0) delete next[key];
            else next[key] = { item, quantity, note: c[key]?.note ?? "" };
            return next;
        });

    const send = async () => {
        setBusy(true);
        try {
            const res = await sendTableRequest(token, {
                client_token: clientToken,
                guest_count: guests ? Number(guests) : null,
                note: note.trim() || null,
                dishes: lines.filter((l) => l.item.kind === "dish").map((l) => ({ dish_id: l.item.id, quantity: l.quantity, note: l.note.trim() || null })),
                combos: lines.filter((l) => l.item.kind === "combo").map((l) => ({ combo_id: l.item.id, quantity: l.quantity, note: l.note.trim() || null })),
            });
            toast.success(res.message);
            setCart({});
            setNote("");
            setCartOpen(false);
            setVersion((v) => v + 1);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const feedback = async (payload: Parameters<typeof sendTableFeedback>[2]) => {
        try {
            toast.success((await sendTableFeedback(token, table.feedback_order!.id, payload)).message);
            setThanked(true);
            setVersion((v) => v + 1);
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <div className="grid gap-4 pb-24">
            <div>
                <p className="text-sm text-muted-foreground">{table.restaurant.name}</p>
                <h1 className="text-2xl font-bold">{t("table.title", { table: table.table.name, room: table.table.room_name })}</h1>
            </div>

            {thanked && (
                <Card>
                    <CardContent className="flex items-center gap-2 py-4 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-5" /> {t("feedback.thanks")}
                    </CardContent>
                </Card>
            )}
            {table.feedback_order && !thanked && (
                <Card className="border-amber-300">
                    <CardHeader>
                        <CardTitle className="text-base">{t("feedback.title")}</CardTitle>
                        <p className="text-sm text-muted-foreground">{t("feedback.for_order", { code: table.feedback_order.code })}</p>
                    </CardHeader>
                    <CardContent>
                        <FeedbackForm onSubmit={feedback} askPhone />
                    </CardContent>
                </Card>
            )}

            {requests.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("table.my_requests")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {requests.slice(0, 5).map((r) => (
                            <div key={r.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                                <span>{(r.lines ?? []).map((l) => `${l.quantity}× ${l.name}`).join(", ")}</span>
                                <Badge variant="outline" className="shrink-0 gap-1">
                                    {r.status === "pending" ? <Clock className="size-3" /> : r.status === "accepted" ? <CheckCircle2 className="size-3 text-emerald-600" /> : <XCircle className="size-3 text-destructive" />}
                                    {t(`table.request_status.${r.status}`)}
                                </Badge>
                                {r.reject_reason && <span className="sr-only">{r.reject_reason}</span>}
                            </div>
                        ))}
                        {requests.some((r) => r.status === "rejected" && r.reject_reason) && (
                            <p className="text-xs text-muted-foreground">{requests.find((r) => r.status === "rejected" && r.reject_reason)?.reject_reason}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {table.order && table.order.lines.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("table.ordered", { code: table.order.code })}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-1 text-sm">
                        {table.order.lines.map((l, i) => (
                            <div key={i} className="flex justify-between gap-2">
                                <span>
                                    {l.quantity}× {l.name} <span className="text-xs text-muted-foreground">· {t(`table.line_status.${l.status}`)}</span>
                                </span>
                                <span className="tabular-nums">{formatMoney(Number(l.price) * l.quantity)}</span>
                            </div>
                        ))}
                        <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                            <span>{t("table.total")}</span>
                            <span className="tabular-nums">{formatMoney(table.order.total)}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Giai đoạn 14: khách tự thanh toán chuyển khoản */}
            {table.order?.payment && Number(table.order.total) > 0 && (
                <TablePayment token={token} payment={table.order.payment} onChanged={() => setVersion((v) => v + 1)} />
            )}

            {!table.restaurant.qr_ordering_enabled ? (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">{t("table.ordering_off")}</p>
            ) : menu ? (
                <MenuList menu={menu} quantities={quantities} onChange={change} />
            ) : (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            )}

            {count > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur">
                    <div className="mx-auto flex max-w-5xl items-center gap-3">
                        <Button className="flex-1" size="lg" onClick={() => setCartOpen(true)}>
                            <ShoppingBag className="size-4" />
                            {t("table.view_cart", { count, total: formatMoney(total) })}
                        </Button>
                    </div>
                </div>
            )}

            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{t("table.cart")}</SheetTitle>
                    </SheetHeader>
                    <div className="grid gap-3 px-4 pb-4">
                        {lines.map((l) => (
                            <div key={`${l.item.kind}-${l.item.id}`} className="grid gap-1 rounded-md border p-2">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="font-medium">
                                        {l.quantity}× {l.item.name}
                                    </span>
                                    <span className="tabular-nums">{formatMoney(l.quantity * Number(l.item.price))}</span>
                                </div>
                                <Input
                                    placeholder={t("table.line_note")}
                                    maxLength={200}
                                    value={l.note}
                                    aria-label={t("table.line_note_for", { name: l.item.name })}
                                    onChange={(e) => setCart((c) => ({ ...c, [`${l.item.kind}-${l.item.id}`]: { ...l, note: e.target.value } }))}
                                />
                            </div>
                        ))}
                        {!table.order && (
                            <div className="grid gap-1.5">
                                <Label htmlFor="tb-guests">{t("table.guests")}</Label>
                                <Input id="tb-guests" type="number" min={1} max={100} className="w-32" value={guests} onChange={(e) => setGuests(e.target.value)} />
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label htmlFor="tb-note">{t("table.note")}</Label>
                            <Input id="tb-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("table.confirm_hint")}</p>
                        <Button size="lg" onClick={send} disabled={busy || !count}>
                            {busy ? t("common.processing") : t("table.send", { total: formatMoney(total) })}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

/** Giai đoạn 14: số còn phải trả của bàn; khách tạo mã VietQR và chuyển khoản, hệ thống tự xác nhận khi ngân hàng báo về */
const TablePayment = ({ token, payment, onChanged }: { token: string; payment: IPublicTablePayment; onChanged: () => void }) => {
    const { t } = useTranslation("public");
    const [busy, setBusy] = useState(false);

    const create = async () => {
        setBusy(true);
        try {
            await createTableQr(token);
            onChanged();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Landmark className="h-4 w-4" />
                    {t("table.payment.title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
                <div className="grid gap-1">
                    {payment.paid > 0 && (
                        <div className="flex justify-between">
                            <span>{t("table.payment.paid")}</span>
                            <span className="tabular-nums">{formatMoney(payment.paid)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold">
                        <span>{t("table.payment.remaining")}</span>
                        <span className="tabular-nums">{formatMoney(Math.max(0, payment.remaining))}</span>
                    </div>
                </div>
                {payment.remaining <= 0 ? (
                    <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300" data-testid="table-paid">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("table.payment.done")}
                    </p>
                ) : !payment.transfer_qr_enabled ? (
                    <p className="text-muted-foreground">{t("table.payment.ask_staff")}</p>
                ) : payment.qr && payment.qr.amount === payment.remaining ? (
                    <TransferQr qr={payment.qr} />
                ) : (
                    <>
                        <Button onClick={create} disabled={busy}>
                            {busy ? t("common.loading") : t("table.payment.pay_transfer", { amount: formatMoney(payment.remaining) })}
                        </Button>
                        <p className="text-xs text-muted-foreground">{t("table.payment.hint")}</p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default TablePage;
