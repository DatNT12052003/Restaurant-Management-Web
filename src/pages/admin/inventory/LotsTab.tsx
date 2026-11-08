import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Search, Trash2 } from "lucide-react";

import { createReceipt, getLots } from "@/apis";
import ReasonDialog from "@/components/common/ReasonDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { IInventoryLot } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "expiring" | "expired";

/** Lô hàng còn lại theo hạn dùng (FEFO): cảnh báo sắp / đã hết hạn, hủy cả lô */
const LotsTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");
    const [disposing, setDisposing] = useState<IInventoryLot | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getLots({}, restaurantId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["inventory:changed"], reload);

    const warning = data?.summary.warning_days ?? 3;
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data?.lots || []).filter((l) => {
            if (q && !l.ingredient_name.toLowerCase().includes(q) && !(l.lot_code || "").toLowerCase().includes(q)) return false;
            if (filter === "expired") return l.days_left < 0;
            if (filter === "expiring") return l.days_left >= 0 && l.days_left <= warning;
            return true;
        });
    }, [data, search, filter, warning]);

    /** Hủy toàn bộ số còn lại của lô (phiếu hủy hàng, ghi nhật ký) */
    const dispose = async (reason: string) => {
        const lot = disposing!;
        try {
            const res = await createReceipt({
                restaurant_id: restaurantId,
                type: "dispose",
                reason,
                lines: [{ ingredient_id: lot.ingredient_id, quantity: Number(lot.quantity), lot_id: lot.id }],
            });
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    const status = (l: IInventoryLot) =>
        l.days_left < 0 ? (
            <Badge variant="destructive">{t("inventory.lot.expired", { count: -l.days_left })}</Badge>
        ) : l.days_left <= warning ? (
            <Badge className="bg-amber-500 text-white hover:bg-amber-500">{t("inventory.lot.days_left", { count: l.days_left })}</Badge>
        ) : (
            <span className="text-xs text-muted-foreground">{t("inventory.lot.days_left", { count: l.days_left })}</span>
        );

    return (
        <div className="grid gap-3">
            {data && (
                <div className="grid gap-2 sm:grid-cols-3">
                    <Card>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("inventory.lot.count")}</p>
                            <p className="text-xl font-semibold">{data.lots.length}</p>
                        </CardContent>
                    </Card>
                    <Card className={cn(data.summary.expiring > 0 && "border-amber-400")}>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("inventory.lot.expiring_count", { days: warning })}</p>
                            <p className={cn("text-xl font-semibold", data.summary.expiring > 0 && "text-amber-600")}>{data.summary.expiring}</p>
                        </CardContent>
                    </Card>
                    <Card className={cn(data.summary.expired > 0 && "border-destructive")}>
                        <CardContent className="py-4">
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {t("inventory.lot.expired_count")}
                            </p>
                            <p className={cn("text-xl font-semibold", data.summary.expired > 0 && "text-destructive")}>{data.summary.expired}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder={t("inventory.lot.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                    <SelectTrigger className="w-52" aria-label={t("inventory.lot.filter_label")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(["all", "expiring", "expired"] as const).map((f) => (
                            <SelectItem key={f} value={f}>
                                {t(`inventory.lot.filter.${f}`, { days: warning })}
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
                                <TableHead>{t("inventory.ingredient")}</TableHead>
                                <TableHead>{t("inventory.lot.code")}</TableHead>
                                <TableHead>{t("inventory.lot.expiry")}</TableHead>
                                <TableHead>{t("inventory.lot.status")}</TableHead>
                                <TableHead className="text-right">{t("inventory.lot.remaining")}</TableHead>
                                <TableHead className="text-right">{t("inventory.lot.value")}</TableHead>
                                <TableHead>{t("inventory.lot.source")}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {t("inventory.lot.empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((l) => (
                                    <TableRow key={l.id} className={cn(l.days_left < 0 && "bg-destructive/5")}>
                                        <TableCell className="font-medium">{l.ingredient_name}</TableCell>
                                        <TableCell>{l.lot_code || "—"}</TableCell>
                                        <TableCell className="tabular-nums">{l.expiry_date}</TableCell>
                                        <TableCell>{status(l)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatQty(l.quantity)} <span className="text-xs text-muted-foreground">{l.unit}</span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{formatMoney(l.value)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {l.receipt_code || (l.transfer_id ? t("inventory.lot.from_transfer") : "—")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can("inventory.dispose") && (
                                                <Button
                                                    size="sm"
                                                    variant={l.days_left < 0 ? "destructive" : "ghost"}
                                                    className="h-7"
                                                    onClick={() => setDisposing(l)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {t("inventory.lot.dispose")}
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
            <p className="text-xs text-muted-foreground">{t("inventory.lot.hint")}</p>

            <ReasonDialog
                open={!!disposing}
                onOpenChange={(v) => !v && setDisposing(null)}
                title={t("inventory.lot.dispose_title", {
                    name: disposing?.ingredient_name,
                    qty: disposing ? `${formatQty(disposing.quantity)} ${disposing.unit}` : "",
                })}
                description={t("inventory.lot.dispose_desc")}
                placeholder={t("inventory.receipt.reason_placeholder_dispose")}
                onConfirm={dispose}
            />
        </div>
    );
};

export default LotsTab;
