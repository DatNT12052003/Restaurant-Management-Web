import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Repeat } from "lucide-react";

import { createSwap, getColleagues, getColleagueShifts, getMyShifts, getMySwaps, respondSwap } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector, useAsyncData, useNow } from "@/hooks";
import type { IShiftAssignment, IShiftSwap } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatDay, formatDayShort, mondayOf, shiftDay, SWAP_TONE, todayStr, weekDays } from "@/lib/hr";
import { StatusBadge, WeekNav } from "../workforce/shared";

const shiftLabel = (s: { work_date: string; start_at: string; end_at: string }, locale: string) =>
    `${formatDay(s.work_date, locale)} ${formatTime(s.start_at, locale)}–${formatTime(s.end_at, locale)}`;

/** Lịch làm của tôi theo tuần; xin đổi / nhường ca; trả lời yêu cầu đổi ca của đồng nghiệp */
const MyScheduleTab = () => {
    const { t, i18n } = useTranslation("admin");
    const myId = useAppSelector((s) => s.auth.user?.id);
    const [monday, setMonday] = useState(mondayOf(todayStr()));
    const [swapShift, setSwapShift] = useState<IShiftAssignment | null>(null);

    const shiftsFetcher = useCallback(async () => {
        try {
            return (await getMyShifts({ from: monday, to: shiftDay(monday, 6) })).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [monday]);
    const { data: shifts = [], reload: reloadShifts } = useAsyncData(shiftsFetcher);
    const swapsFetcher = useCallback(async () => (await getMySwaps()).data ?? [], []);
    const { data: swaps = [], reload: reloadSwaps } = useAsyncData(swapsFetcher);

    const act = async (swap: IShiftSwap, action: "accept" | "decline" | "cancel") => {
        try {
            toast.success((await respondSwap(swap.id, action)).message);
            reloadSwaps();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const now = useNow();
    const openSwapShiftIds = new Set(swaps.filter((s) => ["pending_target", "pending_approval"].includes(s.status)).map((s) => s.assignment_id));

    return (
        <div className="grid gap-4">
            <WeekNav monday={monday} onChange={setMonday} />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
                {weekDays(monday).map((day) => {
                    const list = shifts.filter((s) => s.work_date === day);
                    return (
                        <Card key={day} className={day === todayStr() ? "border-primary" : undefined}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">{formatDayShort(day, i18n.language)}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-2">
                                {!list.length && <p className="text-xs text-muted-foreground">{t("hr.schedule.day_off")}</p>}
                                {list.map((s) => {
                                    const canSwap = new Date(s.start_at).getTime() > now && !s.attendance_id && !openSwapShiftIds.has(s.id);
                                    return (
                                        <div key={s.id} className="rounded-md border p-2 text-sm">
                                            <p className="font-medium tabular-nums">
                                                {formatTime(s.start_at, i18n.language)}–{formatTime(s.end_at, i18n.language)}
                                            </p>
                                            {s.template_name && <p className="text-xs text-muted-foreground">{s.template_name}</p>}
                                            {s.attendance_id && <p className="text-xs text-emerald-700 dark:text-emerald-300">{t("hr.schedule.clocked")}</p>}
                                            {canSwap && (
                                                <Button variant="ghost" size="sm" className="mt-1 h-7 px-2" onClick={() => setSwapShift(s)}>
                                                    <Repeat className="size-3.5" />
                                                    {t("hr.swap.request")}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("hr.swap.my_requests")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    {!swaps.length && <p className="text-sm text-muted-foreground">{t("common.no_data")}</p>}
                    {swaps.map((s) => {
                        const incoming = s.target_user_id === myId;
                        return (
                            <div key={s.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <div className="grid gap-0.5">
                                    <p>
                                        {incoming
                                            ? t("hr.swap.incoming", { name: s.requester_name })
                                            : t("hr.swap.outgoing", { name: s.target_name })}
                                    </p>
                                    {s.shift && <p className="text-muted-foreground">{t("hr.swap.their_shift", { shift: shiftLabel(s.shift, i18n.language) })}</p>}
                                    <p className="text-muted-foreground">
                                        {s.target_shift ? t("hr.swap.in_exchange", { shift: shiftLabel(s.target_shift, i18n.language) }) : t("hr.swap.give_away")}
                                    </p>
                                    {s.reason && <p className="text-muted-foreground italic">“{s.reason}”</p>}
                                    {s.decision_note && <p className="text-xs text-muted-foreground">{t("hr.swap.decision_note", { note: s.decision_note })}</p>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone={SWAP_TONE[s.status]} label={t(`hr.swap.status.${s.status}`)} />
                                    {incoming && s.status === "pending_target" && (
                                        <>
                                            <Button size="sm" onClick={() => act(s, "accept")}>
                                                {t("hr.swap.accept")}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => act(s, "decline")}>
                                                {t("hr.swap.decline")}
                                            </Button>
                                        </>
                                    )}
                                    {!incoming && ["pending_target", "pending_approval"].includes(s.status) && (
                                        <Button size="sm" variant="outline" onClick={() => act(s, "cancel")}>
                                            {t("hr.swap.cancel")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <SwapDialog
                shift={swapShift}
                onOpenChange={(v) => !v && setSwapShift(null)}
                onDone={() => {
                    reloadSwaps();
                    reloadShifts();
                }}
            />
        </div>
    );
};

const SwapDialog = ({ shift, onOpenChange, onDone }: { shift: IShiftAssignment | null; onOpenChange: (open: boolean) => void; onDone: () => void }) => (
    <Dialog open={!!shift} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">{shift && <SwapBody shift={shift} onClose={() => onOpenChange(false)} onDone={onDone} />}</DialogContent>
    </Dialog>
);

const SwapBody = ({ shift, onClose, onDone }: { shift: IShiftAssignment; onClose: () => void; onDone: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [target, setTarget] = useState("");
    const [targetShift, setTargetShift] = useState("none");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const colleaguesFetcher = useCallback(async () => (await getColleagues()).data ?? [], []);
    const { data: colleagues = [] } = useAsyncData(colleaguesFetcher);
    const theirFetcher = useCallback(async () => {
        if (!target) return [];
        const from = todayStr();
        return (await getColleagueShifts(Number(target), { from, to: shiftDay(from, 31) })).data ?? [];
    }, [target]);
    const { data: theirShifts = [] } = useAsyncData(theirFetcher);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!target) return;
        setBusy(true);
        try {
            const res = await createSwap({
                assignment_id: shift.id,
                target_user_id: Number(target),
                target_assignment_id: targetShift === "none" ? null : Number(targetShift),
                reason: reason.trim() || null,
            });
            toast.success(res.message);
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
                <DialogTitle>{t("hr.swap.request_title")}</DialogTitle>
                <DialogDescription>{shiftLabel(shift, i18n.language)}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
                <Label>{t("hr.swap.target")}</Label>
                <Select
                    value={target}
                    onValueChange={(v) => {
                        setTarget(v);
                        setTargetShift("none");
                    }}
                >
                    <SelectTrigger className="w-full" aria-label={t("hr.swap.target")}>
                        <SelectValue placeholder={t("hr.swap.choose_colleague")} />
                    </SelectTrigger>
                    <SelectContent>
                        {colleagues.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.full_name} · {c.roles.map((r) => t(`roles.${r}`)).join(", ")}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label>{t("hr.swap.exchange_with")}</Label>
                <Select value={targetShift} onValueChange={setTargetShift} disabled={!target}>
                    <SelectTrigger className="w-full" aria-label={t("hr.swap.exchange_with")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t("hr.swap.give_away_option")}</SelectItem>
                        {theirShifts.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                                {shiftLabel(s, i18n.language)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="swap-reason">{t("hr.reason")}</Label>
                <Textarea id="swap-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">{t("hr.swap.flow_hint")}</p>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || !target}>
                    {busy ? t("common.processing") : t("hr.swap.send")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default MyScheduleTab;
