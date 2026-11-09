import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, QrCode, X } from "lucide-react";

import { acceptOrderRequest, getOrderRequests, rejectOrderRequest } from "@/apis";
import ReasonDialog from "@/components/common/ReasonDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsyncData, useRealtime } from "@/hooks";
import type { IOrderRequest } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

/**
 * Giai đoạn 13: món khách tự gọi qua mã QR tại bàn, chờ nhân viên xác nhận. Nhận = mở order cho bàn (nếu chưa có)
 * và gửi bếp như một đợt gọi món; từ chối kèm lý do (khách thấy trên điện thoại).
 */
const OrderRequestsPanel = ({ restaurantId, onAccepted }: { restaurantId?: number; onAccepted: (orderId: number) => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [rejecting, setRejecting] = useState<IOrderRequest | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const fetcher = useCallback(async () => {
        try {
            return (await getOrderRequests("pending", restaurantId)).data ?? [];
        } catch {
            return [];
        }
    }, [restaurantId]);
    const { data: requests = [], reload } = useAsyncData(fetcher);
    useRealtime(["order_request:created", "order_request:changed"], reload);

    if (!requests.length) return null;

    const accept = async (r: IOrderRequest) => {
        setBusyId(r.id);
        try {
            const res = await acceptOrderRequest(r.id);
            toast.success(res.message);
            reload();
            if (res.data?.order_id) onAccepted(res.data.order_id);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Card className="mb-4 border-amber-400" data-testid="order-requests">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <QrCode className="size-4" />
                    {t("order_request.title", { count: requests.length })}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {requests.map((r) => {
                    const total = (r.lines ?? []).reduce((s, l) => s + Number(l.price ?? 0) * l.quantity, 0);
                    return (
                        <div key={r.id} className="grid gap-2 rounded-md border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">
                                    {r.table_name} · {r.room_name}
                                </span>
                                <span className="text-xs text-muted-foreground">{formatTime(r.created_at, i18n.language)}</span>
                            </div>
                            <ul className="grid gap-0.5">
                                {(r.lines ?? []).map((l) => (
                                    <li key={`${l.kind}-${l.id}`}>
                                        {l.quantity}× {l.name}
                                        {l.note && <span className="text-muted-foreground"> · {l.note}</span>}
                                    </li>
                                ))}
                            </ul>
                            {r.note && <p className="text-muted-foreground italic">“{r.note}”</p>}
                            <p className="text-xs text-muted-foreground">
                                {[r.guest_name && t("order_request.guest", { name: r.guest_name }), r.guest_count && t("order_request.guests", { count: r.guest_count }), formatMoney(total)]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </p>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => accept(r)} disabled={busyId === r.id}>
                                    <Check className="size-4" />
                                    {t("order_request.accept")}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setRejecting(r)} disabled={busyId === r.id}>
                                    <X className="size-4" />
                                    {t("order_request.reject")}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
            <ReasonDialog
                open={!!rejecting}
                onOpenChange={(v) => !v && setRejecting(null)}
                title={t("order_request.reject_title")}
                placeholder={t("order_request.reject_placeholder")}
                confirmLabel={t("order_request.reject")}
                onConfirm={async (reason) => {
                    try {
                        toast.success((await rejectOrderRequest(rejecting!.id, reason)).message);
                        reload();
                    } catch (error) {
                        toast.error(getErrorMessage(error));
                        throw error;
                    }
                }}
            />
        </Card>
    );
};

export default OrderRequestsPanel;
