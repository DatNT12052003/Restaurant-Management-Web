import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Award, Gift } from "lucide-react";

import { cancelCustomerReservation, getCustomerOrders, getCustomerPoints, getCustomerProfile, getCustomerReservations, sendOrderFeedback } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsyncData } from "@/hooks";
import type { ICustomerOrder, IPublicReservation } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { canCancelBooking } from "@/lib/customer";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { BookingSummary } from "./BookingLookup";
import FeedbackForm, { Stars } from "./FeedbackForm";

/** Tài khoản khách: điểm thưởng, tiến độ khách thân thiết, đặt bàn, order và đánh giá, lịch sử điểm */
const Account = () => {
    const { t } = useTranslation("public");
    const profileFetcher = useCallback(async () => (await getCustomerProfile()).data ?? null, []);
    const { data: profile, reload: reloadProfile } = useAsyncData(profileFetcher);

    if (!profile) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    const p = profile.regular_progress;
    const regular = profile.guest_status === "regular";

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                    <p className="text-sm text-muted-foreground">{[profile.phone_number, profile.email].filter(Boolean).join(" · ")}</p>
                </div>
                <Button asChild>
                    <Link to="/booking">{t("nav.book")}</Link>
                </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-3 py-4">
                        <Gift className="size-8 text-orange-600" />
                        <div>
                            <p className="text-sm text-muted-foreground">{t("account.points")}</p>
                            <p className="text-2xl font-bold tabular-nums" data-testid="loyalty-points">
                                {profile.loyalty_points}
                            </p>
                            {profile.loyalty.enabled && (
                                <p className="text-xs text-muted-foreground">
                                    {t("account.points_rule", { earn: formatMoney(profile.loyalty.earn_amount), value: formatMoney(profile.loyalty.point_value), max: profile.loyalty.max_redeem_percent })}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="grid gap-2 py-4">
                        <div className="flex items-center gap-2">
                            <Award className={regular ? "size-6 text-amber-500" : "size-6 text-muted-foreground"} />
                            <span className="font-medium">{regular ? t("account.regular") : t("account.new")}</span>
                        </div>
                        {!regular && (
                            <>
                                <Progress value={Math.min(100, (p.visits / p.required) * 100)} />
                                <p className="text-xs text-muted-foreground">{t("account.regular_progress", { visits: p.visits, required: p.required, months: p.months })}</p>
                            </>
                        )}
                        <p className="text-xs text-muted-foreground">{t("account.stats", { visits: profile.visits, total: formatMoney(profile.total_spent) })}</p>
                    </CardContent>
                </Card>
            </div>
            <Tabs defaultValue="reservations">
                <TabsList>
                    <TabsTrigger value="reservations">{t("account.tab_reservations")}</TabsTrigger>
                    <TabsTrigger value="orders">{t("account.tab_orders")}</TabsTrigger>
                    <TabsTrigger value="points">{t("account.tab_points")}</TabsTrigger>
                </TabsList>
                <TabsContent value="reservations">
                    <ReservationsTab />
                </TabsContent>
                <TabsContent value="orders">
                    <OrdersTab onFeedback={reloadProfile} />
                </TabsContent>
                <TabsContent value="points">
                    <PointsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

const ReservationsTab = () => {
    const { t } = useTranslation("public");
    const fetcher = useCallback(async () => (await getCustomerReservations()).data ?? [], []);
    const { data: rows = [], loading, reload } = useAsyncData(fetcher);
    const [cancelling, setCancelling] = useState<IPublicReservation | null>(null);
    const [loadedAt] = useState(() => Date.now());

    if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{loading ? t("common.loading") : t("account.no_reservations")}</p>;
    return (
        <div className="grid gap-2">
            {rows.map((r) => (
                <Card key={r.id}>
                    <CardContent className="grid gap-2 py-3">
                        <BookingSummary booking={r} />
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{r.lookup_code}</span>
                            {canCancelBooking(r, loadedAt) && (
                                <Button size="sm" variant="outline" onClick={() => setCancelling(r)}>
                                    {t("lookup.cancel")}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
            <ConfirmDialog
                open={!!cancelling}
                onOpenChange={(v) => !v && setCancelling(null)}
                title={t("lookup.cancel")}
                description={t("lookup.cancel_confirm")}
                onConfirm={async () => {
                    try {
                        toast.success((await cancelCustomerReservation(cancelling!.id!)).message);
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

const OrdersTab = ({ onFeedback }: { onFeedback: () => void }) => {
    const { t, i18n } = useTranslation("public");
    const fetcher = useCallback(async () => (await getCustomerOrders()).data ?? [], []);
    const { data: orders = [], loading, reload } = useAsyncData(fetcher);
    const [reviewing, setReviewing] = useState<ICustomerOrder | null>(null);
    const [loadedAt] = useState(() => Date.now());
    const reviewable = (o: ICustomerOrder) => o.status === "completed" && !o.feedback && !!o.completed_at && loadedAt - new Date(o.completed_at).getTime() < 30 * 86_400_000;

    if (!orders.length) return <p className="py-6 text-center text-sm text-muted-foreground">{loading ? t("common.loading") : t("account.no_orders")}</p>;
    return (
        <div className="grid gap-2">
            {orders.map((o) => (
                <Card key={o.id}>
                    <CardContent className="grid gap-2 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                                {o.restaurant_name} · {formatDateTime(o.completed_at ?? o.created_at, i18n.language)}
                            </span>
                            <span className="font-semibold tabular-nums">{formatMoney(o.total)}</span>
                        </div>
                        <p className="text-muted-foreground">{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{t(`account.order_status.${o.status}`, { defaultValue: o.status })}</Badge>
                            {o.points_awarded > 0 && <Badge variant="outline">+{t("account.points_short", { count: o.points_awarded })}</Badge>}
                            {o.points_redeemed > 0 && <Badge variant="outline">−{t("account.points_short", { count: o.points_redeemed })}</Badge>}
                            {o.feedback && <Stars value={Math.round((o.feedback.food_rating + o.feedback.service_rating + o.feedback.ambience_rating) / 3)} label={t("feedback.title")} size="size-4" />}
                            {reviewable(o) && (
                                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setReviewing(o)}>
                                    {t("feedback.title")}
                                </Button>
                            )}
                        </div>
                        {o.feedback?.reply && (
                            <p className="rounded-md bg-muted p-2 text-xs">
                                <span className="font-medium">{t("account.reply")}</span> {o.feedback.reply}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
            <Dialog open={!!reviewing} onOpenChange={(v) => !v && setReviewing(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("feedback.title")}</DialogTitle>
                        <DialogDescription>{reviewing && t("feedback.for_order", { code: reviewing.code })}</DialogDescription>
                    </DialogHeader>
                    {reviewing && (
                        <FeedbackForm
                            onSubmit={async (payload) => {
                                try {
                                    toast.success((await sendOrderFeedback(reviewing.id, payload)).message);
                                    setReviewing(null);
                                    reload();
                                    onFeedback();
                                } catch (error) {
                                    toast.error(getErrorMessage(error));
                                    throw error;
                                }
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const PointsTab = () => {
    const { t, i18n } = useTranslation("public");
    const fetcher = useCallback(async () => (await getCustomerPoints()).data ?? [], []);
    const { data: rows = [], loading } = useAsyncData(fetcher);
    if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{loading ? t("common.loading") : t("account.no_points")}</p>;
    return (
        <Card>
            <CardContent className="divide-y p-0 text-sm">
                {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 px-4 py-2">
                        <span>
                            {t(`account.tx.${r.type}`)}
                            {r.order_code && <span className="text-muted-foreground"> · {r.order_code}</span>}
                            {r.type === "adjust" && r.note && <span className="text-muted-foreground"> · {r.note}</span>}
                            <span className="block text-xs text-muted-foreground">{formatDateTime(r.created_at, i18n.language)}</span>
                        </span>
                        <span className={r.points > 0 ? "font-semibold text-emerald-700 tabular-nums dark:text-emerald-300" : "font-semibold text-destructive tabular-nums"}>
                            {r.points > 0 ? "+" : ""}
                            {r.points}
                        </span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default Account;
