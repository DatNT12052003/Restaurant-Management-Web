import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { createIngredient, deleteIngredient, getIngredients, updateIngredient } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData, useDebounce } from "@/hooks";
import type { IIngredient, IngredientStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";

/** Đơn vị tính gợi ý */
const UNITS = ["kg", "g", "l", "ml", "quả", "cái", "hộp", "chai", "lon", "gói", "bó"];

/** Danh mục nguyên liệu dùng chung cả chuỗi */
const IngredientsTab = ({ canCreate, canUpdate, canDelete }: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) => {
    const { t } = useTranslation("admin");
    const [search, setSearch] = useState("");
    const debounced = useDebounce(search.trim(), 300);
    const [editing, setEditing] = useState<IIngredient | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<IIngredient | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getIngredients(debounced ? { search: debounced } : {})).data || [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [debounced]);
    const { data, loading, reload } = useAsyncData(fetcher);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder={t("inventory.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {canCreate && (
                    <Button
                        className="ml-auto"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        {t("inventory.add_ingredient")}
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">{t("inventory.catalog_hint")}</p>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("inventory.ingredient")}</TableHead>
                                <TableHead>{t("inventory.unit")}</TableHead>
                                <TableHead>{t("inventory.description_field")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : (data?.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.map((i) => (
                                    <TableRow key={i.id}>
                                        <TableCell className="font-medium">{i.name}</TableCell>
                                        <TableCell>{i.unit}</TableCell>
                                        <TableCell className="max-w-72 truncate text-sm text-muted-foreground">{i.description || "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={i.status === "active" ? "default" : "secondary"}>{t(`status.ingredient.${i.status}`)}</Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            {canUpdate && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditing(i);
                                                        setFormOpen(true);
                                                    }}
                                                    aria-label={t("common.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button size="icon" variant="ghost" onClick={() => setDeleting(i)} aria-label={t("common.delete")}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
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

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-md">
                    {formOpen && <IngredientForm key={editing?.id ?? "new"} ingredient={editing} onClose={() => setFormOpen(false)} onSaved={reload} />}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("inventory.delete_title")}
                description={deleting ? t("inventory.delete_desc", { name: deleting.name }) : undefined}
                onConfirm={async () => {
                    try {
                        const res = await deleteIngredient(deleting!.id);
                        toast.success(res.message);
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

const IngredientForm = ({ ingredient, onClose, onSaved }: { ingredient: IIngredient | null; onClose: () => void; onSaved: () => void }) => {
    const { t } = useTranslation("admin");
    const [name, setName] = useState(ingredient?.name ?? "");
    const [unit, setUnit] = useState(ingredient?.unit ?? "kg");
    const [description, setDescription] = useState(ingredient?.description ?? "");
    const [status, setStatus] = useState<IngredientStatusEnum>(ingredient?.status ?? "active");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload = { name: name.trim(), unit: unit.trim(), description: description.trim() || null, status };
            const res = ingredient ? await updateIngredient(ingredient.id, payload) : await createIngredient(payload);
            toast.success(res.message);
            onSaved();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{ingredient ? t("inventory.edit_ingredient") : t("inventory.add_ingredient")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="ing-name">{t("inventory.ingredient")} *</Label>
                    <Input id="ing-name" required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="ing-unit">{t("inventory.unit")} *</Label>
                    <Input id="ing-unit" required maxLength={20} list="ing-units" value={unit} onChange={(e) => setUnit(e.target.value)} />
                    <datalist id="ing-units">
                        {UNITS.map((u) => (
                            <option key={u} value={u} />
                        ))}
                    </datalist>
                    {ingredient && <p className="text-xs text-muted-foreground">{t("inventory.unit_hint")}</p>}
                </div>
                <div className="grid gap-1.5">
                    <Label>{t("reservation.status")}</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as IngredientStatusEnum)}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">{t("status.ingredient.active")}</SelectItem>
                            <SelectItem value="inactive">{t("status.ingredient.inactive")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="ing-desc">{t("inventory.description_field")}</Label>
                    <Textarea id="ing-desc" rows={2} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default IngredientsTab;
