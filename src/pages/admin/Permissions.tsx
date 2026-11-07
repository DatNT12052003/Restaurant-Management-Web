import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { getPermissions, getRoles, updateRolePermissions } from "@/apis";
import PageHeader from "@/components/common/PageHeader";
import PermissionChecklist from "@/components/common/PermissionChecklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector, useAsyncData, usePermission } from "@/hooks";
import type { IPermission, IRoleWithPermissions } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

const Permissions = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const myRoles = useAppSelector((s) => s.auth.roles);
    const myPermissions = useAppSelector((s) => s.auth.permissions);
    const isAdmin = myRoles.includes("admin");

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [draft, setDraft] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const fetcher = useCallback(
        () =>
            Promise.all([getRoles(), getPermissions()]).catch((error) => {
                toast.error(getErrorMessage(error));
                throw error;
            }),
        [],
    );
    const { data, loading, reload } = useAsyncData(fetcher);
    const roles: IRoleWithPermissions[] = useMemo(() => data?.[0].data || [], [data]);
    const permissions: IPermission[] = data?.[1].data || [];

    const selected = useMemo(() => roles.find((r) => r.id === selectedId) || null, [roles, selectedId]);
    const dirty = !!selected && !sameSet(draft, selected.permissions);
    const editable = !!selected?.editable && can("permission.assign");

    const selectRole = (role: IRoleWithPermissions) => {
        if (dirty && !window.confirm(t("permission.unsaved"))) return;
        setSelectedId(role.id);
        setDraft(role.permissions);
    };

    const save = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await updateRolePermissions(selected.id, draft);
            toast.success(res.message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeader title={t("permission.title")} description={t("permission.description")} />

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                    <div className="flex flex-col gap-1">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => selectRole(role)}
                                className={cn(
                                    "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                                    role.id === selectedId && "border-primary bg-accent",
                                )}
                            >
                                <span>
                                    <span className="font-medium">{t(`roles.${role.type_name}`, role.name)}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {t("permission.users_count", { count: role.user_count })} ·{" "}
                                        {t("permission.permissions_count", { count: role.permissions.length })}
                                    </span>
                                </span>
                                {!role.editable && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            </button>
                        ))}
                    </div>

                    <Card>
                        {!selected ? (
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("permission.select_role")}
                            </CardContent>
                        ) : (
                            <>
                                <CardHeader className="flex flex-row items-start justify-between gap-2">
                                    <div>
                                        <CardTitle>{t(`roles.${selected.type_name}`, selected.name)}</CardTitle>
                                        <CardDescription>
                                            {selected.type_name === "admin"
                                                ? t("permission.locked_admin")
                                                : !editable
                                                  ? t("permission.read_only")
                                                  : t("permission.edit_hint")}
                                        </CardDescription>
                                    </div>
                                    {editable && (
                                        <div className="flex items-center gap-2">
                                            {dirty && <Badge variant="secondary">{t("permission.changed")}</Badge>}
                                            <Button
                                                variant="outline"
                                                disabled={!dirty || saving}
                                                onClick={() => setDraft(selected.permissions)}
                                            >
                                                {t("permission.reset")}
                                            </Button>
                                            <Button disabled={!dirty || saving} onClick={save}>
                                                {saving ? t("common.processing") : t("common.save")}
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <PermissionChecklist
                                        permissions={permissions}
                                        selected={draft}
                                        onChange={setDraft}
                                        disabled={!editable}
                                        grantable={isAdmin ? undefined : myPermissions}
                                    />
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Permissions;
