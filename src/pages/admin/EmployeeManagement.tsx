import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
    createEmployee,
    deleteEmployee,
    getEmployees,
    getPermissions,
    getUserPermissions,
    updateEmployee,
    updateUserPermissions,
} from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import { MultiSelect } from "@/components/common/MultiSelect";
import PageHeader from "@/components/common/PageHeader";
import PermissionChecklist from "@/components/common/PermissionChecklist";
import { AvatarInput, ProfileFields } from "@/components/common/ProfileFields";
import { cleanProfile, toProfileFields } from "@/lib/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canManage, getAssignableRoles, STAFF_ROLES } from "@/constants/roles";
import type { UserStatusEnum } from "@/enum";
import { useAppSelector, useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IEmployee, IGetQuery, IPagination, IPermission, IProfileFields } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";

const PAGE_SIZE = 10;

interface IEmployeeForm {
    profile: IProfileFields;
    username: string;
    password: string;
    roles: string[];
    status: UserStatusEnum;
    salary: string;
    restaurant_id: string;
    avatar: File | null;
}

const formatMoney = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === "" ? "—" : Number(value).toLocaleString("vi-VN") + " ₫";

const EmployeeManagement = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const me = useAppSelector((s) => s.auth.user);
    const myRoles = useAppSelector((s) => s.auth.roles);
    const myPermissions = useAppSelector((s) => s.auth.permissions);
    const { currentBranch, branches } = useAppSelector((s) => s.restaurant);
    const isAdmin = myRoles.includes("admin");
    const assignableRoles = getAssignableRoles(myRoles);

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const debouncedSearch = useDebounce(search);

    const [form, setForm] = useState<IEmployeeForm | null>(null);
    const [editing, setEditing] = useState<IEmployee | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<IEmployee | null>(null);

    const [permTarget, setPermTarget] = useState<IEmployee | null>(null);
    const [allPermissions, setAllPermissions] = useState<IPermission[]>([]);
    const [rolePerms, setRolePerms] = useState<string[]>([]);
    const [directPerms, setDirectPerms] = useState<string[]>([]);

    // Admin: lọc theo chi nhánh đang chọn (không chọn = tất cả). Người khác: backend tự giới hạn.
    const branchFilter = isAdmin ? currentBranch?.id : undefined;

    const fetcher = useCallback(() => {
        const filters: NonNullable<IGetQuery["filters"]> = [];
        if (branchFilter) filters.push({ field: "restaurant_id", value: branchFilter });
        if (roleFilter !== "all") filters.push({ field: "role", value: roleFilter });
        if (statusFilter !== "all") filters.push({ field: "status", value: statusFilter });
        const query: IGetQuery = { currentPage: page, limit: PAGE_SIZE, filters, orderBy: [{ field: "full_name" }] };
        if (debouncedSearch.trim()) {
            query.search = { text: debouncedSearch.trim(), fields: ["full_name", "email", "phone_number", "username"] };
        }
        return getEmployees(query).catch((error) => {
            toast.error(getErrorMessage(error));
            throw error;
        });
    }, [page, debouncedSearch, roleFilter, statusFilter, branchFilter]);
    const { data, loading, reload } = useAsyncData(fetcher);
    const rows: IEmployee[] = data?.data?.employees || [];
    const pagination: IPagination | null = data?.data?.pagination || null;

    const roleLabel = (role: string) => t(`roles.${role}`, role);
    const branchName = (id: number | null) => branches.find((b) => b.id === id)?.name || "—";

    const openCreate = () => {
        setEditing(null);
        setForm({
            profile: toProfileFields({}),
            username: "",
            password: "",
            roles: [],
            status: "active",
            salary: "",
            restaurant_id: currentBranch ? String(currentBranch.id) : "",
            avatar: null,
        });
    };

    const openEdit = (row: IEmployee) => {
        const e = row.employee;
        setEditing(row);
        setForm({
            profile: toProfileFields(e),
            username: e.username,
            password: "",
            roles: row.roles,
            status: e.status,
            salary: e.salary === null || e.salary === undefined ? "" : String(Number(e.salary)),
            restaurant_id: e.restaurant_id ? String(e.restaurant_id) : "",
            avatar: null,
        });
    };

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!form) return;
        if (form.roles.length === 0) {
            toast.error(t("employee.roles_required"));
            return;
        }
        setSaving(true);
        try {
            const user = {
                ...cleanProfile(form.profile, !!editing),
                status: form.status,
                salary: form.salary === "" ? null : Number(form.salary),
                // Chỉ admin được chọn nhà hàng; người khác backend tự gán nhà hàng của mình
                ...(isAdmin ? { restaurant_id: form.restaurant_id ? Number(form.restaurant_id) : null } : {}),
            };
            const res = editing
                ? await updateEmployee(editing.employee.id, {
                      user,
                      account: { username: form.username },
                      roles: form.roles,
                      avatar: form.avatar,
                  })
                : await createEmployee({
                      user,
                      account: { username: form.username, password: form.password },
                      roles: form.roles,
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
            const res = await deleteEmployee(deleting.employee.id);
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    const openPermissions = async (row: IEmployee) => {
        try {
            const [all, mine] = await Promise.all([
                allPermissions.length ? Promise.resolve({ data: allPermissions }) : getPermissions(),
                getUserPermissions(row.employee.id),
            ]);
            setAllPermissions(all.data || []);
            setRolePerms(mine.data?.role_permissions || []);
            setDirectPerms((mine.data?.direct_permissions || []).filter((p) => !mine.data?.role_permissions.includes(p)));
            setPermTarget(row);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const savePermissions = async () => {
        if (!permTarget) return;
        setSaving(true);
        try {
            const res = await updateUserPermissions(permTarget.employee.id, directPerms);
            toast.success(res.message);
            setPermTarget(null);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    // Người đang sửa có thể đã có vai trò mà mình không gán được -> vẫn hiển thị để không bị mất khi lưu
    const roleOptions = [...new Set([...assignableRoles, ...(form?.roles || [])])]
        .filter((r) => STAFF_ROLES.includes(r))
        .map((r) => ({ value: r, label: roleLabel(r) }));

    return (
        <div>
            <PageHeader
                title={t("employee.title")}
                description={
                    isAdmin && currentBranch
                        ? t("employee.description_branch", { name: currentBranch.name })
                        : t("employee.description")
                }
                actions={
                    can("employee.create") && (
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4" />
                            {t("employee.add")}
                        </Button>
                    )
                }
            />

            <Card>
                <CardContent>
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder={t("employee.search_placeholder")}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <Select
                            value={roleFilter}
                            onValueChange={(v) => {
                                setRoleFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="lg:w-52">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("employee.all_roles")}</SelectItem>
                                {STAFF_ROLES.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {roleLabel(r)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="lg:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                                <SelectItem value="active">{t("status.user.active")}</SelectItem>
                                <SelectItem value="inactive">{t("status.user.inactive")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("user.full_name")}</TableHead>
                                <TableHead>{t("employee.roles")}</TableHead>
                                <TableHead className="hidden md:table-cell">{t("user.contact")}</TableHead>
                                {isAdmin && <TableHead className="hidden lg:table-cell">{t("employee.restaurant")}</TableHead>}
                                <TableHead className="hidden lg:table-cell text-right">{t("employee.salary")}</TableHead>
                                <TableHead>{t("employee.status")}</TableHead>
                                <TableHead className="w-28 text-right">{t("common.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => {
                                    const e = row.employee;
                                    const manageable = e.id === me?.id || canManage(myRoles, row.roles);
                                    return (
                                        <TableRow key={e.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={e.avatar_url || ""} alt="" />
                                                        <AvatarFallback>{e.full_name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{e.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">@{e.username}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {row.roles.map((r) => (
                                                        <Badge key={r} variant="secondary">
                                                            {roleLabel(r)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                <div>{e.phone_number || "—"}</div>
                                                <div>{e.email || ""}</div>
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell className="hidden lg:table-cell">
                                                    {branchName(e.restaurant_id)}
                                                </TableCell>
                                            )}
                                            <TableCell className="hidden lg:table-cell text-right tabular-nums">
                                                {formatMoney(e.salary)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={e.status === "active" ? "outline" : "destructive"}>
                                                    {t(`status.user.${e.status}`)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {manageable && can("permission.assign") && e.id !== me?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openPermissions(row)}
                                                        aria-label={t("employee.permissions")}
                                                        title={t("employee.permissions")}
                                                    >
                                                        <KeyRound className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {manageable && can("employee.update") && e.id !== me?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEdit(row)}
                                                        aria-label={t("common.edit")}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {manageable && can("employee.delete") && e.id !== me?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleting(row)}
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

            {/* Form nhân viên */}
            <Dialog open={!!form} onOpenChange={(v) => !saving && !v && setForm(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    {form && (
                        <form onSubmit={submit}>
                            <DialogHeader>
                                <DialogTitle>{editing ? t("employee.edit_title") : t("employee.create_title")}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 sm:grid-cols-2">
                                <AvatarInput
                                    currentUrl={editing?.employee.avatar_url}
                                    name={form.profile.full_name}
                                    file={form.avatar}
                                    onChange={(avatar) => setForm({ ...form, avatar })}
                                />
                                <ProfileFields
                                    idPrefix="emp"
                                    value={form.profile}
                                    onChange={(profile) => setForm({ ...form, profile })}
                                />
                                <div className="grid gap-2">
                                    <Label htmlFor="emp-username">{t("user.username")} *</Label>
                                    <Input
                                        id="emp-username"
                                        required
                                        minLength={5}
                                        autoComplete="off"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    />
                                </div>
                                {!editing && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="emp-password">{t("user.password")} *</Label>
                                        <Input
                                            id="emp-password"
                                            type="password"
                                            required
                                            minLength={6}
                                            autoComplete="new-password"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>{t("employee.roles")} *</Label>
                                    <MultiSelect
                                        options={roleOptions}
                                        value={form.roles}
                                        onChange={(roles) => setForm({ ...form, roles })}
                                        placeholder={t("employee.roles_placeholder")}
                                        emptyText={t("common.no_data")}
                                    />
                                </div>
                                {isAdmin && (
                                    <div className="grid gap-2">
                                        <Label>{t("employee.restaurant")}</Label>
                                        <Select
                                            value={form.restaurant_id || "none"}
                                            onValueChange={(v) => setForm({ ...form, restaurant_id: v === "none" ? "" : v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t("employee.no_restaurant")}</SelectItem>
                                                {branches.map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="emp-salary">{t("employee.salary")}</Label>
                                    <Input
                                        id="emp-salary"
                                        type="number"
                                        min={0}
                                        step={1000}
                                        value={form.salary}
                                        onChange={(e) => setForm({ ...form, salary: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t("employee.status")}</Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={(v) => setForm({ ...form, status: v as UserStatusEnum })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t("status.user.active")}</SelectItem>
                                            <SelectItem value="inactive">{t("status.user.inactive")}</SelectItem>
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

            {/* Quyền riêng của nhân viên */}
            <Dialog open={!!permTarget} onOpenChange={(v) => !saving && !v && setPermTarget(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{t("permission.direct_title", { name: permTarget?.employee.full_name })}</DialogTitle>
                        <DialogDescription>{t("permission.direct_desc")}</DialogDescription>
                    </DialogHeader>
                    <PermissionChecklist
                        permissions={allPermissions}
                        selected={directPerms}
                        inherited={rolePerms}
                        grantable={isAdmin ? undefined : myPermissions}
                        onChange={setDirectPerms}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPermTarget(null)} disabled={saving}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={savePermissions} disabled={saving}>
                            {saving ? t("common.processing") : t("common.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("employee.delete_title")}
                description={t("employee.delete_desc", { name: deleting?.employee.full_name })}
                confirmLabel={t("common.delete")}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default EmployeeManagement;
