import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import type { IPermission } from "@/interfaces";
import { cn } from "@/lib/utils";

interface PermissionChecklistProps {
    permissions: IPermission[];
    selected: string[];
    onChange: (next: string[]) => void;
    /** Quyền hiển thị đã tick nhưng không bỏ được (ví dụ: quyền nhận qua vai trò) */
    inherited?: string[];
    /** Chỉ được thay đổi các quyền trong danh sách này (người thao tác đang có); undefined = không giới hạn */
    grantable?: string[];
    disabled?: boolean;
}

/** Danh sách quyền gom theo tài nguyên (user, employee, room, ...) */
export const PermissionChecklist = ({
    permissions,
    selected,
    onChange,
    inherited = [],
    grantable,
    disabled,
}: PermissionChecklistProps) => {
    const { t } = useTranslation("admin");

    const groups = useMemo(() => {
        const map = new Map<string, IPermission[]>();
        permissions.forEach((p) => {
            const resource = p.type_name.split(".")[0];
            map.set(resource, [...(map.get(resource) || []), p]);
        });
        return [...map.entries()];
    }, [permissions]);

    const toggle = (typeName: string, checked: boolean) =>
        onChange(checked ? [...new Set([...selected, typeName])] : selected.filter((p) => p !== typeName));

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map(([resource, items]) => (
                <div key={resource} className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-semibold">{t(`permission.resources.${resource}`, resource)}</p>
                    <div className="grid gap-2">
                        {items.map((p) => {
                            const action = p.type_name.split(".")[1];
                            const isInherited = inherited.includes(p.type_name);
                            const locked =
                                disabled || isInherited || (grantable !== undefined && !grantable.includes(p.type_name));
                            return (
                                <label
                                    key={p.type_name}
                                    className={cn(
                                        "flex items-center gap-2 text-sm",
                                        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                                    )}
                                    title={p.type_name}
                                >
                                    <Checkbox
                                        checked={isInherited || selected.includes(p.type_name)}
                                        disabled={locked}
                                        onCheckedChange={(v) => toggle(p.type_name, v === true)}
                                    />
                                    <span>{t(`permission.actions.${action}`, action)}</span>
                                    {isInherited && (
                                        <span className="text-xs text-muted-foreground">({t("permission.from_role")})</span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PermissionChecklist;
