import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { getPerformance, upsertReview } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData, usePermission } from "@/hooks";
import type { IStaffPerformance } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { formatMinutes, formatMonth, monthStr } from "@/lib/hr";
import { cn } from "@/lib/utils";
import { MonthInput } from "./shared";

const Stars = ({ value, onChange, size = "size-4" }: { value: number; onChange?: (v: number) => void; size?: string }) => (
    <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n}/5`} className="disabled:cursor-default">
                <Star className={cn(size, n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
        ))}
    </span>
);

/** Hiệu suất theo tháng (chấm công, nghỉ, order phụ trách, tip, thưởng / phạt) và đánh giá nhân viên */
const PerformanceTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const canReview = can("staff_review.manage");
    const canPay = can("payroll.view");
    const [month, setMonth] = useState(monthStr());
    const [reviewing, setReviewing] = useState<IStaffPerformance | null>(null);

    const fetcher = useCallback(async () => {
        try {
            return (await getPerformance(month, restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [month, restaurantId]);
    const { data: rows = [], loading, reload } = useAsyncData(fetcher);

    return (
        <div className="grid gap-3">
            <MonthInput value={month} onChange={setMonth} />
            <Card>
                <CardContent className="overflow-x-auto p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("hr.staff")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.shifts")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.work_days")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.hours")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.late")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.leave_days")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.orders")}</TableHead>
                                <TableHead className="text-right">{t("hr.performance.tips")}</TableHead>
                                {canPay && <TableHead className="text-right">{t("hr.performance.bonus_penalty")}</TableHead>}
                                <TableHead>{t("hr.performance.rating")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                                        {loading ? t("common.loading") : t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {rows.map((r) => (
                                <TableRow key={r.user_id}>
                                    <TableCell>
                                        <p className="font-medium">{r.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{r.roles.map((x) => t(`roles.${x}`)).join(", ")}</p>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {r.scheduled_shifts}
                                        {r.absent_shifts > 0 && <span className="block text-xs text-destructive">{t("hr.performance.absent", { count: r.absent_shifts })}</span>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{r.work_days}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatMinutes(r.worked_minutes)}
                                        {r.overtime_minutes > 0 && <span className="block text-xs text-muted-foreground">{t("hr.performance.ot", { hours: formatMinutes(r.overtime_minutes) })}</span>}
                                    </TableCell>
                                    <TableCell className={cn("text-right tabular-nums", r.late_count > 0 && "text-destructive")}>
                                        {r.late_count}
                                        {r.late_minutes > 0 && <span className="block text-xs">{t("hr.performance.minutes", { count: r.late_minutes })}</span>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{r.leave_days}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.orders_served}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.tip_total)}</TableCell>
                                    {canPay && (
                                        <TableCell className="text-right text-xs tabular-nums">
                                            {Number(r.bonus_total) > 0 && <span className="block text-emerald-700 dark:text-emerald-300">+{formatMoney(r.bonus_total)}</span>}
                                            {Number(r.penalty_total) > 0 && <span className="block text-destructive">−{formatMoney(r.penalty_total)}</span>}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {r.review ? <Stars value={r.review.rating} /> : <span className="text-xs text-muted-foreground">{t("hr.performance.not_rated")}</span>}
                                            {canReview && (
                                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setReviewing(r)}>
                                                    {r.review ? t("common.edit") : t("hr.performance.rate")}
                                                </Button>
                                            )}
                                        </div>
                                        {r.review?.comment && <p className="mt-1 max-w-56 text-xs text-muted-foreground">{r.review.comment}</p>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <ReviewDialog row={reviewing} month={month} restaurantId={restaurantId} onOpenChange={(v) => !v && setReviewing(null)} onDone={reload} />
        </div>
    );
};

const ReviewDialog = ({
    row,
    month,
    restaurantId,
    onOpenChange,
    onDone,
}: {
    row: IStaffPerformance | null;
    month: string;
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
}) => (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            {row && <ReviewBody key={row.user_id} row={row} month={month} restaurantId={restaurantId} onDone={onDone} onClose={() => onOpenChange(false)} />}
        </DialogContent>
    </Dialog>
);

const ReviewBody = ({ row, month, restaurantId, onDone, onClose }: { row: IStaffPerformance; month: string; restaurantId?: number; onDone: () => void; onClose: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [rating, setRating] = useState(row.review?.rating ?? 0);
    const [comment, setComment] = useState(row.review?.comment ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            toast.success((await upsertReview({ user_id: row.user_id, month, rating, comment: comment.trim() || null }, restaurantId)).message);
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
                <DialogTitle>{t("hr.performance.review_title", { name: row.full_name })}</DialogTitle>
                <DialogDescription>{formatMonth(month, i18n.language)}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
                <Label>{t("hr.performance.rating")}</Label>
                <Stars value={rating} onChange={setRating} size="size-7" />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="review-comment">{t("hr.performance.comment")}</Label>
                <Textarea id="review-comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || rating < 1}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default PerformanceTab;
