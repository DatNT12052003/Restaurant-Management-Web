import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

import { clockWithQr } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncData } from "@/hooks";
import type { IClockResult, IResponse } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/datetime";
import { formatMinutes } from "@/lib/hr";

/**
 * Mỗi mã chỉ gửi một lần trong phiên trang (StrictMode chạy effect hai lần ở môi trường dev,
 * gửi hai lần sẽ vừa vào ca vừa ra ca).
 */
const sent = new Map<string, Promise<IResponse<IClockResult>>>();
const clockOnce = (token: string) => {
    if (!sent.has(token)) sent.set(token, clockWithQr(token));
    return sent.get(token)!;
};

/** Trang mở ra khi nhân viên quét mã QR chấm công bằng camera điện thoại: `/admin/clock?t=<mã>` */
const ClockPage = () => {
    const { t, i18n } = useTranslation("admin");
    const [params] = useSearchParams();
    const token = params.get("t") ?? "";

    const fetcher = useCallback(async () => {
        if (!token) return { ok: false as const, message: t("hr.clock.missing_code") };
        try {
            const res = await clockOnce(token);
            return { ok: true as const, result: res.data! };
        } catch (error) {
            return { ok: false as const, message: getErrorMessage(error) };
        }
    }, [token, t]);
    const { data, loading } = useAsyncData(fetcher);

    return (
        <div className="mx-auto max-w-md py-8">
            <Card>
                <CardContent className="grid justify-items-center gap-3 py-8 text-center">
                    {loading || !data ? (
                        <p className="text-muted-foreground">{t("common.processing")}</p>
                    ) : data.ok ? (
                        <>
                            <CheckCircle2 className="size-12 text-emerald-600" />
                            <p className="text-xl font-semibold">
                                {data.result.action === "clock_in"
                                    ? t("hr.clock.clocked_in", { time: formatTime(data.result.attendance.clock_in_at, i18n.language) })
                                    : t("hr.clock.clocked_out", {
                                          time: formatTime(data.result.attendance.clock_out_at!, i18n.language),
                                          hours: formatMinutes(data.result.attendance.worked_minutes),
                                      })}
                            </p>
                            {data.result.action === "clock_in" && data.result.attendance.late_minutes > 0 && (
                                <p className="text-destructive">{t("hr.clock.late_by", { minutes: data.result.attendance.late_minutes })}</p>
                            )}
                            {data.result.action === "clock_in" && !data.result.attendance.assignment_id && (
                                <p className="text-sm text-muted-foreground">{t("hr.clock.no_shift_hint")}</p>
                            )}
                        </>
                    ) : (
                        <>
                            <XCircle className="size-12 text-destructive" />
                            <p className="font-medium">{data.message}</p>
                        </>
                    )}
                    <Button asChild variant="outline">
                        <Link to="/admin/my-work">{t("hr.clock.go_my_work")}</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default ClockPage;
