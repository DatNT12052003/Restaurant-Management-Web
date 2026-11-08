import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { decideLeave, decideShiftSwap, getLeaves, getShiftSwaps } from "@/apis";
import ReasonDialog from "@/components/common/ReasonDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAsyncData, usePermission } from "@/hooks";
import type { LeaveStatusEnum, ShiftSwapStatusEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatDay, LEAVE_TONE, SWAP_TONE } from "@/lib/hr";
import { StatusBadge } from "./shared";

/** Duyệt đổi ca (`shift.manage`) và đơn nghỉ phép (`leave.approve`) của chi nhánh */
const ApprovalsTab = ({ restaurantId }: { restaurantId?: number }) => {
    const can = usePermission();
    return (
        <div className="grid gap-4 xl:grid-cols-2">
            {can("shift.manage") && <SwapsCard restaurantId={restaurantId} />}
            {can("leave.approve") && <LeavesCard restaurantId={restaurantId} />}
        </div>
    );
};

type Reject = { kind: "swap" | "leave"; id: number } | null;

const SwapsCard = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const [status, setStatus] = useState<ShiftSwapStatusEnum | "all">("pending_approval");
    const [reject, setReject] = useState<Reject>(null);
    const fetcher = useCallback(async () => {
        try {
            return (await getShiftSwaps(status === "all" ? undefined : status, restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [status, restaurantId]);
    const { data: swaps = [], loading, reload } = useAsyncData(fetcher);
    const shift = (s?: { work_date: string; start_at: string; end_at: string } | null) =>
        s ? `${formatDay(s.work_date, i18n.language)} ${formatTime(s.start_at, i18n.language)}–${formatTime(s.end_at, i18n.language)}` : "";

    const decide = async (id: number, approve: boolean, note?: string) => {
        try {
            toast.success((await decideShiftSwap(id, approve, note)).message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">{t("hr.approvals.swaps")}</CardTitle>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="w-48" aria-label={t("hr.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {(["pending_approval", "pending_target", "approved", "rejected", "declined", "cancelled"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`hr.swap.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="grid gap-2">
                {!swaps.length && <p className="text-sm text-muted-foreground">{loading ? t("common.loading") : t("common.no_data")}</p>}
                {swaps.map((s) => (
                    <div key={s.id} className="grid gap-2 rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="font-medium">
                                    {s.target_shift
                                        ? t("hr.approvals.swap_exchange", { from: s.requester_name, to: s.target_name })
                                        : t("hr.approvals.swap_give", { from: s.requester_name, to: s.target_name })}
                                </p>
                                <p className="text-muted-foreground">
                                    {shift(s.shift)}
                                    {s.target_shift && ` ⇄ ${shift(s.target_shift)}`}
                                </p>
                                {s.reason && <p className="text-muted-foreground italic">“{s.reason}”</p>}
                                {s.decided_by_name && (
                                    <p className="text-xs text-muted-foreground">
                                        {t("hr.approvals.decided_by", { name: s.decided_by_name })}
                                        {s.decision_note && ` · ${s.decision_note}`}
                                    </p>
                                )}
                            </div>
                            <StatusBadge tone={SWAP_TONE[s.status]} label={t(`hr.swap.status.${s.status}`)} />
                        </div>
                        {s.status === "pending_approval" && (
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => decide(s.id, true).catch(() => undefined)}>
                                    {t("hr.approvals.approve")}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setReject({ kind: "swap", id: s.id })}>
                                    {t("hr.approvals.reject")}
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
            <ReasonDialog
                open={!!reject}
                onOpenChange={(v) => !v && setReject(null)}
                title={t("hr.approvals.reject_swap")}
                confirmLabel={t("hr.approvals.reject")}
                onConfirm={(note) => decide(reject!.id, false, note)}
            />
        </Card>
    );
};

const LeavesCard = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const [status, setStatus] = useState<LeaveStatusEnum | "all">("pending");
    const [reject, setReject] = useState<Reject>(null);
    const fetcher = useCallback(async () => {
        try {
            return (await getLeaves(status === "all" ? {} : { status }, restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [status, restaurantId]);
    const { data: leaves = [], loading, reload } = useAsyncData(fetcher);

    const decide = async (id: number, approve: boolean, note?: string) => {
        try {
            toast.success((await decideLeave(id, approve, note)).message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">{t("hr.approvals.leaves")}</CardTitle>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger className="w-48" aria-label={t("hr.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {(["pending", "approved", "rejected", "cancelled"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`hr.leave.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="grid gap-2">
                {!leaves.length && <p className="text-sm text-muted-foreground">{loading ? t("common.loading") : t("common.no_data")}</p>}
                {leaves.map((l) => (
                    <div key={l.id} className="grid gap-2 rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="font-medium">
                                    {l.full_name} · {t(`hr.leave.type.${l.type}`)}
                                </p>
                                <p className="text-muted-foreground tabular-nums">
                                    {formatDay(l.start_date, i18n.language)}
                                    {l.end_date !== l.start_date && ` – ${formatDay(l.end_date, i18n.language)}`} · {t("hr.leave.days", { count: l.days })}
                                </p>
                                {l.reason && <p className="text-muted-foreground italic">“{l.reason}”</p>}
                                {l.decided_by_name && (
                                    <p className="text-xs text-muted-foreground">
                                        {t("hr.approvals.decided_by", { name: l.decided_by_name })}
                                        {l.decision_note && ` · ${l.decision_note}`}
                                    </p>
                                )}
                            </div>
                            <StatusBadge tone={LEAVE_TONE[l.status]} label={t(`hr.leave.status.${l.status}`)} />
                        </div>
                        {l.status === "pending" && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button size="sm" onClick={() => decide(l.id, true).catch(() => undefined)}>
                                    {t("hr.approvals.approve")}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setReject({ kind: "leave", id: l.id })}>
                                    {t("hr.approvals.reject")}
                                </Button>
                                <span className="text-xs text-muted-foreground">{t("hr.approvals.leave_hint")}</span>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
            <ReasonDialog
                open={!!reject}
                onOpenChange={(v) => !v && setReject(null)}
                title={t("hr.approvals.reject_leave")}
                confirmLabel={t("hr.approvals.reject")}
                onConfirm={(note) => decide(reject!.id, false, note)}
            />
        </Card>
    );
};

export default ApprovalsTab;
