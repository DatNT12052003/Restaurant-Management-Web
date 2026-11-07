import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";

import { getKitchenQueue, updateOrderLineStatus } from "@/apis";
import PageHeader from "@/components/common/PageHeader";
import ReasonDialog from "@/components/common/ReasonDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ITEM_STATUS_STYLE, KITCHEN_COLUMNS, KITCHEN_WARN_MINUTES, canMoveLine } from "@/constants/order";
import type { KitchenStationEnum, OrderItemStatusEnum } from "@/enum";
import { useAppSelector, useAsyncData, useNow, usePermission, useRealtime } from "@/hooks";
import type { IKitchenLine } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type StationTab = KitchenStationEnum | "all";

/** Bước tiếp theo chính của món ở từng cột */
const NEXT: Partial<Record<OrderItemStatusEnum, OrderItemStatusEnum>> = {
    pending: "confirmed",
    confirmed: "cooking",
    cooking: "ready",
    ready: "served",
};

/** Màn hình bếp / quầy pha chế (kanban theo trạng thái món), cập nhật realtime */
const Kitchen = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const needBranch = isAdmin && !currentBranch;
    const now = useNow(30_000);

    // Nhân viên chỉ pha chế thì mặc định mở quầy pha chế
    const onlyBar = roles.includes("barista") && !roles.some((r) => ["head_chef", "sous_chef", "commis_chef"].includes(r));
    const [station, setStation] = useState<StationTab>(onlyBar ? "bar" : "kitchen");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<IKitchenLine | null>(null);

    const fetcher = useCallback(async () => {
        if (needBranch) return [];
        try {
            return (await getKitchenQueue(station === "all" ? undefined : station, restaurantId)).data || [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [station, restaurantId, needBranch]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["order:round_sent", "order_item:status_changed", "order:updated"], reload);

    const columns = useMemo(
        () => KITCHEN_COLUMNS.map((status) => ({ status, lines: (data || []).filter((l) => l.status === status) })),
        [data],
    );

    const move = async (line: IKitchenLine, status: OrderItemStatusEnum, reason?: string) => {
        setBusyId(`${line.kind}-${line.id}`);
        try {
            await updateOrderLineStatus(line.kind, line.id, status, reason);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        } finally {
            setBusyId(null);
        }
    };

    if (needBranch) {
        return (
            <div>
                <PageHeader title={t("kitchen.title")} description={t("kitchen.description")} />
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("order.select_branch_first")}</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("kitchen.title")}
                description={t("kitchen.description")}
                actions={
                    <Tabs value={station} onValueChange={(v) => setStation(v as StationTab)}>
                        <TabsList>
                            <TabsTrigger value="kitchen">{t("kitchen.station.kitchen")}</TabsTrigger>
                            <TabsTrigger value="bar">{t("kitchen.station.bar")}</TabsTrigger>
                            <TabsTrigger value="all">{t("kitchen.station.all")}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                }
            />

            {loading && !data ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {columns.map(({ status, lines }) => (
                        <div key={status} className="flex flex-col rounded-lg border bg-muted/30">
                            <div className="flex items-center justify-between border-b px-3 py-2">
                                <span className="font-semibold">{t(`kitchen.column.${status}`)}</span>
                                <Badge variant="outline" className={ITEM_STATUS_STYLE[status]}>
                                    {lines.reduce((s, l) => s + l.quantity, 0)}
                                </Badge>
                            </div>
                            <div className="grid content-start gap-2 p-2">
                                {lines.length === 0 && (
                                    <p className="py-6 text-center text-sm text-muted-foreground">{t("kitchen.empty")}</p>
                                )}
                                {lines.map((line) => {
                                    const key = `${line.kind}-${line.id}`;
                                    const minutes = Math.max(0, Math.floor((now - new Date(line.sent_at).getTime()) / 60000));
                                    const late = status !== "ready" && minutes >= KITCHEN_WARN_MINUTES;
                                    const next = NEXT[status];
                                    return (
                                        <div
                                            key={key}
                                            className={cn("rounded-md border bg-background p-3 shadow-sm", late && "border-red-500")}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold leading-tight">
                                                    {line.name} <span className="text-lg">×{line.quantity}</span>
                                                </p>
                                                {canMoveLine(can, status, "cancelled") && can("order_item.prepare") && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="-mr-1 -mt-1 h-6 w-6"
                                                        onClick={() => setRejecting(line)}
                                                        disabled={busyId === key}
                                                        aria-label={t("kitchen.reject")}
                                                        title={t("kitchen.reject")}
                                                    >
                                                        <X className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                            {line.combo_items && line.combo_items.length > 0 && (
                                                <ul className="mt-1 text-xs text-muted-foreground">
                                                    {line.combo_items.map((ci) => (
                                                        <li key={ci.dish_id}>
                                                            · {ci.name} ×{ci.quantity * line.quantity}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {line.note && (
                                                <p className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                                                    {line.note}
                                                </p>
                                            )}
                                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground">{line.table_names || "—"}</span>
                                                <span>
                                                    {line.order_code.split("-").pop()} · {t("order.round_label", { no: line.round_no })}
                                                </span>
                                                {station === "all" && <span>{t(`kitchen.station.${line.station}`)}</span>}
                                                <span className={cn("ml-auto flex items-center gap-0.5", late && "font-semibold text-red-600")}>
                                                    <Clock className="h-3 w-3" />
                                                    {t("order.minutes", { count: minutes })}
                                                </span>
                                            </div>
                                            {next && canMoveLine(can, status, next) && (
                                                <div className="mt-2 flex gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1"
                                                        disabled={busyId === key}
                                                        onClick={() => move(line, next).catch(() => undefined)}
                                                    >
                                                        {t(`kitchen.action.${next}`)}
                                                    </Button>
                                                    {status === "pending" && canMoveLine(can, "pending", "cooking") && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={busyId === key}
                                                            onClick={() => move(line, "cooking").catch(() => undefined)}
                                                        >
                                                            {t("kitchen.action.cook_now")}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ReasonDialog
                open={!!rejecting}
                onOpenChange={(v) => !v && setRejecting(null)}
                title={t("kitchen.reject_title", { name: rejecting?.name })}
                placeholder={t("kitchen.reject_placeholder")}
                onConfirm={(reason) => move(rejecting!, "cancelled", reason)}
            />
        </div>
    );
};

export default Kitchen;
