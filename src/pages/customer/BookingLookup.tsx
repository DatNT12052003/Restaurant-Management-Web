import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarClock, MapPin, Phone, Users } from "lucide-react";

import { cancelBookingByCode, lookupBooking } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks";
import type { IPublicReservation } from "@/interfaces";
import { BOOKING_TONE, canCancelBooking } from "@/lib/customer";
import { getErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

const when = (iso: string, locale: string) =>
    new Date(iso).toLocaleString(locale, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Thông tin một đơn đặt bàn (dùng ở trang tra cứu, trang đặt xong, tài khoản) */
export const BookingSummary = ({ booking }: { booking: IPublicReservation }) => {
    const { t, i18n } = useTranslation("public");
    return (
        <div className="grid gap-1.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{booking.restaurant_name}</span>
                <Badge variant="outline" className={cn(BOOKING_TONE[booking.status])}>
                    {t(`booking.status.${booking.status}`)}
                </Badge>
            </div>
            <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" /> {booking.restaurant_address}
            </p>
            <p className="flex items-center gap-2">
                <CalendarClock className="size-4" /> {when(booking.start_time, i18n.language)}
            </p>
            <p className="flex items-center gap-2">
                <Users className="size-4" /> {t("booking.guests_count", { count: booking.guest_count })} · {booking.contact_name} · {booking.contact_phone}
            </p>
            {booking.note && <p className="text-muted-foreground italic">“{booking.note}”</p>}
            {booking.cancel_reason && <p className="text-destructive">{booking.cancel_reason}</p>}
            {booking.restaurant_phone && (
                <a href={`tel:${booking.restaurant_phone}`} className="flex items-center gap-2 text-muted-foreground hover:underline">
                    <Phone className="size-4" /> {booking.restaurant_phone}
                </a>
            )}
        </div>
    );
};

/** `/booking/lookup` (nhập mã + SĐT) và `/booking/:code?phone=` (xem, hủy) */
const BookingLookup = () => {
    const { t } = useTranslation("public");
    const navigate = useNavigate();
    const { code = "" } = useParams();
    const [params] = useSearchParams();
    const phoneParam = params.get("phone") ?? "";
    const [codeInput, setCodeInput] = useState(code);
    const [phoneInput, setPhoneInput] = useState(phoneParam);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [version, setVersion] = useState(0);

    const fetcher = useCallback(async () => {
        void version;
        if (!code || !phoneParam) return null;
        try {
            return { booking: (await lookupBooking(code, phoneParam)).data!, error: null };
        } catch (error) {
            return { booking: null, error: getErrorMessage(error) };
        }
    }, [code, phoneParam, version]);
    const { data, loading } = useAsyncData(fetcher);

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(`/booking/${encodeURIComponent(codeInput.trim().toUpperCase())}?phone=${encodeURIComponent(phoneInput.trim())}`);
    };
    const cancel = async () => {
        try {
            toast.success((await cancelBookingByCode(code, phoneParam)).message);
            setVersion((v) => v + 1);
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    };
    const booking = data?.booking;
    // Mốc so sánh lấy lúc tải xong (không dùng Date.now() trong render)
    const [loadedAt] = useState(() => Date.now());

    return (
        <div className="mx-auto grid max-w-lg gap-4">
            <h1 className="text-2xl font-bold">{t("lookup.title")}</h1>
            <Card>
                <CardContent className="py-4">
                    <form onSubmit={search} className="grid gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="lk-code">{t("lookup.code")}</Label>
                                <Input id="lk-code" className="font-mono uppercase" maxLength={12} value={codeInput} onChange={(e) => setCodeInput(e.target.value)} required />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="lk-phone">{t("booking.phone")}</Label>
                                <Input id="lk-phone" type="tel" maxLength={15} value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} required />
                            </div>
                        </div>
                        <Button type="submit" variant="outline">
                            {t("lookup.search")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {loading && code && phoneParam && <p className="text-muted-foreground">{t("common.loading")}</p>}
            {data?.error && <p className="text-destructive">{data.error}</p>}
            {booking && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-mono text-lg tracking-widest">{booking.lookup_code}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <BookingSummary booking={booking} />
                        {canCancelBooking(booking, loadedAt) && (
                            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                                {t("lookup.cancel")}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
            <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title={t("lookup.cancel")} description={t("lookup.cancel_confirm")} onConfirm={cancel} />
        </div>
    );
};

export default BookingLookup;
