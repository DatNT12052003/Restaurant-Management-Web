import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Gift, Search, UserRound, X } from "lucide-react";

import { attachOrderGuest, getLoyaltyGuest, getLoyaltySettings, redeemOrderPoints, searchLoyaltyGuests } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IInvoice } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";

/**
 * Giai đoạn 13: khách hàng của order (gắn theo SĐT để tích điểm) và đổi điểm thành giảm giá.
 * Đổi điểm chỉ khi order chưa có thanh toán; tối đa theo % cấu hình, backend tự giới hạn.
 */
const LoyaltyCard = ({ invoice, onChanged }: { invoice: IInvoice; onChanged: () => void }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const guestId = invoice.order.guest_user_id ?? null;
    const hasPayments = invoice.payments.some((p) => p.type === "payment" && p.status !== "cancelled" && p.status !== "failed");
    const [query, setQuery] = useState("");
    const debounced = useDebounce(query.trim(), 300);
    const [searching, setSearching] = useState(!guestId);
    const [points, setPoints] = useState("");
    const [busy, setBusy] = useState(false);

    const settingsFetcher = useCallback(async () => (await getLoyaltySettings()).data ?? null, []);
    const { data: settings } = useAsyncData(settingsFetcher);
    const guestFetcher = useCallback(async () => (guestId ? ((await getLoyaltyGuest(guestId)).data ?? null) : null), [guestId]);
    const { data: guest, reload: reloadGuest } = useAsyncData(guestFetcher);
    const resultsFetcher = useCallback(async () => (debounced.length >= 2 ? ((await searchLoyaltyGuests(debounced)).data ?? []) : []), [debounced]);
    const { data: results = [] } = useAsyncData(resultsFetcher);

    const run = async (action: () => Promise<{ message: string }>) => {
        setBusy(true);
        try {
            toast.success((await action()).message);
            onChanged();
            reloadGuest();
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const attach = async (id: number | null) => {
        if (await run(() => attachOrderGuest(invoice.order.id, id))) {
            setQuery("");
            setSearching(id === null);
        }
    };

    const redeemed = invoice.points_redeemed ?? 0;
    const available = (guest?.available_points ?? 0) + redeemed;
    const canAttach = can("payment.create");
    const canRedeem = can("payment.create") && !!settings?.enabled && !!guest && !hasPayments;

    return (
        <Card>
            <CardContent className="grid gap-3 pt-6 text-sm">
                <Label className="flex items-center gap-1.5">
                    <Gift className="h-4 w-4" />
                    {t("loyalty.card_title")}
                </Label>
                {guestId && guest && !searching ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                        <span className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <span>
                                <strong>{guest.full_name}</strong>
                                {guest.phone_number && <span className="text-muted-foreground"> · {guest.phone_number}</span>}
                                <span className="block text-xs text-muted-foreground">
                                    {t("loyalty.balance", { points: guest.loyalty_points, available })}
                                    {guest.guest_status === "regular" && ` · ${t("loyalty.regular")}`}
                                </span>
                            </span>
                        </span>
                        {canAttach && !hasPayments && (
                            <Button size="sm" variant="ghost" onClick={() => setSearching(true)}>
                                {t("loyalty.change_guest")}
                            </Button>
                        )}
                    </div>
                ) : canAttach ? (
                    <div className="grid gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder={t("loyalty.search_placeholder")}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label={t("loyalty.search_placeholder")}
                            />
                        </div>
                        {results.length > 0 && (
                            <div className="divide-y rounded-md border">
                                {results.map((g) => (
                                    <button key={g.id} type="button" className="flex w-full justify-between gap-2 px-3 py-2 text-left hover:bg-muted" disabled={busy} onClick={() => attach(g.id)}>
                                        <span>
                                            {g.full_name}
                                            <span className="text-muted-foreground"> · {g.phone_number ?? g.email}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground">{t("loyalty.points_short", { count: g.loyalty_points })}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {debounced.length >= 2 && !results.length && <p className="text-xs text-muted-foreground">{t("loyalty.no_guest_found")}</p>}
                        <div className="flex gap-2">
                            {guestId && (
                                <Button size="sm" variant="ghost" onClick={() => setSearching(false)}>
                                    {t("common.cancel")}
                                </Button>
                            )}
                            {guestId && !hasPayments && (
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => attach(null)} disabled={busy}>
                                    {t("loyalty.detach")}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground">{t("loyalty.no_guest")}</p>
                )}

                {guest && !searching && redeemed > 0 && (
                    <div className="flex items-center justify-between rounded-md border border-emerald-300 px-3 py-2">
                        <span>{t("loyalty.redeemed", { count: redeemed, amount: formatMoney(invoice.points_discount ?? 0) })}</span>
                        {canRedeem && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={t("loyalty.remove_redeem")} onClick={() => run(() => redeemOrderPoints(invoice.order.id, 0))} disabled={busy}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
                {canRedeem && !searching && available > 0 && (
                    <form
                        className="flex gap-2"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (await run(() => redeemOrderPoints(invoice.order.id, Number(points)))) setPoints("");
                        }}
                    >
                        <Input
                            type="number"
                            min={1}
                            max={available}
                            placeholder={t("loyalty.redeem_placeholder", { max: available })}
                            value={points}
                            onChange={(e) => setPoints(e.target.value)}
                            aria-label={t("loyalty.redeem_points")}
                        />
                        <Button type="submit" variant="outline" disabled={busy || !(Number(points) > 0)}>
                            {t("loyalty.redeem")}
                        </Button>
                    </form>
                )}
                {settings?.enabled && guest && (
                    <p className="text-xs text-muted-foreground">
                        {hasPayments && !redeemed
                            ? t("loyalty.after_payment_hint")
                            : t("loyalty.rule_hint", { value: formatMoney(settings.point_value), max: settings.max_redeem_percent, earn: formatMoney(settings.earn_amount) })}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default LoyaltyCard;
