import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { createCombo, deleteCombo, getCombos, getDishes, updateCombo } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import ImageManager from "@/components/common/ImageManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { MenuItemStatusEnum } from "@/enum";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { ICombo, IGetQuery } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface IComboForm {
    name: string;
    price: string;
    status: MenuItemStatusEnum;
    description: string;
    items: { dish_id: number; quantity: number }[];
}

const EMPTY_FORM: IComboForm = { name: "", price: "", status: "active", description: "", items: [] };

const CombosTab = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);

    const [form, setForm] = useState<IComboForm | null>(null);
    const [editing, setEditing] = useState<ICombo | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<ICombo | null>(null);
    const [pickDish, setPickDish] = useState("");

    const fetcher = useCallback(() => {
        const query: IGetQuery = { currentPage: page, limit: PAGE_SIZE, orderBy: [{ field: "name" }] };
        if (debouncedSearch.trim()) query.search = { text: debouncedSearch.trim(), fields: ["name", "description"] };
        return getCombos(query).catch((error) => {
            toast.error(getErrorMessage(error));
            throw error;
        });
    }, [page, debouncedSearch]);
    const { data, loading, reload } = useAsyncData(fetcher);
    const combos = data?.data?.combos || [];
    const pagination = data?.data?.pagination || null;

    // Danh sách món để chọn vào combo (tối đa 100 món)
    const dishesFetcher = useCallback(
        () => getDishes({ limit: 100, orderBy: [{ field: "name" }] }).then((r) => r.data?.dishes || []),
        [],
    );
    const { data: allDishes = [] } = useAsyncData(dishesFetcher);
    const dishById = useMemo(() => new Map(allDishes.map((d) => [d.id, d])), [allDishes]);

    const itemsTotal = (form?.items || []).reduce(
        (sum, i) => sum + Number(dishById.get(i.dish_id)?.price || 0) * i.quantity,
        0,
    );

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
    };

    const openEdit = (combo: ICombo) => {
        setEditing(combo);
        setForm({
            name: combo.name,
            price: String(Number(combo.price)),
            status: combo.status,
            description: combo.description || "",
            items: combo.items.map((i) => ({ dish_id: i.dish_id, quantity: i.quantity })),
        });
    };

    const addItem = (dishId: string) => {
        if (!form || !dishId) return;
        const id = Number(dishId);
        const existing = form.items.find((i) => i.dish_id === id);
        setForm({
            ...form,
            items: existing
                ? form.items.map((i) => (i.dish_id === id ? { ...i, quantity: i.quantity + 1 } : i))
                : [...form.items, { dish_id: id, quantity: 1 }],
        });
        setPickDish("");
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        if (form.items.length === 0) {
            toast.error(t("menu.combo_items_required"));
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                price: Number(form.price),
                status: form.status,
                description: form.description.trim() || null,
                items: form.items,
            };
            if (editing) {
                const res = await updateCombo(editing.id, payload);
                toast.success(res.message);
                setForm(null);
            } else {
                const res = await createCombo(payload);
                toast.success(res.message);
                if (res.data) setEditing(res.data);
            }
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try {
            const res = await deleteCombo(deleting.id);
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder={t("menu.search_combo")}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                {can("combo.create") && (
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        {t("menu.add_combo")}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("menu.name")}</TableHead>
                                <TableHead className="hidden md:table-cell">{t("menu.combo_items")}</TableHead>
                                <TableHead className="text-right">{t("menu.price")}</TableHead>
                                <TableHead className="w-24 text-right">{t("common.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : combos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                combos.map((combo) => {
                                    const discount = Number(combo.items_total) - Number(combo.price);
                                    return (
                                        <TableRow key={combo.id} className={cn(combo.status === "discontinued" && "opacity-60")}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                                                        {combo.image_url ? (
                                                            <img src={combo.image_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{combo.name}</div>
                                                        {combo.status === "discontinued" && (
                                                            <Badge variant="secondary">{t("menu.status.discontinued")}</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {combo.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                <div className="font-semibold">{formatMoney(combo.price)}</div>
                                                {discount > 0 && (
                                                    <div className="text-xs text-emerald-600">
                                                        {t("menu.saving", { amount: formatMoney(discount) })}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {can("combo.update") && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEdit(combo)}
                                                        aria-label={t("common.edit")}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {can("combo.delete") && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleting(combo)}
                                                        aria-label={t("common.delete")}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                    <DataPagination pagination={pagination} onPageChange={setPage} />
                </CardContent>
            </Card>

            <Dialog open={!!form} onOpenChange={(v) => !saving && !v && setForm(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    {form && (
                        <form onSubmit={submit}>
                            <DialogHeader>
                                <DialogTitle>{editing ? t("menu.edit_combo") : t("menu.create_combo")}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 sm:grid-cols-2">
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="combo-name">{t("menu.name")} *</Label>
                                    <Input
                                        id="combo-name"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>{t("menu.combo_items")} *</Label>
                                    <Select value={pickDish} onValueChange={addItem}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("menu.add_dish_to_combo")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allDishes.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    {d.name} · {formatMoney(d.price)}
                                                    {d.status === "discontinued" ? ` (${t("menu.status.discontinued")})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.items.length > 0 && (
                                        <div className="grid gap-2 rounded-md border p-2">
                                            {form.items.map((item) => {
                                                const dish = dishById.get(item.dish_id);
                                                return (
                                                    <div key={item.dish_id} className="flex items-center gap-2">
                                                        <span className="flex-1 text-sm">{dish?.name ?? `#${item.dish_id}`}</span>
                                                        <span className="w-24 text-right text-sm text-muted-foreground tabular-nums">
                                                            {formatMoney(Number(dish?.price || 0) * item.quantity)}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={99}
                                                            className="w-20"
                                                            aria-label={t("menu.quantity")}
                                                            value={item.quantity}
                                                            onChange={(e) =>
                                                                setForm({
                                                                    ...form,
                                                                    items: form.items.map((i) =>
                                                                        i.dish_id === item.dish_id
                                                                            ? { ...i, quantity: Math.max(1, Number(e.target.value) || 1) }
                                                                            : i,
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            aria-label={t("common.delete")}
                                                            onClick={() =>
                                                                setForm({
                                                                    ...form,
                                                                    items: form.items.filter((i) => i.dish_id !== item.dish_id),
                                                                })
                                                            }
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                            <div className="border-t pt-2 text-right text-sm text-muted-foreground">
                                                {t("menu.items_total", { amount: formatMoney(itemsTotal) })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="combo-price">{t("menu.combo_price")} *</Label>
                                    <Input
                                        id="combo-price"
                                        type="number"
                                        required
                                        min={0}
                                        step={1000}
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t("menu.status_label")}</Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={(v) => setForm({ ...form, status: v as MenuItemStatusEnum })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t("menu.status.active")}</SelectItem>
                                            <SelectItem value="discontinued">{t("menu.status.discontinued")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="combo-desc">{t("menu.description_field")}</Label>
                                    <Textarea
                                        id="combo-desc"
                                        rows={2}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    {editing ? (
                                        <ImageManager
                                            key={`combo-${editing.id}`}
                                            entityType="combo"
                                            entityId={editing.id}
                                            canEdit={can("combo.update")}
                                            onChange={reload}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t("image.save_first")}</p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setForm(null)} disabled={saving}>
                                    {editing ? t("common.close") : t("common.cancel")}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? t("common.processing") : t("common.save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("menu.delete_combo_title")}
                description={t("menu.delete_combo_desc", { name: deleting?.name })}
                confirmLabel={t("common.delete")}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default CombosTab;
