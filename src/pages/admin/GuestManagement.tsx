import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { createGuest, deleteGuest, getGuests, updateGuest } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { AvatarInput, ProfileFields } from "@/components/common/ProfileFields";
import { cleanProfile, toProfileFields } from "@/lib/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GuestStatusEnum } from "@/enum";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IGetQuery, IPagination, IProfileFields, IUserWithAccount } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";

const PAGE_SIZE = 10;

interface IGuestForm {
    profile: IProfileFields;
    username: string;
    password: string;
    guest_status: GuestStatusEnum;
    avatar: File | null;
}

const GuestManagement = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const debouncedSearch = useDebounce(search);

    const [form, setForm] = useState<IGuestForm | null>(null);
    const [editing, setEditing] = useState<IUserWithAccount | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<IUserWithAccount | null>(null);

    const fetcher = useCallback(() => {
        const query: IGetQuery = { currentPage: page, limit: PAGE_SIZE, orderBy: [{ field: "full_name" }] };
        if (statusFilter !== "all") query.filters = [{ field: "guest_status", value: statusFilter }];
        if (debouncedSearch.trim()) {
            query.search = { text: debouncedSearch.trim(), fields: ["full_name", "email", "phone_number", "username"] };
        }
        return getGuests(query).catch((error) => {
            toast.error(getErrorMessage(error));
            throw error;
        });
    }, [page, debouncedSearch, statusFilter]);
    const { data, loading, reload } = useAsyncData(fetcher);
    const rows: IUserWithAccount[] = data?.data?.guests || [];
    const pagination: IPagination | null = data?.data?.pagination || null;

    const openCreate = () => {
        setEditing(null);
        setForm({ profile: toProfileFields({}), username: "", password: "", guest_status: "new", avatar: null });
    };

    const openEdit = (guest: IUserWithAccount) => {
        setEditing(guest);
        setForm({
            profile: toProfileFields(guest),
            username: guest.username,
            password: "",
            guest_status: guest.guest_status || "new",
            avatar: null,
        });
    };

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!form) return;
        setSaving(true);
        try {
            const user = { ...cleanProfile(form.profile, !!editing), guest_status: form.guest_status };
            const res = editing
                ? await updateGuest(editing.id, { user, account: { username: form.username }, avatar: form.avatar })
                : await createGuest({
                      user,
                      account: { username: form.username, password: form.password },
                      avatar: form.avatar,
                  });
            toast.success(res.message);
            setForm(null);
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
            const res = await deleteGuest(deleting.id);
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <div>
            <PageHeader
                title={t("guest.title")}
                description={t("guest.description")}
                actions={
                    can("guest.create") && (
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4" />
                            {t("guest.add")}
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
                                placeholder={t("guest.search_placeholder")}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                                <SelectItem value="new">{t("status.guest.new")}</SelectItem>
                                <SelectItem value="regular">{t("status.guest.regular")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("user.full_name")}</TableHead>
                                <TableHead className="hidden md:table-cell">{t("user.contact")}</TableHead>
                                <TableHead>{t("guest.guest_status")}</TableHead>
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
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((g) => (
                                    <TableRow key={g.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={g.avatar_url || ""} alt="" />
                                                    <AvatarFallback>{g.full_name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{g.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">@{g.username}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            <div>{g.phone_number || "—"}</div>
                                            <div>{g.email || ""}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={g.guest_status === "regular" ? "default" : "secondary"}>
                                                {t(`status.guest.${g.guest_status || "new"}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            {can("guest.update") && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(g)}
                                                    aria-label={t("common.edit")}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {can("guest.delete") && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleting(g)}
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

            <Dialog open={!!form} onOpenChange={(v) => !saving && !v && setForm(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    {form && (
                        <form onSubmit={submit}>
                            <DialogHeader>
                                <DialogTitle>{editing ? t("guest.edit_title") : t("guest.create_title")}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 sm:grid-cols-2">
                                <AvatarInput
                                    currentUrl={editing?.avatar_url}
                                    name={form.profile.full_name}
                                    file={form.avatar}
                                    onChange={(avatar) => setForm({ ...form, avatar })}
                                />
                                <ProfileFields
                                    idPrefix="guest"
                                    value={form.profile}
                                    onChange={(profile) => setForm({ ...form, profile })}
                                />
                                <div className="grid gap-2">
                                    <Label htmlFor="guest-username">{t("user.username")} *</Label>
                                    <Input
                                        id="guest-username"
                                        required
                                        minLength={5}
                                        autoComplete="off"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    />
                                </div>
                                {!editing && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="guest-password">{t("user.password")} *</Label>
                                        <Input
                                            id="guest-password"
                                            type="password"
                                            required
                                            minLength={6}
                                            autoComplete="new-password"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label>{t("guest.guest_status")}</Label>
                                    <Select
                                        value={form.guest_status}
                                        onValueChange={(v) => setForm({ ...form, guest_status: v as GuestStatusEnum })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">{t("status.guest.new")}</SelectItem>
                                            <SelectItem value="regular">{t("status.guest.regular")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setForm(null)} disabled={saving}>
                                    {t("common.cancel")}
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
                title={t("guest.delete_title")}
                description={t("guest.delete_desc", { name: deleting?.full_name })}
                confirmLabel={t("common.delete")}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default GuestManagement;
