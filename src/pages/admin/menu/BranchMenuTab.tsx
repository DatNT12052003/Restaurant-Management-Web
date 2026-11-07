import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import { getRestaurantMenu, updateRestaurantMenuItem } from "@/apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppSelector, useAsyncData, usePermission } from "@/hooks";
import type { IRestaurantMenu, IRestaurantMenuItem } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Kind = "dishes" | "combos";

/** Bật/tắt món và đặt giá riêng cho chi nhánh (thực đơn chung + tùy chỉnh) */
const BranchMenuTab = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const me = useAppSelector((s) => s.auth.user);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    // Admin: chi nhánh đang chọn trên header; người khác: nhà hàng được phân công
    const restaurantId = roles.includes("admin") ? currentBranch?.id : (me?.restaurant_id ?? undefined);
    const canEdit = can("dish.availability");

    // Kết quả của lần cập nhật gần nhất (API trả về toàn bộ thực đơn)
    const [latest, setLatest] = useState<IRestaurantMenu | null>(null);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    // Giá đang gõ, chưa lưu: key = "dishes-12"
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    const dropDraft = (key: string) =>
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });

    const fetcher = useCallback(async (): Promise<IRestaurantMenu | null> => {
        if (!restaurantId) return null;
        try {
            const res = await getRestaurantMenu(restaurantId);
            return res.data || null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data, loading } = useAsyncData(fetcher);
    const menu = latest?.restaurant_id === restaurantId ? latest : data;

    const save = async (kind: Kind, item: IRestaurantMenuItem, payload: { is_available?: boolean; price?: number | null }) => {
        if (!restaurantId) return;
        const key = `${kind}-${item.id}`;
        setSavingKey(key);
        try {
            const res = await updateRestaurantMenuItem(restaurantId, kind, item.id, payload);
            if (res.data) setLatest(res.data);
            dropDraft(key);
            toast.success(res.message);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingKey(null);
        }
    };

    const commitPrice = (kind: Kind, item: IRestaurantMenuItem) => {
        const key = `${kind}-${item.id}`;
        const draft = drafts[key];
        if (draft === undefined) return;
        const next = draft.trim() === "" ? null : Number(draft);
        const current = item.override_price === null ? null : Number(item.override_price);
        if (next !== null && (!Number.isFinite(next) || next < 0)) {
            toast.error(t("menu.invalid_price"));
            return;
        }
        if (next === current) {
            dropDraft(key);
            return;
        }
        save(kind, item, { price: next });
    };

    if (!restaurantId) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    {t("menu.branch_select_first")}
                </CardContent>
            </Card>
        );
    }

    const renderTable = (kind: Kind, items: IRestaurantMenuItem[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-16">{t("menu.selling")}</TableHead>
                    <TableHead>{t("menu.name")}</TableHead>
                    <TableHead className="text-right">{t("menu.base_price")}</TableHead>
                    <TableHead className="w-48">{t("menu.branch_price")}</TableHead>
                    <TableHead className="text-right">{t("menu.current_price")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                            {t("common.no_data")}
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((item) => {
                        const key = `${kind}-${item.id}`;
                        const busy = savingKey === key;
                        const discontinued = item.status === "discontinued";
                        return (
                            <TableRow key={key} className={cn((!item.is_available || discontinued) && "opacity-60")}>
                                <TableCell>
                                    <Checkbox
                                        checked={item.is_available}
                                        disabled={!canEdit || busy}
                                        onCheckedChange={(v) => save(kind, item, { is_available: v === true })}
                                        aria-label={t("menu.selling")}
                                    />
                                </TableCell>
                                <TableCell>
                                    <span className="font-medium">{item.name}</span>
                                    {item.category && (
                                        <Badge variant="outline" className="ml-2">
                                            {t(`menu.category.${item.category}`)}
                                        </Badge>
                                    )}
                                    {discontinued && (
                                        <Badge variant="secondary" className="ml-2">
                                            {t("menu.status.discontinued")}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {formatMoney(item.base_price)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            step={1000}
                                            className="h-8"
                                            placeholder={t("menu.use_base_price")}
                                            disabled={!canEdit || busy}
                                            value={drafts[key] ?? (item.override_price === null ? "" : String(Number(item.override_price)))}
                                            onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                                            onBlur={() => commitPrice(kind, item)}
                                            onKeyDown={(e) => e.key === "Enter" && commitPrice(kind, item)}
                                            aria-label={t("menu.branch_price")}
                                        />
                                        {canEdit && item.override_price !== null && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                disabled={busy}
                                                onClick={() => save(kind, item, { price: null })}
                                                aria-label={t("menu.reset_price")}
                                                title={t("menu.reset_price")}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "text-right font-semibold tabular-nums",
                                        item.override_price !== null && "text-amber-600",
                                    )}
                                >
                                    {formatMoney(item.price)}
                                </TableCell>
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t("menu.branch_hint")}</p>
            {loading && !menu ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("menu.tab_dishes")}</CardTitle>
                        </CardHeader>
                        <CardContent>{renderTable("dishes", menu?.dishes || [])}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("menu.tab_combos")}</CardTitle>
                        </CardHeader>
                        <CardContent>{renderTable("combos", menu?.combos || [])}</CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default BranchMenuTab;
