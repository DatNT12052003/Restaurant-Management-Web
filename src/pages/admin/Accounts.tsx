import { useCallback, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, Lock, LogOut, Search, Unlock } from "lucide-react";

import { getAccountList, logoutAccountEverywhere, resetAccountPassword, unlockAccount } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canManage } from "@/constants/roles";
import { useAppSelector, useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { IAccountListItem, IAccountListQuery } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime, formatTime } from "@/lib/datetime";

const PAGE_SIZE = 20;

type Action = { kind: "unlock" | "logout"; account: IAccountListItem } | null;

/** Tài khoản đăng nhập: trạng thái khóa, lần đăng nhập cuối; mở khóa, đăng xuất từ xa, đặt lại mật khẩu */
const Accounts = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const myRoles = useAppSelector((s) => s.auth.roles);
    const me = useAppSelector((s) => s.auth.user);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = myRoles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;

    const [kind, setKind] = useState<"employee" | "guest">("employee");
    const [lockedOnly, setLockedOnly] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [page, setPage] = useState(1);
    const [action, setAction] = useState<Action>(null);
    const [resetOf, setResetOf] = useState<IAccountListItem | null>(null);

    const fetcher = useCallback(async () => {
        const query: IAccountListQuery = { currentPage: page, limit: PAGE_SIZE, kind };
        if (lockedOnly) query.locked = true;
        // Khách không thuộc chi nhánh nào: chỉ lọc chi nhánh khi xem nhân viên
        if (restaurantId && kind === "employee") query.restaurant_id = restaurantId;
        if (debouncedSearch.trim()) query.search = { text: debouncedSearch.trim(), fields: ["username", "full_name"] };
        try {
            return (await getAccountList(query)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, kind, lockedOnly, restaurantId, debouncedSearch]);
    const { data, loading, reload } = useAsyncData(fetcher);

    const canUpdate = can("account.update");
    const manageable = (a: IAccountListItem) => canUpdate && a.user_id !== me?.id && canManage(myRoles, a.roles);

    const runAction = async () => {
        if (!action) return;
        try {
            const res =
                action.kind === "unlock"
                    ? await unlockAccount(action.account.user_id)
                    : await logoutAccountEverywhere(action.account.user_id);
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <div>
            <PageHeader title={t("account.title")} description={t("account.description")} />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Select
                    value={kind}
                    onValueChange={(v) => {
                        setKind(v as "employee" | "guest");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-40" aria-label={t("account.kind")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="employee">{t("account.kind_employee")}</SelectItem>
                        <SelectItem value="guest">{t("account.kind_guest")}</SelectItem>
                    </SelectContent>
                </Select>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder={t("account.search")}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={lockedOnly}
                        onCheckedChange={(v) => {
                            setLockedOnly(v === true);
                            setPage(1);
                        }}
                    />
                    {t("account.locked_only")}
                </label>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("account.user")}</TableHead>
                                <TableHead>{t("account.username")}</TableHead>
                                <TableHead>{t("account.roles")}</TableHead>
                                {isAdmin && !restaurantId && kind === "employee" && <TableHead>{t("report.restaurant")}</TableHead>}
                                <TableHead>{t("account.last_login")}</TableHead>
                                <TableHead>{t("account.status")}</TableHead>
                                {canUpdate && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !data?.accounts.length ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("account.empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.accounts.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-medium">{a.full_name}</TableCell>
                                        <TableCell className="font-mono text-sm">{a.username}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {a.roles.map((r) => (
                                                    <Badge key={r} variant="secondary">
                                                        {t(`roles.${r}`, r)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        {isAdmin && !restaurantId && kind === "employee" && (
                                            <TableCell className="text-sm">{a.restaurant_name ?? "—"}</TableCell>
                                        )}
                                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                                            {a.last_login_at ? formatDateTime(a.last_login_at) : t("account.never")}
                                        </TableCell>
                                        <TableCell>
                                            {a.is_locked && a.locked_until ? (
                                                <Badge variant="outline" className="gap-1 border-amber-400 text-amber-800 dark:text-amber-300">
                                                    <Lock className="h-3 w-3" />
                                                    {t("account.locked_until", { time: formatTime(a.locked_until) })}
                                                </Badge>
                                            ) : a.user_status === "inactive" ? (
                                                <Badge variant="outline">{t("account.inactive")}</Badge>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">{t("account.active")}</span>
                                            )}
                                        </TableCell>
                                        {canUpdate && (
                                            <TableCell className="text-right">
                                                {manageable(a) && (
                                                    <div className="flex justify-end gap-1">
                                                        {a.is_locked && (
                                                            <Button size="sm" variant="outline" onClick={() => setAction({ kind: "unlock", account: a })}>
                                                                <Unlock className="h-3.5 w-3.5" />
                                                                {t("account.unlock")}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            title={t("account.logout_all")}
                                                            aria-label={t("account.logout_all")}
                                                            onClick={() => setAction({ kind: "logout", account: a })}
                                                        >
                                                            <LogOut className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            title={t("account.reset_password")}
                                                            aria-label={t("account.reset_password")}
                                                            onClick={() => setResetOf(a)}
                                                        >
                                                            <KeyRound className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}

            <ConfirmDialog
                open={!!action}
                onOpenChange={(v) => !v && setAction(null)}
                destructive={action?.kind === "logout"}
                title={action?.kind === "unlock" ? t("account.unlock_title") : t("account.logout_all_title")}
                description={
                    action
                        ? t(action.kind === "unlock" ? "account.unlock_desc" : "account.logout_all_desc", { name: action.account.full_name })
                        : undefined
                }
                confirmLabel={action?.kind === "unlock" ? t("account.unlock") : t("account.logout_all")}
                onConfirm={runAction}
            />
            <ResetPasswordDialog account={resetOf} onClose={() => setResetOf(null)} onDone={reload} />
        </div>
    );
};

/** Đặt mật khẩu mới cho người dùng; người dùng bị đăng xuất khỏi mọi thiết bị */
const ResetPasswordDialog = ({
    account,
    onClose,
    onDone,
}: {
    account: IAccountListItem | null;
    onClose: () => void;
    onDone: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    const tooShort = password.length > 0 && password.length < 6;
    const mismatch = confirm.length > 0 && confirm !== password;

    const close = () => {
        setPassword("");
        setConfirm("");
        onClose();
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!account || password.length < 6 || password !== confirm) return;
        setSaving(true);
        try {
            const res = await resetAccountPassword(account.user_id, { new_password: password, confirm_password: confirm });
            toast.success(res.message);
            onDone();
            close();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={!!account} onOpenChange={(v) => !v && close()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{t("account.reset_password_title", { name: account?.full_name ?? "" })}</DialogTitle>
                        <DialogDescription>{t("account.reset_password_desc")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="acc-new-password">{t("account.new_password")}</Label>
                        <Input
                            id="acc-new-password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-invalid={tooShort}
                        />
                        {tooShort && <p className="text-xs text-destructive">{t("account.password_min")}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="acc-confirm-password">{t("account.confirm_password")}</Label>
                        <Input
                            id="acc-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            aria-invalid={mismatch}
                        />
                        {mismatch && <p className="text-xs text-destructive">{t("account.password_mismatch")}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close} disabled={saving}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={saving || password.length < 6 || password !== confirm}>
                            {saving ? t("common.processing") : t("account.reset_password")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default Accounts;
