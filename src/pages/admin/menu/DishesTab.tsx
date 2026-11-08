import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, Scale, Search, Trash2 } from "lucide-react";

import { createDish, deleteDish, getDishes, getTags, updateDish } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import ImageManager from "@/components/common/ImageManager";
import { MultiSelect } from "@/components/common/MultiSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DishCategoryEnum, MenuItemStatusEnum } from "@/enum";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IDish, IGetQuery } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import RecipeDialog from "./RecipeDialog";

const PAGE_SIZE = 12;

interface IDishForm {
    name: string;
    price: string;
    category: DishCategoryEnum;
    status: MenuItemStatusEnum;
    description: string;
    tag_ids: string[];
}

const EMPTY_FORM: IDishForm = { name: "", price: "", category: "food", status: "active", description: "", tag_ids: [] };

const DishesTab = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [status, setStatus] = useState("all");
    const [tagFilter, setTagFilter] = useState("all");
    const debouncedSearch = useDebounce(search);

    const [form, setForm] = useState<IDishForm | null>(null);
    const [editing, setEditing] = useState<IDish | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<IDish | null>(null);
    const [recipeOf, setRecipeOf] = useState<IDish | null>(null);

    const tagsFetcher = useCallback(() => getTags().then((r) => r.data || []), []);
    const { data: tags = [] } = useAsyncData(tagsFetcher);

    const fetcher = useCallback(() => {
        const filters: NonNullable<IGetQuery["filters"]> = [];
        if (category !== "all") filters.push({ field: "category", value: category });
        if (status !== "all") filters.push({ field: "status", value: status });
        if (tagFilter !== "all") filters.push({ field: "tag_id", value: Number(tagFilter) });
        const query: IGetQuery = { currentPage: page, limit: PAGE_SIZE, filters, orderBy: [{ field: "name" }] };
        if (debouncedSearch.trim()) query.search = { text: debouncedSearch.trim(), fields: ["name", "description"] };
        return getDishes(query).catch((error) => {
            toast.error(getErrorMessage(error));
            throw error;
        });
    }, [page, debouncedSearch, category, status, tagFilter]);
    const { data, loading, reload } = useAsyncData(fetcher);
    const dishes = data?.data?.dishes || [];
    const pagination = data?.data?.pagination || null;

    const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
    };

    const openEdit = (dish: IDish) => {
        setEditing(dish);
        setForm({
            name: dish.name,
            price: String(Number(dish.price)),
            category: dish.category,
            status: dish.status,
            description: dish.description || "",
            tag_ids: dish.tags.map((tag) => String(tag.id)),
        });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                price: Number(form.price),
                category: form.category,
                status: form.status,
                description: form.description.trim() || null,
                tag_ids: form.tag_ids.map(Number),
            };
            if (editing) {
                const res = await updateDish(editing.id, payload);
                toast.success(res.message);
                setForm(null);
            } else {
                const res = await createDish(payload);
                toast.success(res.message);
                // Giữ dialog mở ở chế độ sửa để thêm ảnh cho món vừa tạo
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
            const res = await deleteDish(deleting.id);
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    const tagOptions = tags.map((tag) => ({ value: String(tag.id), label: tag.name }));

    return (
        <div>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder={t("menu.search_dish")}
                        value={search}
                        onChange={(e) => resetPage(setSearch)(e.target.value)}
                    />
                </div>
                <Select value={category} onValueChange={resetPage(setCategory)}>
                    <SelectTrigger className="lg:w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("menu.all_categories")}</SelectItem>
                        <SelectItem value="food">{t("menu.category.food")}</SelectItem>
                        <SelectItem value="drink">{t("menu.category.drink")}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={tagFilter} onValueChange={resetPage(setTagFilter)}>
                    <SelectTrigger className="lg:w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("menu.all_tags")}</SelectItem>
                        {tags.map((tag) => (
                            <SelectItem key={tag.id} value={String(tag.id)}>
                                {tag.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={resetPage(setStatus)}>
                    <SelectTrigger className="lg:w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        <SelectItem value="active">{t("menu.status.active")}</SelectItem>
                        <SelectItem value="discontinued">{t("menu.status.discontinued")}</SelectItem>
                    </SelectContent>
                </Select>
                {can("dish.create") && (
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        {t("menu.add_dish")}
                    </Button>
                )}
            </div>

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : dishes.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("common.no_data")}</CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dishes.map((dish) => (
                        <Card
                            key={dish.id}
                            className={cn("gap-0 overflow-hidden py-0", dish.status === "discontinued" && "opacity-60")}
                        >
                            <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                                {dish.image_url ? (
                                    <img src={dish.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                    <ImageOff className="h-8 w-8 text-muted-foreground" />
                                )}
                            </div>
                            <CardContent className="grid gap-2 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-medium leading-tight">{dish.name}</span>
                                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(dish.price)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline">{t(`menu.category.${dish.category}`)}</Badge>
                                    {dish.status === "discontinued" && (
                                        <Badge variant="secondary">{t("menu.status.discontinued")}</Badge>
                                    )}
                                    {dish.tags.map((tag) => (
                                        <Badge key={tag.id} variant="secondary">
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                                {(can("dish.update") || can("dish.delete") || can("recipe.view")) && (
                                    <div className="flex justify-end gap-1">
                                        {can("recipe.view") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setRecipeOf(dish)}
                                                aria-label={t("recipe.open")}
                                                title={t("recipe.open")}
                                            >
                                                <Scale className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {can("dish.update") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(dish)}
                                                aria-label={t("common.edit")}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {can("dish.delete") && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleting(dish)}
                                                aria-label={t("common.delete")}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <DataPagination pagination={pagination} onPageChange={setPage} />

            <Dialog open={!!form} onOpenChange={(v) => !saving && !v && setForm(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    {form && (
                        <form onSubmit={submit}>
                            <DialogHeader>
                                <DialogTitle>{editing ? t("menu.edit_dish") : t("menu.create_dish")}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 sm:grid-cols-2">
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="dish-name">{t("menu.name")} *</Label>
                                    <Input
                                        id="dish-name"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dish-price">{t("menu.price")} *</Label>
                                    <Input
                                        id="dish-price"
                                        type="number"
                                        required
                                        min={0}
                                        step={1000}
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t("menu.category_label")}</Label>
                                    <Select
                                        value={form.category}
                                        onValueChange={(v) => setForm({ ...form, category: v as DishCategoryEnum })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="food">{t("menu.category.food")}</SelectItem>
                                            <SelectItem value="drink">{t("menu.category.drink")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>{t("menu.tags")}</Label>
                                    <MultiSelect
                                        options={tagOptions}
                                        value={form.tag_ids}
                                        onChange={(tag_ids) => setForm({ ...form, tag_ids })}
                                        placeholder={t("menu.tags_placeholder")}
                                        emptyText={t("common.no_data")}
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
                                    <Label htmlFor="dish-desc">{t("menu.description_field")}</Label>
                                    <Textarea
                                        id="dish-desc"
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    {editing ? (
                                        <ImageManager
                                            key={`dish-${editing.id}`}
                                            entityType="dish"
                                            entityId={editing.id}
                                            canEdit={can("dish.update")}
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

            <RecipeDialog dish={recipeOf} onOpenChange={(v) => !v && setRecipeOf(null)} />

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("menu.delete_dish_title")}
                description={t("menu.delete_dish_desc", { name: deleting?.name })}
                confirmLabel={t("common.delete")}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default DishesTab;
