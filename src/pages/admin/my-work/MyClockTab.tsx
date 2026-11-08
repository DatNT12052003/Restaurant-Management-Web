import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { QrCode } from "lucide-react";

import { clockWithQr, getMyAttendance, getMyHrStatus } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData } from "@/hooks";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { formatDay, formatMinutes, monthStr, OVERTIME_TONE } from "@/lib/hr";
import { MonthInput, StatusBadge } from "../workforce/shared";
import ScanQrDialog from "./ScanQrDialog";

/** Chấm công của tôi: trạng thái hiện tại, quét mã QR vào / ra ca, lịch sử theo tháng */
const MyClockTab = () => {
    const { t, i18n } = useTranslation("admin");
    const [month, setMonth] = useState(monthStr());
    const [scanOpen, setScanOpen] = useState(false);

    const statusFetcher = useCallback(async () => (await getMyHrStatus()).data ?? null, []);
    const { data: status, reload: reloadStatus } = useAsyncData(statusFetcher);
    const historyFetcher = useCallback(async () => {
        try {
            return (await getMyAttendance(month)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [month]);
    const { data: records = [], loading, reload } = useAsyncData(historyFetcher);

    const clock = async (token: string) => {
        try {
            const res = await clockWithQr(token);
            const a = res.data!.attendance;
            toast.success(
                res.data!.action === "clock_in"
                    ? t("hr.clock.clocked_in", { time: formatTime(a.clock_in_at, i18n.language) }) +
                          (a.late_minutes > 0 ? ` · ${t("hr.clock.late_by", { minutes: a.late_minutes })}` : "")
                    : t("hr.clock.clocked_out", { time: formatTime(a.clock_out_at!, i18n.language), hours: formatMinutes(a.worked_minutes) }),
            );
            reloadStatus();
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };

    const open = status?.open_attendance;
    const next = status?.next_shift;

    return (
        <div className="grid gap-4">
            <Card>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        {open ? (
                            <>
                                <p className="font-semibold text-emerald-700 dark:text-emerald-300">{t("hr.clock.on_shift", { time: formatTime(open.clock_in_at, i18n.language) })}</p>
                                {open.late_minutes > 0 && <p className="text-sm text-destructive">{t("hr.clock.late_by", { minutes: open.late_minutes })}</p>}
                            </>
                        ) : (
                            <p className="font-semibold">{t("hr.clock.off_shift")}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                            {next
                                ? t("hr.clock.next_shift", {
                                      date: formatDay(next.work_date, i18n.language),
                                      start: formatTime(next.start_at, i18n.language),
                                      end: formatTime(next.end_at, i18n.language),
                                  })
                                : t("hr.clock.no_next_shift")}
                        </p>
                    </div>
                    <Button size="lg" onClick={() => setScanOpen(true)}>
                        <QrCode className="size-4" />
                        {open ? t("hr.clock.clock_out") : t("hr.clock.clock_in")}
                    </Button>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2">
                <MonthInput value={month} onChange={setMonth} />
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("hr.attendance.date")}</TableHead>
                                <TableHead>{t("hr.attendance.clock_in")}</TableHead>
                                <TableHead>{t("hr.attendance.clock_out")}</TableHead>
                                <TableHead className="text-right">{t("hr.attendance.worked")}</TableHead>
                                <TableHead>{t("hr.attendance.notes")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !records.length ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : !records.length ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="tabular-nums">{formatDay(a.work_date, i18n.language)}</TableCell>
                                        <TableCell className="tabular-nums">{formatDateTime(a.clock_in_at, i18n.language)}</TableCell>
                                        <TableCell className="tabular-nums">{a.clock_out_at ? formatDateTime(a.clock_out_at, i18n.language) : "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">{a.clock_out_at ? formatMinutes(a.worked_minutes) : "—"}</TableCell>
                                        <TableCell>
                                            <AttendanceFlags a={a} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ScanQrDialog open={scanOpen} onOpenChange={setScanOpen} onToken={clock} />
        </div>
    );
};

/** Đi muộn, về sớm, tăng ca, chấm công tay */
export const AttendanceFlags = ({ a }: { a: { late_minutes: number; early_leave_minutes: number; overtime_minutes: number; overtime_status: string; method: string; assignment_id: number | null } }) => {
    const { t } = useTranslation("admin");
    return (
        <div className="flex flex-wrap gap-1">
            {a.late_minutes > 0 && <StatusBadge tone={OVERTIME_TONE.rejected} label={t("hr.attendance.late", { minutes: a.late_minutes })} />}
            {a.early_leave_minutes > 0 && <StatusBadge tone={OVERTIME_TONE.pending} label={t("hr.attendance.early", { minutes: a.early_leave_minutes })} />}
            {a.overtime_minutes > 0 && (
                <StatusBadge
                    tone={OVERTIME_TONE[a.overtime_status]}
                    label={t("hr.attendance.overtime", { hours: formatMinutes(a.overtime_minutes), status: t(`hr.overtime_status.${a.overtime_status}`) })}
                />
            )}
            {!a.assignment_id && <StatusBadge tone={OVERTIME_TONE.none} label={t("hr.attendance.no_shift")} />}
            {a.method === "manual" && <StatusBadge tone={OVERTIME_TONE.none} label={t("hr.attendance.manual")} />}
        </div>
    );
};

export default MyClockTab;
