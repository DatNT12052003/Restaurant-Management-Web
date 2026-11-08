import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cancelLeave, createLeave, getMyLeaves } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncData } from "@/hooks";
import type { LeaveTypeEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDay, LEAVE_TONE, shiftDay, todayStr } from "@/lib/hr";
import { StatusBadge } from "../workforce/shared";

/** Đơn nghỉ phép của tôi: xin nghỉ (có / không lương), hủy đơn đang chờ */
const MyLeavesTab = () => {
    const { t, i18n } = useTranslation("admin");
    const fetcher = useCallback(async () => (await getMyLeaves()).data ?? [], []);
    const { data: leaves = [], loading, reload } = useAsyncData(fetcher);
    const [start, setStart] = useState(shiftDay(todayStr(), 1));
    const [end, setEnd] = useState(shiftDay(todayStr(), 1));
    const [type, setType] = useState<LeaveTypeEnum>("paid");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            toast.success((await createLeave({ start_date: start, end_date: end, type, reason: reason.trim() || null })).message);
            setReason("");
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    const cancel = async (id: number) => {
        try {
            toast.success((await cancelLeave(id)).message);
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("hr.leave.new")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="leave-start">{t("hr.leave.start")}</Label>
                                <Input
                                    id="leave-start"
                                    type="date"
                                    value={start}
                                    onChange={(e) => {
                                        setStart(e.target.value);
                                        if (e.target.value > end) setEnd(e.target.value);
                                    }}
                                    required
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="leave-end">{t("hr.leave.end")}</Label>
                                <Input id="leave-end" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} required />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>{t("hr.leave.type_label")}</Label>
                            <Select value={type} onValueChange={(v) => setType(v as LeaveTypeEnum)}>
                                <SelectTrigger className="w-full" aria-label={t("hr.leave.type_label")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">{t("hr.leave.type.paid")}</SelectItem>
                                    <SelectItem value="unpaid">{t("hr.leave.type.unpaid")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="leave-reason">{t("hr.reason")}</Label>
                            <Textarea id="leave-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                        <Button type="submit" disabled={busy || !start || !end || end < start}>
                            {busy ? t("common.processing") : t("hr.leave.submit")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("hr.leave.period")}</TableHead>
                                <TableHead>{t("hr.leave.type_label")}</TableHead>
                                <TableHead>{t("hr.status")}</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!leaves.length && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                        {loading ? t("common.loading") : t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {leaves.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell className="tabular-nums">
                                        {formatDay(l.start_date, i18n.language)}
                                        {l.end_date !== l.start_date && ` – ${formatDay(l.end_date, i18n.language)}`}
                                        <span className="block text-xs text-muted-foreground">{t("hr.leave.days", { count: l.days })}</span>
                                    </TableCell>
                                    <TableCell>
                                        {t(`hr.leave.type.${l.type}`)}
                                        {l.reason && <span className="block text-xs text-muted-foreground">{l.reason}</span>}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge tone={LEAVE_TONE[l.status]} label={t(`hr.leave.status.${l.status}`)} />
                                        {l.decision_note && <span className="block text-xs text-muted-foreground">{l.decision_note}</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {l.status === "pending" && (
                                            <Button size="sm" variant="outline" onClick={() => cancel(l.id)}>
                                                {t("hr.leave.cancel")}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default MyLeavesTab;
