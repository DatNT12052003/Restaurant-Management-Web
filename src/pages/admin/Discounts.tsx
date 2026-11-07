import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { createDiscount, deleteDiscount, getDiscounts, updateDiscount } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { DiscountStatusEnum, DiscountTypeEnum } from "@/enum";
import { useAppSelector, useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IDiscount, IDiscountPayload, IGetQuery } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime, toDateInput } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

/** Mã giảm giá (đặc tả 4.9): admin quản lý mã cả chuỗi; quản lý chi nhánh quản lý mã của chi nhánh mình */
const Discounts = () => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const myRestaurant = useAppSelector((s) => s.auth.user?.restaurant_id ?? null);
    const isAdmin = roles.includes("admin");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<DiscountStatusEnum | "all">("all");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<IDiscount | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<IDiscount | null>(null);
    const debounced = useDebounce(search.trim(), 400);

    const fetcher = useCallback(async () => {
        const query: IGetQuery = { currentPage: page, limit: 20, orderBy: [{ field: "created_at", direction: "desc" }] };
        if (debounced) query.search = { text: debounced, fields: ["code", "name"] };
        if (status !== "all") query.filters = [{ field: "status", value: status }];
        try {
            return (await getDiscounts(query)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, debounced, status]);
    const { data, loading, reload } = useAsyncData(fetcher);

    /** Người không phải admin chỉ sửa được mã của nhà hàng mình */
    const editable = (d: IDiscount) => isAdmin || (d.restaurant_id !== null && d.restaurant_id === myRestaurant);
    const value = (d: IDiscount) =>
        d.type === "percent"
            ? `${Number(d.value)}%${d.max_discount ? ` (${t("discount.max_short", { amount: formatMoney(d.max_discount) })})` : ""}`
            : formatMoney(d.value);

    return (
        <div>
            <PageHeader
                title={t("discount.title")}
                description={t("discount.description")}
                actions={
                    can("discount.create") && (
                        <Button
                            onClick={() => {
                                setEditing(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            {t("discount.add")}
                        </Button>
                    )
                }
            />
            <div className="mb-3 flex flex-wrap gap-2">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder={t("discount.search")}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as DiscountStatusEnum | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        <SelectItem value="active">{t("status.discount.active")}</SelectItem>
                        <SelectItem value="inactive">{t("status.discount.inactive")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("discount.code")}</TableHead>
                                <TableHead>{t("discount.name")}</TableHead>
                                <TableHead>{t("discount.value")}</TableHead>
                                <TableHead>{t("discount.scope")}</TableHead>
                                <TableHead>{t("discount.period")}</TableHead>
                                <TableHead className="text-center">{t("discount.usage")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
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
                            ) : (data?.discounts.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.discounts.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-mono font-semibold">{d.code}</TableCell>
                                        <TableCell>
                                            {d.name}
                                            {Number(d.min_order_value) > 0 && (
                                                <div className="text-xs text-muted-foreground">
                                                    {t("discount.min_short", { amount: formatMoney(d.min_order_value) })}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{value(d)}</TableCell>
                                        <TableCell>{d.restaurant_name || t("discount.chain_wide")}</TableCell>
                                        <TableCell className="whitespace-nowrap text-xs">
                                            {formatDateTime(d.start_at, i18n.language)}
                                            <br />
                                            {d.end_at ? formatDateTime(d.end_at, i18n.language) : t("discount.no_end")}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {d.used_count}
                                            {d.usage_limit ? ` / ${d.usage_limit}` : ""}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={d.status === "active" ? "default" : "secondary"}>{t(`status.discount.${d.status}`)}</Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            {can("discount.update") && editable(d) && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditing(d);
                                                        setFormOpen(true);
                                                    }}
                                                    aria-label={t("common.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {can("discount.delete") && editable(d) && (
                                                <Button size="icon" variant="ghost" onClick={() => setDeleting(d)} aria-label={t("common.delete")}>
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
            {data && data.pagination.totalPages > 1 && (
                <div className="mt-3">
                    <DataPagination pagination={data.pagination} onPageChange={setPage} />
                </div>
            )}

            <DiscountForm open={formOpen} discount={editing} isAdmin={isAdmin} onOpenChange={setFormOpen} onSaved={reload} />
            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("discount.delete_title")}
                description={deleting ? t("discount.delete_desc", { code: deleting.code }) : undefined}
                onConfirm={async () => {
                    try {
                        const res = await deleteDiscount(deleting!.id);
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

/** "2026-11-08T10:30" cho <input type="datetime-local"> */
const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${toDateInput(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const DiscountForm = ({
    open,
    discount,
    isAdmin,
    onOpenChange,
    onSaved,
}: {
    open: boolean;
    discount: IDiscount | null;
    isAdmin: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
            {open && <DiscountFormBody key={discount?.id ?? "new"} discount={discount} isAdmin={isAdmin} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
        </DialogContent>
    </Dialog>
);

const DiscountFormBody = ({
    discount,
    isAdmin,
    onClose,
    onSaved,
}: {
    discount: IDiscount | null;
    isAdmin: boolean;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const { t } = useTranslation("admin");
    const branches = useAppSelector((s) => s.restaurant.branches);
    const [form, setForm] = useState({
        code: discount?.code ?? "",
        name: discount?.name ?? "",
        description: discount?.description ?? "",
        restaurant_id: discount ? (discount.restaurant_id === null ? "chain" : String(discount.restaurant_id)) : "chain",
        type: (discount?.type ?? "percent") as DiscountTypeEnum,
        value: discount ? String(Number(discount.value)) : "",
        min_order_value: discount ? String(Number(discount.min_order_value)) : "0",
        max_discount: discount?.max_discount ? String(Number(discount.max_discount)) : "",
        start_at: toLocalInput(discount?.start_at ?? new Date().toISOString()),
        end_at: toLocalInput(discount?.end_at),
        usage_limit: discount?.usage_limit ? String(discount.usage_limit) : "",
        per_user_limit: discount?.per_user_limit ? String(discount.per_user_limit) : "",
        status: (discount?.status ?? "active") as DiscountStatusEnum,
    });
    const [busy, setBusy] = useState(false);
    const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: IDiscountPayload = {
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description.trim() || null,
            type: form.type,
            value: form.value,
            min_order_value: form.min_order_value || 0,
            max_discount: form.type === "percent" && form.max_discount ? form.max_discount : null,
            start_at: form.start_at ? new Date(form.start_at).toISOString() : undefined,
            end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
            usage_limit: form.usage_limit || null,
            per_user_limit: form.per_user_limit || null,
            status: form.status,
        };
        // Người không phải admin: backend tự gán nhà hàng của mình
        if (isAdmin) payload.restaurant_id = form.restaurant_id === "chain" ? null : Number(form.restaurant_id);
        setBusy(true);
        try {
            const res = discount ? await updateDiscount(discount.id, payload) : await createDiscount(payload);
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
                <DialogTitle>{discount ? t("discount.edit") : t("discount.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-code">{t("discount.code")} *</Label>
                        <Input id="dc-code" required className="uppercase" maxLength={50} value={form.code} onChange={(e) => set({ code: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label>{t("reservation.status")}</Label>
                        <Select value={form.status} onValueChange={(v) => set({ status: v as DiscountStatusEnum })}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">{t("status.discount.active")}</SelectItem>
                                <SelectItem value="inactive">{t("status.discount.inactive")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="dc-name">{t("discount.name")} *</Label>
                    <Input id="dc-name" required maxLength={255} value={form.name} onChange={(e) => set({ name: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="dc-desc">{t("discount.description_field")}</Label>
                    <Textarea id="dc-desc" rows={2} maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                </div>
                {isAdmin && (
                    <div className="grid gap-1.5">
                        <Label>{t("discount.scope")}</Label>
                        <Select value={form.restaurant_id} onValueChange={(v) => set({ restaurant_id: v })}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="chain">{t("discount.chain_wide")}</SelectItem>
                                {branches.map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                        <Label>{t("discount.type")}</Label>
                        <Select value={form.type} onValueChange={(v) => set({ type: v as DiscountTypeEnum })}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percent">{t("discount.type_percent")}</SelectItem>
                                <SelectItem value="fixed">{t("discount.type_fixed")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-value">{form.type === "percent" ? t("discount.value_percent") : t("discount.value_fixed")} *</Label>
                        <Input
                            id="dc-value"
                            type="number"
                            required
                            min={1}
                            max={form.type === "percent" ? 100 : undefined}
                            value={form.value}
                            onChange={(e) => set({ value: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-min">{t("discount.min_order")}</Label>
                        <Input id="dc-min" type="number" min={0} value={form.min_order_value} onChange={(e) => set({ min_order_value: e.target.value })} />
                    </div>
                    {form.type === "percent" && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="dc-max">{t("discount.max_discount")}</Label>
                            <Input id="dc-max" type="number" min={1} value={form.max_discount} onChange={(e) => set({ max_discount: e.target.value })} />
                        </div>
                    )}
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-start">{t("discount.start_at")}</Label>
                        <Input id="dc-start" type="datetime-local" value={form.start_at} onChange={(e) => set({ start_at: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-end">{t("discount.end_at")}</Label>
                        <Input id="dc-end" type="datetime-local" value={form.end_at} onChange={(e) => set({ end_at: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-limit">{t("discount.usage_limit")}</Label>
                        <Input id="dc-limit" type="number" min={1} placeholder={t("discount.unlimited")} value={form.usage_limit} onChange={(e) => set({ usage_limit: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="dc-per-user">{t("discount.per_user_limit")}</Label>
                        <Input id="dc-per-user" type="number" min={1} placeholder={t("discount.unlimited")} value={form.per_user_limit} onChange={(e) => set({ per_user_limit: e.target.value })} />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">{t("discount.form_hint")}</p>
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

export default Discounts;
