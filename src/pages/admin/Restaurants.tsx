import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarOff, Images, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { createRestaurant, deleteRestaurant, getRestaurants, updateRestaurant } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import ImageManager from "@/components/common/ImageManager";
import ClosedDaysDialog from "./ClosedDaysDialog";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BANKS } from "@/constants/banks";
import type { RestaurantStatusEnum } from "@/enum";
import { useAppDispatch, useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IGetQuery, IPagination, IRestaurant, IRestaurantPayload } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { getAllRestaurantsThunk } from "@/store/restaurant/restaurantThunk";

const PAGE_SIZE = 10;
const EMPTY_FORM: IRestaurantPayload = { name: "", address: "", status: "unblocked", service_fee_percent: 0, tax_percent: 0, open_time: "08:00", close_time: "22:00", reservation_hold_minutes: 30, no_show_after_minutes: 15, phone: "", online_booking_enabled: true, online_booking_minutes: 120, online_booking_lead_minutes: 60, online_booking_max_days: 30, online_booking_max_guests: 20, qr_ordering_enabled: true, bank_bin: "", bank_account_no: "", bank_account_name: "", transfer_qr_enabled: false, legal_name: "", tax_code: "", einvoice_series: "", einvoice_auto_issue: false };

const Restaurants = () => {
    const { t } = useTranslation("admin");
    const dispatch = useAppDispatch();
    const can = usePermission();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | RestaurantStatusEnum>("all");
    const debouncedSearch = useDebounce(search);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<IRestaurant | null>(null);
    const [form, setForm] = useState<IRestaurantPayload>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<IRestaurant | null>(null);
    const [imagesOf, setImagesOf] = useState<IRestaurant | null>(null);
    const [closedOf, setClosedOf] = useState<IRestaurant | null>(null);

    const fetcher = useCallback(() => {
        const query: IGetQuery = { currentPage: page, limit: PAGE_SIZE, orderBy: [{ field: "name" }] };
        if (debouncedSearch.trim()) query.search = { text: debouncedSearch.trim(), fields: ["name", "address"] };
        if (status !== "all") query.filters = [{ field: "status", value: status }];
        return getRestaurants(query).catch((error) => {
            toast.error(getErrorMessage(error));
            throw error;
        });
    }, [page, debouncedSearch, status]);
    const { data, loading, reload } = useAsyncData(fetcher);
    const rows: IRestaurant[] = data?.data?.restaurants || [];
    const pagination: IPagination | null = data?.data?.pagination || null;

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormOpen(true);
    };

    const openEdit = (restaurant: IRestaurant) => {
        setEditing(restaurant);
        setForm({
            name: restaurant.name,
            address: restaurant.address,
            status: restaurant.status,
            service_fee_percent: Number(restaurant.service_fee_percent ?? 0),
            tax_percent: Number(restaurant.tax_percent ?? 0),
            open_time: restaurant.open_time?.slice(0, 5) ?? "08:00",
            close_time: restaurant.close_time?.slice(0, 5) ?? "22:00",
            reservation_hold_minutes: restaurant.reservation_hold_minutes ?? 30,
            no_show_after_minutes: restaurant.no_show_after_minutes ?? 15,
            phone: restaurant.phone ?? "",
            online_booking_enabled: restaurant.online_booking_enabled ?? true,
            online_booking_minutes: restaurant.online_booking_minutes ?? 120,
            online_booking_lead_minutes: restaurant.online_booking_lead_minutes ?? 60,
            online_booking_max_days: restaurant.online_booking_max_days ?? 30,
            online_booking_max_guests: restaurant.online_booking_max_guests ?? 20,
            qr_ordering_enabled: restaurant.qr_ordering_enabled ?? true,
            bank_bin: restaurant.bank_bin ?? "",
            bank_account_no: restaurant.bank_account_no ?? "",
            bank_account_name: restaurant.bank_account_name ?? "",
            transfer_qr_enabled: restaurant.transfer_qr_enabled ?? false,
            legal_name: restaurant.legal_name ?? "",
            tax_code: restaurant.tax_code ?? "",
            einvoice_series: restaurant.einvoice_series ?? "",
            einvoice_auto_issue: restaurant.einvoice_auto_issue ?? false,
        });
        setFormOpen(true);
    };

    /** Sau khi thay đổi: tải lại bảng và bộ chọn chi nhánh trên header */
    const refreshAll = () => {
        reload();
        dispatch(getAllRestaurantsThunk());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = editing ? await updateRestaurant(editing.id, form) : await createRestaurant(form);
            toast.success(res.message);
            setFormOpen(false);
            refreshAll();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try {
            const res = await deleteRestaurant(deleting.id);
            toast.success(res.message);
            refreshAll();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <div>
            <PageHeader
                title={t("restaurant.title")}
                description={t("restaurant.description")}
                actions={
                    can("restaurant.create") && (
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4" />
                            {t("restaurant.add")}
                        </Button>
                    )
                }
            />

            <Card>
                <CardContent>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder={t("restaurant.search_placeholder")}
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
                                setStatus(v as typeof status);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                                <SelectItem value="unblocked">{t("status.restaurant.unblocked")}</SelectItem>
                                <SelectItem value="blocked">{t("status.restaurant.blocked")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("restaurant.name")}</TableHead>
                                <TableHead>{t("restaurant.address")}</TableHead>
                                <TableHead>{t("restaurant.status")}</TableHead>
                                <TableHead className="w-32 text-right">{t("common.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.name}</TableCell>
                                        <TableCell className="max-w-sm truncate text-muted-foreground">
                                            {r.address}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={r.status === "blocked" ? "destructive" : "secondary"}>
                                                {t(`status.restaurant.${r.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setImagesOf(r)}
                                                aria-label={t("image.title")}
                                                title={t("image.title")}
                                            >
                                                <Images className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setClosedOf(r)}
                                                aria-label={t("restaurant.closed_days")}
                                                title={t("restaurant.closed_days")}
                                            >
                                                <CalendarOff className="h-4 w-4" />
                                            </Button>
                                            {can("restaurant.update") && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(r)}
                                                    aria-label={t("common.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {can("restaurant.delete") && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleting(r)}
                                                    aria-label={t("common.delete")}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <DataPagination pagination={pagination} onPageChange={setPage} />
                </CardContent>
            </Card>

            <Dialog open={formOpen} onOpenChange={(v) => !saving && setFormOpen(v)}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {editing ? t("restaurant.edit_title") : t("restaurant.create_title")}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="r-name">{t("restaurant.name")} *</Label>
                                <Input
                                    id="r-name"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="r-address">{t("restaurant.address")} *</Label>
                                <Textarea
                                    id="r-address"
                                    required
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t("restaurant.status")}</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(v) => setForm({ ...form, status: v as RestaurantStatusEnum })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unblocked">{t("status.restaurant.unblocked")}</SelectItem>
                                        <SelectItem value="blocked">{t("status.restaurant.blocked")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="r-fee">{t("restaurant.service_fee_percent")}</Label>
                                    <Input
                                        id="r-fee"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        value={form.service_fee_percent ?? 0}
                                        onChange={(e) => setForm({ ...form, service_fee_percent: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-tax">{t("restaurant.tax_percent")}</Label>
                                    <Input
                                        id="r-tax"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        value={form.tax_percent ?? 0}
                                        onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
                                    />
                                </div>
                                <p className="col-span-2 text-xs text-muted-foreground">{t("restaurant.fee_hint")}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="r-open">{t("restaurant.open_time")}</Label>
                                    <Input
                                        id="r-open"
                                        type="time"
                                        required
                                        value={form.open_time ?? ""}
                                        onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-close">{t("restaurant.close_time")}</Label>
                                    <Input
                                        id="r-close"
                                        type="time"
                                        required
                                        value={form.close_time ?? ""}
                                        onChange={(e) => setForm({ ...form, close_time: e.target.value })}
                                    />
                                </div>
                                <p className="col-span-2 text-xs text-muted-foreground">{t("restaurant.hours_hint")}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="r-hold">{t("restaurant.hold_minutes")}</Label>
                                    <Input
                                        id="r-hold"
                                        type="number"
                                        min={0}
                                        max={240}
                                        step={1}
                                        value={form.reservation_hold_minutes ?? 30}
                                        onChange={(e) => setForm({ ...form, reservation_hold_minutes: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-noshow">{t("restaurant.no_show_minutes")}</Label>
                                    <Input
                                        id="r-noshow"
                                        type="number"
                                        min={0}
                                        max={240}
                                        step={1}
                                        value={form.no_show_after_minutes ?? 15}
                                        onChange={(e) => setForm({ ...form, no_show_after_minutes: e.target.value })}
                                    />
                                </div>
                                <p className="col-span-2 text-xs text-muted-foreground">{t("restaurant.reservation_timing_hint")}</p>
                            </div>
                            {/* Giai đoạn 13: kênh khách hàng */}
                            <div className="grid gap-2">
                                <Label htmlFor="r-phone">{t("restaurant.phone")}</Label>
                                <Input id="r-phone" type="tel" maxLength={30} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="grid gap-3 rounded-md border p-3">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <Checkbox checked={form.online_booking_enabled !== false} onCheckedChange={(v) => setForm({ ...form, online_booking_enabled: v === true })} />
                                    {t("restaurant.online_booking")}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="r-ob-minutes">{t("restaurant.online_booking_minutes")}</Label>
                                    <Input id="r-ob-minutes" type="number" min={30} max={720} step={1} value={form.online_booking_minutes ?? ""} onChange={(e) => setForm({ ...form, online_booking_minutes: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-ob-lead">{t("restaurant.online_booking_lead")}</Label>
                                    <Input id="r-ob-lead" type="number" min={0} max={10080} step={1} value={form.online_booking_lead_minutes ?? ""} onChange={(e) => setForm({ ...form, online_booking_lead_minutes: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-ob-days">{t("restaurant.online_booking_max_days")}</Label>
                                    <Input id="r-ob-days" type="number" min={1} max={365} step={1} value={form.online_booking_max_days ?? ""} onChange={(e) => setForm({ ...form, online_booking_max_days: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-ob-guests">{t("restaurant.online_booking_max_guests")}</Label>
                                    <Input id="r-ob-guests" type="number" min={1} max={500} step={1} value={form.online_booking_max_guests ?? ""} onChange={(e) => setForm({ ...form, online_booking_max_guests: e.target.value })} />
                                </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <Checkbox checked={form.qr_ordering_enabled !== false} onCheckedChange={(v) => setForm({ ...form, qr_ordering_enabled: v === true })} />
                                    {t("restaurant.qr_ordering")}
                                </label>
                                <p className="text-xs text-muted-foreground">{t("restaurant.customer_channel_hint")}</p>
                            </div>
                            {/* Giai đoạn 14: tài khoản nhận chuyển khoản QR (xác nhận tự động qua SePay) */}
                            <div className="grid gap-3 rounded-md border p-3">
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <Checkbox checked={form.transfer_qr_enabled === true} onCheckedChange={(v) => setForm({ ...form, transfer_qr_enabled: v === true })} />
                                    {t("restaurant.transfer_qr")}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label>{t("restaurant.bank")}</Label>
                                        <Select value={BANKS.some((b) => b.bin === form.bank_bin) ? (form.bank_bin ?? "") : ""} onValueChange={(v) => setForm({ ...form, bank_bin: v })}>
                                            <SelectTrigger aria-label={t("restaurant.bank")}>
                                                <SelectValue placeholder={t("restaurant.bank_placeholder")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BANKS.map((b) => (
                                                    <SelectItem key={b.bin} value={b.bin}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-bank-bin">{t("restaurant.bank_bin")}</Label>
                                        <Input id="r-bank-bin" inputMode="numeric" maxLength={6} value={form.bank_bin ?? ""} onChange={(e) => setForm({ ...form, bank_bin: e.target.value.replace(/\D/g, "") })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-bank-acc">{t("restaurant.bank_account_no")}</Label>
                                        <Input id="r-bank-acc" maxLength={30} value={form.bank_account_no ?? ""} onChange={(e) => setForm({ ...form, bank_account_no: e.target.value.trim() })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-bank-name">{t("restaurant.bank_account_name")}</Label>
                                        <Input id="r-bank-name" maxLength={100} value={form.bank_account_name ?? ""} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value.toUpperCase() })} />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{t("restaurant.transfer_qr_hint")}</p>
                            </div>
                            {/* Giai đoạn 14: người bán trên hóa đơn điện tử */}
                            <div className="grid gap-3 rounded-md border p-3">
                                <p className="text-sm font-medium">{t("restaurant.einvoice")}</p>
                                <div className="grid gap-2">
                                    <Label htmlFor="r-legal">{t("restaurant.legal_name")}</Label>
                                    <Input id="r-legal" maxLength={255} value={form.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-tax">{t("restaurant.tax_code")}</Label>
                                        <Input id="r-tax" inputMode="numeric" maxLength={14} value={form.tax_code ?? ""} onChange={(e) => setForm({ ...form, tax_code: e.target.value.trim() })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-series">{t("restaurant.einvoice_series")}</Label>
                                        <Input id="r-series" maxLength={20} placeholder="1C26TAA" value={form.einvoice_series ?? ""} onChange={(e) => setForm({ ...form, einvoice_series: e.target.value.toUpperCase().trim() })} />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={form.einvoice_auto_issue === true} onCheckedChange={(v) => setForm({ ...form, einvoice_auto_issue: v === true })} />
                                    {t("restaurant.einvoice_auto_issue")}
                                </label>
                                <p className="text-xs text-muted-foreground">{t("restaurant.einvoice_hint")}</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? t("common.processing") : t("common.save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!imagesOf} onOpenChange={(v) => !v && setImagesOf(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("image.of", { name: imagesOf?.name })}</DialogTitle>
                    </DialogHeader>
                    {imagesOf && (
                        <ImageManager
                            key={`restaurant-${imagesOf.id}`}
                            entityType="restaurant"
                            entityId={imagesOf.id}
                            canEdit={can("restaurant.update")}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ClosedDaysDialog
                restaurant={closedOf}
                // Ngày nghỉ: admin hoặc quản lý chi nhánh (room.update)
                canEdit={can("restaurant.update") || can("room.update")}
                onOpenChange={(v) => !v && setClosedOf(null)}
            />

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("restaurant.delete_title")}
                description={t("restaurant.delete_desc", { name: deleting?.name })}
                confirmLabel={t("common.delete")}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default Restaurants;
