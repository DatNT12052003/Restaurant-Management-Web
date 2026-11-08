import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Search } from "lucide-react";

import { getMenuCosts } from "@/apis";
import { StatTile } from "@/components/charts/ChartKit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppSelector, useAsyncData, useRealtime } from "@/hooks";
import type { IMenuCostRow } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import RecipeDialog from "./RecipeDialog";

type Filter = "all" | "missing" | "high";

/** Ngưỡng food cost cảnh báo (giá vốn / giá bán) */
const HIGH_FOOD_COST = 0.4;

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`);

/** Bảng giá vốn lý thuyết của món và combo (theo giá bình quân hiện tại của chi nhánh) */
const CostsTab = () => {
    const { t } = useTranslation("admin");
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const restaurantId = roles.includes("admin") ? currentBranch?.id : undefined;
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [recipeOf, setRecipeOf] = useState<{ id: number; name: string } | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getMenuCosts(restaurantId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    // Giá bình quân đổi khi có phiếu nhập
    useRealtime(["inventory:changed"], reload, 2000);

    const rows = useMemo(() => {
        const text = search.trim().toLowerCase();
        return (data?.items || []).filter((r: IMenuCostRow) => {
            if (text && !r.name.toLowerCase().includes(text)) return false;
            if (filter === "missing") return r.cost === null;
            if (filter === "high") return (r.food_cost_rate ?? 0) >= HIGH_FOOD_COST;
            return true;
        });
    }, [data, search, filter]);

    return (
        <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
                {restaurantId || !roles.includes("admin")
                    ? t("recipe.costs_branch_hint")
                    : t("recipe.costs_chain_hint")}
            </p>
            {data && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <StatTile label={t("recipe.items")} value={String(data.summary.items)} />
                    <StatTile label={t("recipe.missing_recipe")} value={String(data.summary.missing_recipe)} />
                    <StatTile label={t("recipe.avg_food_cost")} value={pct(data.summary.avg_food_cost_rate)} />
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder={t("menu.search_dish")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                    <SelectTrigger className="w-56">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(["all", "missing", "high"] as const).map((f) => (
                            <SelectItem key={f} value={f}>
                                {t(`recipe.filter.${f}`, { rate: HIGH_FOOD_COST * 100 })}
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
                                <TableHead>{t("menu.name")}</TableHead>
                                <TableHead>{t("recipe.category")}</TableHead>
                                <TableHead className="text-right">{t("recipe.price")}</TableHead>
                                <TableHead className="text-right">{t("recipe.cost")}</TableHead>
                                <TableHead className="text-right">{t("recipe.margin")}</TableHead>
                                <TableHead className="text-right">{t("recipe.food_cost_rate")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((r) => {
                                    const high = (r.food_cost_rate ?? 0) >= HIGH_FOOD_COST;
                                    return (
                                        <TableRow
                                            key={`${r.kind}-${r.id}`}
                                            className={cn(r.kind === "dish" && "cursor-pointer", r.status === "discontinued" && "opacity-60")}
                                            onClick={() => r.kind === "dish" && setRecipeOf({ id: r.id, name: r.name })}
                                        >
                                            <TableCell className="font-medium">{r.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {r.category === "combo" ? t("menu.tab_combos") : t(`menu.category.${r.category}`)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{formatMoney(r.price)}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {r.cost === null ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-600">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        {t("recipe.no_recipe")}
                                                    </span>
                                                ) : (
                                                    formatMoney(r.cost)
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{r.margin === null ? "—" : formatMoney(r.margin)}</TableCell>
                                            <TableCell className={cn("text-right tabular-nums", high && "font-semibold text-amber-600")}>
                                                {pct(r.food_cost_rate)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{t("recipe.costs_footer")}</p>

            <RecipeDialog dish={recipeOf} onOpenChange={(v) => !v && setRecipeOf(null)} onSaved={reload} />
        </div>
    );
};

export default CostsTab;
