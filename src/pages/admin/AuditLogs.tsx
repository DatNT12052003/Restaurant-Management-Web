import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

import { getAuditFacets, getAuditLog, getAuditLogs } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppSelector, useAsyncData } from "@/hooks";
import type { IAuditLog, IAuditLogQuery } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatDateTime, startOfDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const ALL = "__all";
const PAGE_SIZE = 20;

/** Hành động nhạy cảm (đặc tả 6.1): tô nổi trong danh sách */
const SENSITIVE = new Set([
    "auth.login_failed",
    "role.permissions_update",
    "user.permissions_update",
    "payment.refund",
    "inventory.adjust",
    "inventory.export",
    "order.cancel",
    "order_item.cancel",
]);

/** Nhật ký hoạt động (đặc tả 4.11): chỉ xem; manager chỉ thấy dòng của chi nhánh mình */
const AuditLogs = () => {
    const { t } = useTranslation("admin");
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const restaurantId = roles.includes("admin") ? currentBranch?.id : undefined;

    const [module, setModule] = useState(ALL);
    const [action, setAction] = useState(ALL);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<string | null>(null);

    const actionLabel = useCallback((a: string) => t(`audit.action.${a}`, { defaultValue: a }), [t]);

    const facetsFetcher = useCallback(async () => (await getAuditFacets(restaurantId)).data ?? { actions: [], entity_types: [] }, [restaurantId]);
    const { data: facets } = useAsyncData(facetsFetcher);
    const modules = useMemo(() => [...new Set((facets?.actions ?? []).map((a) => a.split(".")[0]))].sort(), [facets]);
    const actions = useMemo(
        () => (facets?.actions ?? []).filter((a) => module === ALL || a.startsWith(`${module}.`)),
        [facets, module],
    );

    const fetcher = useCallback(async () => {
        const query: IAuditLogQuery = { currentPage: page, limit: PAGE_SIZE };
        if (restaurantId) query.restaurant_id = restaurantId;
        if (action !== ALL) query.action = action;
        else if (module !== ALL) query.module = module;
        if (from) query.from = startOfDay(from).toISOString();
        if (to) query.to = addDays(startOfDay(to), 1).toISOString();
        try {
            return (await getAuditLogs(query)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, restaurantId, action, module, from, to]);
    const { data, loading } = useAsyncData(fetcher);

    const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
        set(v);
        setPage(1);
    };

    return (
        <div>
            <PageHeader title={t("audit.title")} description={t("audit.description")} />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Select
                    value={module}
                    onValueChange={(v) => {
                        setModule(v);
                        setAction(ALL);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44" aria-label={t("audit.module")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>{t("audit.all_modules")}</SelectItem>
                        {modules.map((m) => (
                            <SelectItem key={m} value={m}>
                                {t(`audit.module_name.${m}`, { defaultValue: m })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={action} onValueChange={resetPage(setAction)}>
                    <SelectTrigger className="w-60" aria-label={t("audit.action_label")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>{t("audit.all_actions")}</SelectItem>
                        {actions.map((a) => (
                            <SelectItem key={a} value={a}>
                                {actionLabel(a)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input type="date" className="w-40" aria-label={t("report.from")} value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} />
                <span className="text-muted-foreground">–</span>
                <Input type="date" className="w-40" aria-label={t("report.to")} value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-40">{t("audit.time")}</TableHead>
                                <TableHead>{t("audit.actor")}</TableHead>
                                <TableHead>{t("audit.action_label")}</TableHead>
                                <TableHead>{t("audit.entity")}</TableHead>
                                {!restaurantId && <TableHead>{t("report.restaurant")}</TableHead>}
                                <TableHead>{t("audit.ip")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !data?.audit_logs.length ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("audit.empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.audit_logs.map((log) => (
                                    <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelected(log.id)}>
                                        <TableCell className="text-xs tabular-nums text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                                        <TableCell className="font-medium">{log.actor_name ?? "—"}</TableCell>
                                        <TableCell>
                                            <span className={cn("inline-flex items-center gap-1", SENSITIVE.has(log.action) && "font-medium")}>
                                                {SENSITIVE.has(log.action) && <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-label={t("audit.sensitive")} />}
                                                {actionLabel(log.action)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {t(`audit.entity_type.${log.entity_type}`, { defaultValue: log.entity_type })}
                                            {log.entity_id ? ` #${log.entity_id}` : ""}
                                        </TableCell>
                                        {!restaurantId && <TableCell className="text-sm">{log.restaurant_name ?? <span className="text-muted-foreground">{t("audit.chain")}</span>}</TableCell>}
                                        <TableCell className="text-xs text-muted-foreground">{log.ip ?? "—"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}

            <AuditDetailDialog id={selected} onClose={() => setSelected(null)} actionLabel={actionLabel} />
        </div>
    );
};

type Flat = Record<string, unknown>;

/** { user: { salary: 1 } } -> { "user.salary": 1 }; mảng giữ nguyên */
const flatten = (value: unknown, prefix = "", out: Flat = {}): Flat => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const entries = Object.entries(value as Flat);
        if (!entries.length && prefix) out[prefix] = {};
        for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    } else if (prefix) {
        out[prefix] = value;
    }
    return out;
};

const show = (v: unknown) => {
    if (v === undefined) return "";
    if (v === null) return "null";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
};

/** Chi tiết một dòng: người thao tác, thiết bị, và bảng so sánh trước / sau */
const AuditDetailDialog = ({ id, onClose, actionLabel }: { id: string | null; onClose: () => void; actionLabel: (a: string) => string }) => {
    const { t } = useTranslation("admin");
    const fetcher = useCallback(async () => {
        if (!id) return null;
        try {
            return (await getAuditLog(id)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [id]);
    const { data, loading } = useAsyncData(fetcher);
    const log: IAuditLog | null | undefined = id ? data : null;

    const rows = useMemo(() => {
        if (!log) return [];
        const before = flatten(log.before);
        const after = flatten(log.after);
        const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
        // Dữ liệu không phải object (ví dụ danh sách dòng phiếu kho) -> hiện nguyên giá trị
        if (!keys.length && (log.before !== null || log.after !== null)) return [{ key: "", before: log.before, after: log.after }];
        return keys.map((key) => ({ key, before: before[key], after: after[key] }));
    }, [log]);

    return (
        <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{log ? actionLabel(log.action) : t("audit.detail")}</DialogTitle>
                </DialogHeader>
                {loading || !log ? (
                    <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>
                ) : (
                    <div className="grid gap-4 text-sm">
                        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
                            <dt className="text-muted-foreground">{t("audit.time")}</dt>
                            <dd className="tabular-nums">{formatDateTime(log.created_at)}</dd>
                            <dt className="text-muted-foreground">{t("audit.actor")}</dt>
                            <dd>
                                {log.actor_name ?? "—"}
                                {log.user_id && <span className="text-muted-foreground"> (#{log.user_id})</span>}
                            </dd>
                            <dt className="text-muted-foreground">{t("audit.entity")}</dt>
                            <dd>
                                {t(`audit.entity_type.${log.entity_type}`, { defaultValue: log.entity_type })}
                                {log.entity_id ? ` #${log.entity_id}` : ""}
                            </dd>
                            <dt className="text-muted-foreground">{t("report.restaurant")}</dt>
                            <dd>{log.restaurant_name ?? t("audit.chain")}</dd>
                            <dt className="text-muted-foreground">{t("audit.ip")}</dt>
                            <dd>{log.ip ?? "—"}</dd>
                            <dt className="text-muted-foreground">{t("audit.device")}</dt>
                            <dd className="break-all text-xs text-muted-foreground">{log.user_agent ?? "—"}</dd>
                        </dl>

                        {rows.length > 0 ? (
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("audit.field")}</TableHead>
                                            <TableHead>{t("audit.before")}</TableHead>
                                            <TableHead>{t("audit.after")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((r) => (
                                            <TableRow key={r.key}>
                                                <TableCell className="align-top font-mono text-xs">{r.key || "—"}</TableCell>
                                                <TableCell className="max-w-56 align-top">
                                                    <code className="break-all text-xs text-red-700 dark:text-red-400">{show(r.before)}</code>
                                                </TableCell>
                                                <TableCell className="max-w-56 align-top">
                                                    <code className="break-all text-xs text-emerald-700 dark:text-emerald-400">{show(r.after)}</code>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">{t("audit.no_changes")}</p>
                        )}
                        <Badge variant="outline" className="w-fit">
                            {t("audit.readonly")}
                        </Badge>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AuditLogs;
