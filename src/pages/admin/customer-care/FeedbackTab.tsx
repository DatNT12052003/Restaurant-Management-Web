import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Star } from "lucide-react";

import { getFeedbacks, replyFeedback } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { FeedbackStatus, IFeedback } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { shiftDay, todayStr } from "@/lib/hr";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<FeedbackStatus, string> = {
    new: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    in_progress: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    resolved: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
};

const avg = (v: number | null) => (v === null ? "—" : v.toFixed(1));

const Rating = ({ label, value }: { label: string; value: number }) => (
    <span className="inline-flex items-center gap-1 text-xs">
        {label}
        <span className={cn("inline-flex items-center gap-0.5 font-semibold", value <= 2 && "text-destructive")}>
            {value}
            <Star className="size-3 fill-amber-400 text-amber-400" />
        </span>
    </span>
);

/** Phản hồi sau bữa ăn: thống kê hài lòng theo chi nhánh, lọc khiếu nại / điểm thấp, trả lời và xử lý */
const FeedbackTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t, i18n } = useTranslation("admin");
    const canReply = usePermission("feedback.reply");
    const [from, setFrom] = useState(shiftDay(todayStr(), -29));
    const [to, setTo] = useState(todayStr());
    const [status, setStatus] = useState<FeedbackStatus | "all">("all");
    const [complaintOnly, setComplaintOnly] = useState(false);
    const [lowOnly, setLowOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [replying, setReplying] = useState<IFeedback | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (
                await getFeedbacks(
                    {
                        from,
                        to,
                        currentPage: page,
                        limit: 20,
                        ...(status !== "all" ? { status } : {}),
                        ...(complaintOnly ? { complaint_only: true } : {}),
                        ...(lowOnly ? { max_rating: 2 } : {}),
                    },
                    restaurantId,
                )
            ).data!;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [from, to, page, status, complaintOnly, lowOnly, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["feedback:created"], reload);
    const s = data?.summary;
    const reset = () => setPage(1);

    return (
        <div className="grid gap-3">
            {s && (
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                    {[
                        [t("feedback.count"), String(s.count)],
                        [t("feedback.avg_food"), avg(s.avg_food)],
                        [t("feedback.avg_service"), avg(s.avg_service)],
                        [t("feedback.avg_ambience"), avg(s.avg_ambience)],
                        [t("feedback.complaints"), `${s.complaints} · ${t("feedback.open", { count: s.open })}`],
                    ].map(([label, value]) => (
                        <Card key={label}>
                            <CardContent className="py-3">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="text-xl font-semibold tabular-nums">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {s && !restaurantId && s.by_restaurant.length > 1 && (
                <Card>
                    <CardContent className="grid gap-1 py-3 text-sm">
                        {s.by_restaurant.map((r) => (
                            <div key={r.restaurant_id} className="flex justify-between gap-2">
                                <span>{r.restaurant_name}</span>
                                <span className="tabular-nums text-muted-foreground">
                                    {t("feedback.branch_row", { avg: avg(r.avg_overall), count: r.count, complaints: r.complaints })}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                    <Label htmlFor="fb-from" className="text-xs">
                        {t("hr.from")}
                    </Label>
                    <Input id="fb-from" type="date" className="w-40" value={from} max={to} onChange={(e) => (setFrom(e.target.value), reset())} />
                </div>
                <div className="grid gap-1">
                    <Label htmlFor="fb-to" className="text-xs">
                        {t("hr.to")}
                    </Label>
                    <Input id="fb-to" type="date" className="w-40" value={to} min={from} onChange={(e) => (setTo(e.target.value), reset())} />
                </div>
                <Select value={status} onValueChange={(v) => (setStatus(v as typeof status), reset())}>
                    <SelectTrigger className="w-44" aria-label={t("hr.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {(["new", "in_progress", "resolved"] as const).map((x) => (
                            <SelectItem key={x} value={x}>
                                {t(`feedback.status.${x}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={complaintOnly} onCheckedChange={(v) => (setComplaintOnly(v === true), reset())} />
                    {t("feedback.complaint_only")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={lowOnly} onCheckedChange={(v) => (setLowOnly(v === true), reset())} />
                    {t("feedback.low_only")}
                </label>
            </div>

            <div className="grid gap-2">
                {!data?.feedbacks.length && <p className="py-8 text-center text-sm text-muted-foreground">{loading ? t("common.loading") : t("common.no_data")}</p>}
                {data?.feedbacks.map((f) => (
                    <Card key={f.id} className={cn(f.is_complaint && f.status !== "resolved" && "border-destructive")}>
                        <CardContent className="grid gap-2 py-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-2 font-medium">
                                    {f.is_complaint && <AlertTriangle className="size-4 text-destructive" />}
                                    {f.guest_name ?? t("feedback.walk_in")} · {f.order_code}
                                    {!restaurantId && <span className="font-normal text-muted-foreground">· {f.restaurant_name}</span>}
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{formatDateTime(f.created_at, i18n.language)}</span>
                                    <Badge variant="outline" className={STATUS_TONE[f.status]}>
                                        {t(`feedback.status.${f.status}`)}
                                    </Badge>
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Rating label={t("feedback.food")} value={f.food_rating} />
                                <Rating label={t("feedback.service")} value={f.service_rating} />
                                <Rating label={t("feedback.ambience")} value={f.ambience_rating} />
                                {f.contact_phone && <span className="text-xs text-muted-foreground">{f.contact_phone}</span>}
                            </div>
                            {f.comment && <p>“{f.comment}”</p>}
                            {f.reply && (
                                <p className="rounded-md bg-muted p-2 text-xs">
                                    <span className="font-medium">{t("feedback.reply_by", { name: f.replied_by_name ?? "—" })}</span> {f.reply}
                                </p>
                            )}
                            {canReply && (
                                <div>
                                    <Button size="sm" variant="outline" onClick={() => setReplying(f)}>
                                        {f.reply ? t("feedback.edit_reply") : t("feedback.reply")}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}

            <ReplyDialog feedback={replying} onOpenChange={(v) => !v && setReplying(null)} onDone={reload} />
        </div>
    );
};

const ReplyDialog = ({ feedback, onOpenChange, onDone }: { feedback: IFeedback | null; onOpenChange: (open: boolean) => void; onDone: () => void }) => (
    <Dialog open={!!feedback} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">{feedback && <ReplyBody key={feedback.id} feedback={feedback} onDone={onDone} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const ReplyBody = ({ feedback, onDone, onClose }: { feedback: IFeedback; onDone: () => void; onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const [reply, setReply] = useState(feedback.reply ?? "");
    const [status, setStatus] = useState<FeedbackStatus>(feedback.reply ? feedback.status : "resolved");
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            toast.success((await replyFeedback(feedback.id, { reply: reply.trim() || null, status })).message);
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <form onSubmit={submit} className="grid gap-3">
            <DialogHeader>
                <DialogTitle>{t("feedback.reply_title", { code: feedback.order_code })}</DialogTitle>
                <DialogDescription>{feedback.comment ?? t("feedback.no_comment")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
                <Label htmlFor="fb-reply">{t("feedback.reply")}</Label>
                <Textarea id="fb-reply" rows={4} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("feedback.reply_hint")}</p>
            </div>
            <div className="grid gap-1.5">
                <Label>{t("hr.status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
                    <SelectTrigger className="w-full" aria-label={t("hr.status")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(["new", "in_progress", "resolved"] as const).map((x) => (
                            <SelectItem key={x} value={x}>
                                {t(`feedback.status.${x}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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

export default FeedbackTab;
