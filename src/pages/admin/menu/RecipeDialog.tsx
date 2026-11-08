import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import { getIngredients, getRecipe, updateRecipe } from "@/apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector, useAsyncData, usePermission } from "@/hooks";
import type { IDishRecipe } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecipeDialogProps {
    dish: { id: number; name: string } | null;
    onOpenChange: (open: boolean) => void;
    /** Gọi sau khi lưu (để bảng giá vốn tải lại) */
    onSaved?: () => void;
}

/** Định lượng món (cho 1 phần) và giá vốn ước tính theo giá bình quân hiện tại của chi nhánh */
const RecipeDialog = ({ dish, onOpenChange, onSaved }: RecipeDialogProps) => (
    <Dialog open={!!dish} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            {dish && <Body key={dish.id} dish={dish} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
        </DialogContent>
    </Dialog>
);

interface IRow {
    ingredient_id: number;
    quantity: string;
}

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`);

const Body = ({ dish, onClose, onSaved }: { dish: { id: number; name: string }; onClose: () => void; onSaved?: () => void }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const canEdit = can("recipe.update");
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const restaurantId = roles.includes("admin") ? currentBranch?.id : undefined;

    const fetcher = useCallback(async () => {
        try {
            const [recipe, ingredients] = await Promise.all([getRecipe(dish.id, restaurantId), getIngredients({ status: "active" })]);
            return { recipe: recipe.data!, ingredients: ingredients.data || [] };
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [dish.id, restaurantId]);
    const { data, loading } = useAsyncData(fetcher);

    // null = chưa sửa (hiển thị theo dữ liệu tải về)
    const [rows, setRows] = useState<IRow[] | null>(null);
    const [pick, setPick] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<IDishRecipe | null>(null);
    const recipe = saved ?? data?.recipe;

    const current: IRow[] = rows ?? (recipe?.items || []).map((i) => ({ ingredient_id: i.ingredient_id, quantity: String(Number(i.quantity)) }));
    const info = useMemo(() => {
        const map = new Map<number, { name: string; unit: string; unit_cost: number }>();
        (data?.ingredients || []).forEach((g) => map.set(g.id, { name: g.name, unit: g.unit, unit_cost: 0 }));
        (recipe?.items || []).forEach((i) => map.set(i.ingredient_id, { name: i.name, unit: i.unit, unit_cost: Number(i.unit_cost) }));
        return map;
    }, [data, recipe]);

    // Hộp thoại luôn cần tiêu đề cho trình đọc màn hình, kể cả lúc đang tải
    if (!recipe) {
        return (
            <DialogHeader>
                <DialogTitle>{t("recipe.title", { name: dish.name })}</DialogTitle>
                <DialogDescription>{loading ? t("common.loading") : t("common.no_data")}</DialogDescription>
            </DialogHeader>
        );
    }

    const price = Number(recipe.price);
    // Giá vốn ước tính khi đang sửa: nguyên liệu mới chưa có giá bình quân trong dữ liệu định lượng được tính 0 tới khi lưu
    const cost = current.reduce((s, r) => s + (Number(r.quantity) || 0) * (info.get(r.ingredient_id)?.unit_cost ?? 0), 0);
    const invalid = current.some((r) => !(Number(r.quantity) > 0));
    const available = (data?.ingredients || []).filter((g) => !current.some((r) => r.ingredient_id === g.id));

    const update = (next: IRow[]) => setRows(next);
    const save = async () => {
        setSaving(true);
        try {
            const res = await updateRecipe(dish.id, {
                items: current.map((r) => ({ ingredient_id: r.ingredient_id, quantity: Number(r.quantity) })),
            });
            toast.success(res.message);
            setSaved(res.data!);
            setRows(null);
            onSaved?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("recipe.title", { name: recipe.name })}</DialogTitle>
                <DialogDescription>{t("recipe.description")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">{t("recipe.price")}</p>
                        <p className="font-semibold tabular-nums">{formatMoney(price)}</p>
                    </div>
                    <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">{t("recipe.cost")}</p>
                        <p className="font-semibold tabular-nums">{formatMoney(Math.round(cost))}</p>
                    </div>
                    <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">{t("recipe.food_cost_rate")}</p>
                        <p className={cn("font-semibold tabular-nums", price > 0 && cost / price > 0.4 && "text-amber-600")}>
                            {pct(price > 0 && current.length ? cost / price : null)}
                        </p>
                    </div>
                </div>

                {current.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t("recipe.empty")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {current.map((r, idx) => {
                            const g = info.get(r.ingredient_id);
                            const lineCost = (Number(r.quantity) || 0) * (g?.unit_cost ?? 0);
                            const status = recipe.items.find((i) => i.ingredient_id === r.ingredient_id)?.ingredient_status;
                            return (
                                <div key={r.ingredient_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                                    <span className="min-w-0 flex-1">
                                        <span className="font-medium">{g?.name ?? `#${r.ingredient_id}`}</span>
                                        {status === "inactive" && (
                                            <Badge variant="secondary" className="ml-2">
                                                {t("recipe.inactive")}
                                            </Badge>
                                        )}
                                        <span className="block text-xs text-muted-foreground">
                                            {t("recipe.unit_cost", { amount: formatMoney(g?.unit_cost ?? 0), unit: g?.unit ?? "" })}
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.001"
                                            className="w-28"
                                            disabled={!canEdit}
                                            aria-label={t("recipe.quantity_of", { name: g?.name })}
                                            value={r.quantity}
                                            onChange={(e) => update(current.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
                                        />
                                        <span className="w-10 text-xs text-muted-foreground">{g?.unit}</span>
                                    </div>
                                    <span className="w-24 text-right tabular-nums">{formatMoney(Math.round(lineCost))}</span>
                                    {canEdit && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => update(current.filter((_, i) => i !== idx))}
                                            aria-label={t("common.delete")}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {canEdit && (
                    <div className="flex gap-2">
                        <Select value={pick} onValueChange={setPick}>
                            <SelectTrigger className="flex-1" aria-label={t("recipe.add_ingredient")}>
                                <SelectValue placeholder={t("recipe.add_ingredient")} />
                            </SelectTrigger>
                            <SelectContent>
                                {available.map((g) => (
                                    <SelectItem key={g.id} value={String(g.id)}>
                                        {g.name} ({g.unit})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!pick}
                            onClick={() => {
                                update([...current, { ingredient_id: Number(pick), quantity: "" }]);
                                setPick("");
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            {t("common.add")}
                        </Button>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">{t("recipe.hint")}</p>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={saving}>
                    {t("common.close")}
                </Button>
                {canEdit && (
                    <Button onClick={save} disabled={saving || invalid || rows === null}>
                        {saving ? t("common.processing") : t("common.save")}
                    </Button>
                )}
            </DialogFooter>
        </>
    );
};

export default RecipeDialog;
