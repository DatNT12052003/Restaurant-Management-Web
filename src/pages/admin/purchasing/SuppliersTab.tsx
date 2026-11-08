import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react";

import { createSupplier, deleteSupplier, getIngredients, getSupplier, getSuppliers, updateSupplier, updateSupplierPrices } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { ISupplier, ISupplierPayload, SupplierStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";

/** Nhà cung cấp dùng chung cả chuỗi: thông tin liên hệ, điều khoản trả chậm, bảng giá nguyên liệu */
const SuppliersTab = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const canManage = can("supplier.manage");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<SupplierStatusEnum | "all">("all");
    const debounced = useDebounce(search.trim(), 400);
    const [form, setForm] = useState<ISupplier | "new" | null>(null);
    const [pricesOf, setPricesOf] = useState<ISupplier | null>(null);
    const [deleting, setDeleting] = useState<ISupplier | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getSuppliers({ search: debounced || undefined, status: status === "all" ? undefined : status })).data || [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [debounced, status]);
    const { data, loading, reload } = useAsyncData(fetcher);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder={t("purchasing.supplier.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={status} onValueChange={(v) => setStatus(v as SupplierStatusEnum | "all")}>
                    <SelectTrigger className="w-44" aria-label={t("reservation.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        <SelectItem value="active">{t("purchasing.supplier.status.active")}</SelectItem>
                        <SelectItem value="inactive">{t("purchasing.supplier.status.inactive")}</SelectItem>
                    </SelectContent>
                </Select>
                {canManage && (
                    <Button className="ml-auto" onClick={() => setForm("new")}>
                        <Plus className="h-4 w-4" />
                        {t("purchasing.supplier.create")}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("purchasing.supplier.name")}</TableHead>
                                <TableHead>{t("purchasing.supplier.contact")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.supplier.terms")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.supplier.price_count")}</TableHead>
                                <TableHead className="text-right">{t("purchasing.supplier.outstanding")}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !data?.length ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            {s.name}
                                            {s.status === "inactive" && (
                                                <Badge variant="secondary" className="ml-2">
                                                    {t("purchasing.supplier.status.inactive")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ") || "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {s.payment_terms_days ? t("purchasing.supplier.terms_days", { count: s.payment_terms_days }) : t("purchasing.supplier.terms_now")}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{s.price_count ?? 0}</TableCell>
                                        <TableCell className="text-right tabular-nums">{Number(s.outstanding) > 0 ? formatMoney(s.outstanding) : "—"}</TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setPricesOf(s)} aria-label={t("purchasing.supplier.prices")} title={t("purchasing.supplier.prices")}>
                                                <Tags className="h-4 w-4" />
                                            </Button>
                                            {canManage && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => setForm(s)} aria-label={t("common.edit")}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setDeleting(s)} aria-label={t("common.delete")}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <SupplierFormDialog supplier={form} onOpenChange={(v) => !v && setForm(null)} onSaved={reload} />
            <PricesDialog supplier={pricesOf} canEdit={canManage} onOpenChange={(v) => !v && setPricesOf(null)} onSaved={reload} />
            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("purchasing.supplier.delete_title")}
                description={t("purchasing.supplier.delete_desc", { name: deleting?.name })}
                confirmLabel={t("common.delete")}
                onConfirm={async () => {
                    try {
                        toast.success((await deleteSupplier(deleting!.id)).message);
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

const SupplierFormDialog = ({
    supplier,
    onOpenChange,
    onSaved,
}: {
    supplier: ISupplier | "new" | null;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) => (
    <Dialog open={!!supplier} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
            {supplier && (
                <SupplierForm
                    key={supplier === "new" ? "new" : supplier.id}
                    supplier={supplier === "new" ? null : supplier}
                    onClose={() => onOpenChange(false)}
                    onSaved={onSaved}
                />
            )}
        </DialogContent>
    </Dialog>
);

const SupplierForm = ({ supplier, onClose, onSaved }: { supplier: ISupplier | null; onClose: () => void; onSaved: () => void }) => {
    const { t } = useTranslation("admin");
    const [form, setForm] = useState<ISupplierPayload>({
        name: supplier?.name ?? "",
        contact_name: supplier?.contact_name ?? "",
        phone: supplier?.phone ?? "",
        email: supplier?.email ?? "",
        address: supplier?.address ?? "",
        tax_code: supplier?.tax_code ?? "",
        payment_terms_days: supplier?.payment_terms_days ?? 0,
        note: supplier?.note ?? "",
        status: supplier?.status ?? "active",
    });
    const [busy, setBusy] = useState(false);
    const field = (key: keyof ISupplierPayload) => ({
        value: String(form[key] ?? ""),
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }),
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = supplier ? await updateSupplier(supplier.id, form) : await createSupplier(form);
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
                <DialogTitle>{supplier ? t("purchasing.supplier.edit") : t("purchasing.supplier.create")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="sp-name">{t("purchasing.supplier.name")} *</Label>
                    <Input id="sp-name" required maxLength={255} {...field("name")} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="sp-contact">{t("purchasing.supplier.contact_name")}</Label>
                    <Input id="sp-contact" maxLength={255} {...field("contact_name")} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="sp-phone">{t("purchasing.supplier.phone")}</Label>
                    <Input id="sp-phone" maxLength={30} {...field("phone")} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="sp-email">Email</Label>
                    <Input id="sp-email" type="email" maxLength={255} {...field("email")} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="sp-tax">{t("purchasing.supplier.tax_code")}</Label>
                    <Input id="sp-tax" maxLength={30} {...field("tax_code")} />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="sp-address">{t("purchasing.supplier.address")}</Label>
                    <Input id="sp-address" maxLength={1000} {...field("address")} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="sp-terms">{t("purchasing.supplier.terms_label")}</Label>
                    <Input id="sp-terms" type="number" min={0} max={365} {...field("payment_terms_days")} />
                </div>
                <div className="grid gap-1.5">
                    <Label>{t("reservation.status")}</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SupplierStatusEnum })}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">{t("purchasing.supplier.status.active")}</SelectItem>
                            <SelectItem value="inactive">{t("purchasing.supplier.status.inactive")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="sp-note">{t("inventory.note")}</Label>
                    <Textarea id="sp-note" rows={2} maxLength={2000} {...field("note")} />
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

/** Bảng giá nguyên liệu của nhà cung cấp (giá cập nhật tự động theo lần nhận hàng gần nhất) */
const PricesDialog = ({
    supplier,
    canEdit,
    onOpenChange,
    onSaved,
}: {
    supplier: ISupplier | null;
    canEdit: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) => (
    <Dialog open={!!supplier} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            {supplier && <PricesBody key={supplier.id} supplier={supplier} canEdit={canEdit} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
        </DialogContent>
    </Dialog>
);

interface PriceRow {
    ingredient_id: number;
    name: string;
    unit: string;
    unit_price: string;
    is_preferred: boolean;
}

const PricesBody = ({ supplier, canEdit, onClose, onSaved }: { supplier: ISupplier; canEdit: boolean; onClose: () => void; onSaved: () => void }) => {
    const { t } = useTranslation("admin");
    const fetcher = useCallback(async () => {
        const [detail, ingredients] = await Promise.all([getSupplier(supplier.id), getIngredients({ status: "active" })]);
        return { prices: detail.data?.prices || [], ingredients: ingredients.data || [] };
    }, [supplier.id]);
    const { data, loading } = useAsyncData(fetcher);
    const [rows, setRows] = useState<PriceRow[] | null>(null);
    const [pick, setPick] = useState("");
    const [busy, setBusy] = useState(false);

    const current: PriceRow[] =
        rows ??
        (data?.prices || []).map((p) => ({
            ingredient_id: p.ingredient_id,
            name: p.ingredient_name ?? `#${p.ingredient_id}`,
            unit: p.unit ?? "",
            unit_price: String(Number(p.unit_price)),
            is_preferred: p.is_preferred,
        }));
    const available = (data?.ingredients || []).filter((g) => !current.some((r) => r.ingredient_id === g.id));
    const invalid = current.some((r) => r.unit_price === "" || Number(r.unit_price) < 0);

    const save = async () => {
        setBusy(true);
        try {
            const res = await updateSupplierPrices(
                supplier.id,
                current.map((r) => ({ ingredient_id: r.ingredient_id, unit_price: Number(r.unit_price), is_preferred: r.is_preferred })),
            );
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
        <>
            <DialogHeader>
                <DialogTitle>{t("purchasing.supplier.prices_title", { name: supplier.name })}</DialogTitle>
                <DialogDescription>{loading ? t("common.loading") : t("purchasing.supplier.prices_desc")}</DialogDescription>
            </DialogHeader>
            {current.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t("purchasing.supplier.no_prices")}</p>
            ) : (
                <div className="divide-y rounded-md border">
                    {current.map((r, idx) => (
                        <div key={r.ingredient_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                            <span className="min-w-0 flex-1 font-medium">
                                {r.name} <span className="text-xs font-normal text-muted-foreground">/ {r.unit}</span>
                            </span>
                            <Input
                                type="number"
                                min={0}
                                className="w-32"
                                disabled={!canEdit}
                                aria-label={t("purchasing.supplier.price_of", { name: r.name })}
                                value={r.unit_price}
                                onChange={(e) => setRows(current.map((x, i) => (i === idx ? { ...x, unit_price: e.target.value } : x)))}
                            />
                            <label className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                    checked={r.is_preferred}
                                    disabled={!canEdit}
                                    onCheckedChange={(v) => setRows(current.map((x, i) => (i === idx ? { ...x, is_preferred: v === true } : x)))}
                                />
                                {t("purchasing.supplier.preferred")}
                            </label>
                            {canEdit && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRows(current.filter((_, i) => i !== idx))} aria-label={t("common.delete")}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
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
                            const g = data!.ingredients.find((x) => x.id === Number(pick))!;
                            setRows([...current, { ingredient_id: g.id, name: g.name, unit: g.unit, unit_price: "", is_preferred: false }]);
                            setPick("");
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        {t("common.add")}
                    </Button>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.close")}
                </Button>
                {canEdit && (
                    <Button onClick={save} disabled={busy || invalid || rows === null}>
                        {busy ? t("common.processing") : t("common.save")}
                    </Button>
                )}
            </DialogFooter>
        </>
    );
};

export default SuppliersTab;
