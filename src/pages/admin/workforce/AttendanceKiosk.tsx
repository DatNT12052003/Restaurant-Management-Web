import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Maximize2 } from "lucide-react";

import { getAttendanceQr } from "@/apis";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector, useAsyncData, useNow } from "@/hooks";
import { getErrorMessage } from "@/lib/api-error";
import { clockUrl } from "@/lib/hr";

/**
 * Màn hình chấm công đặt trên thiết bị của nhà hàng (giai đoạn 12). Mã QR đổi mỗi 30 giây; nhân viên quét bằng
 * camera điện thoại (mở trang chấm công) hoặc bằng nút quét trong mục "Việc của tôi".
 */
const AttendanceKiosk = () => {
    const { t, i18n } = useTranslation("admin");
    const roles = useAppSelector((s) => s.auth.roles);
    const user = useAppSelector((s) => s.auth.user);
    const { branches, currentBranch } = useAppSelector((s) => s.restaurant);
    const isAdmin = roles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const branchName = isAdmin ? currentBranch?.name : branches.find((b) => b.id === user?.restaurant_id)?.name;
    const now = useNow(1000);
    const [version, setVersion] = useState(0);

    const fetcher = useCallback(async () => {
        // `version` đổi khi mã hết hạn: tạo fetcher mới để lấy mã mới
        void version;
        if (isAdmin && !restaurantId) return null;
        try {
            const qr = (await getAttendanceQr(restaurantId)).data!;
            const image = await QRCode.toDataURL(clockUrl(qr.token), { width: 480, margin: 1, errorCorrectionLevel: "M" });
            return { ...qr, image, error: null };
        } catch (error) {
            return { image: null, expires_at: null, error: getErrorMessage(error) };
        }
    }, [isAdmin, restaurantId, version]);
    const { data } = useAsyncData(fetcher);

    // Lấy mã mới ngay khi mã hiện tại hết hạn (lỗi mạng: thử lại sau 5 giây)
    const expiresAt = data?.expires_at ? Date.parse(data.expires_at) : null;
    const failed = !!data?.error;
    useEffect(() => {
        if (!data) return;
        const wait = expiresAt ? Math.max(500, expiresAt - Date.now() + 200) : failed ? 5000 : null;
        if (wait === null) return;
        const timer = window.setTimeout(() => setVersion((v) => v + 1), wait);
        return () => window.clearTimeout(timer);
    }, [data, expiresAt, failed]);

    const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => undefined);

    if (isAdmin && !restaurantId) {
        return (
            <div>
                <PageHeader title={t("hr.kiosk.title")} />
                <p className="text-muted-foreground">{t("hr.select_branch")}</p>
            </div>
        );
    }

    const seconds = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : null;
    return (
        <div>
            <PageHeader
                title={t("hr.kiosk.title")}
                description={t("hr.kiosk.description")}
                actions={
                    <Button variant="outline" onClick={fullscreen}>
                        <Maximize2 className="size-4" />
                        {t("hr.kiosk.fullscreen")}
                    </Button>
                }
            />
            <Card className="mx-auto max-w-xl">
                <CardContent className="grid justify-items-center gap-4 py-8 text-center">
                    <p className="text-2xl font-semibold">{branchName}</p>
                    <p className="text-5xl font-bold tabular-nums">{new Date(now).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                    {data?.image ? (
                        <img src={data.image} alt={t("hr.kiosk.qr_alt")} className="aspect-square w-full max-w-sm rounded-md border bg-white p-2" data-testid="attendance-qr" />
                    ) : (
                        <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-md border text-muted-foreground">
                            {data?.error ?? t("common.loading")}
                        </div>
                    )}
                    <p className="text-lg">{t("hr.kiosk.instruction")}</p>
                    {seconds !== null && <p className="text-sm text-muted-foreground">{t("hr.kiosk.refresh_in", { seconds })}</p>}
                </CardContent>
            </Card>
        </div>
    );
};

export default AttendanceKiosk;
