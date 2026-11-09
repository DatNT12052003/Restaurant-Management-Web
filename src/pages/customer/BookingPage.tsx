import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { createOnlineBooking, getBookingSlots, getPublicRestaurants, sendBookingOtp } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STAFF_ROLES } from "@/constants/roles";
import { useAppSelector, useAsyncData } from "@/hooks";
import type { IPublicReservation } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { shiftDay, todayStr } from "@/lib/hr";
import { cn } from "@/lib/utils";
import { BookingSummary } from "./BookingLookup";

/**
 * Đặt bàn online (giai đoạn 13): chọn chi nhánh, ngày, số khách, giờ còn bàn; nhập liên hệ.
 * Khách vãng lai xác nhận email bằng mã OTP; khách đã đăng nhập không cần. Đơn chờ nhà hàng xác nhận.
 */
const BookingPage = () => {
    const { t } = useTranslation("public");
    const [params] = useSearchParams();
    const { isAuthenticated, roles, user } = useAppSelector((s) => s.auth);
    const isGuestAccount = isAuthenticated && roles.includes("guest") && !roles.some((r) => STAFF_ROLES.includes(r));

    const listFetcher = useCallback(async () => (await getPublicRestaurants()).data ?? [], []);
    const { data: restaurants = [] } = useAsyncData(listFetcher);
    const bookable = restaurants.filter((r) => r.online_booking_enabled);

    const [restaurantId, setRestaurantId] = useState(params.get("restaurant") ?? "");
    const [date, setDate] = useState(shiftDay(todayStr(), 1));
    const [guests, setGuests] = useState("2");
    const [time, setTime] = useState("");
    const [name, setName] = useState(isGuestAccount ? (user?.full_name ?? "") : "");
    const [phone, setPhone] = useState(isGuestAccount ? (user?.phone_number ?? "") : "");
    const [email, setEmail] = useState(isGuestAccount ? (user?.email ?? "") : "");
    const [note, setNote] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<IPublicReservation | null>(null);

    const restaurant = bookable.find((r) => String(r.id) === restaurantId) ?? (bookable.length === 1 ? bookable[0] : undefined);
    const guestCount = Number(guests);
    const sendOtp = async () => {
        setBusy(true);
        try {
            toast.success((await sendBookingOtp(email.trim())).message);
            setOtpSentTo(email.trim().toLowerCase());
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant || !time) return;
        setBusy(true);
        try {
            const res = await createOnlineBooking({
                restaurant_id: restaurant.id,
                date,
                time,
                guest_count: guestCount,
                contact_name: name.trim() || undefined,
                contact_phone: phone.trim() || undefined,
                contact_email: email.trim() || undefined,
                note: note.trim() || null,
                ...(isGuestAccount ? {} : { otp_code: otp.trim() }),
            });
            toast.success(res.message);
            setDone(res.data!);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <Card className="mx-auto max-w-lg">
                <CardContent className="grid justify-items-center gap-3 py-8 text-center">
                    <CheckCircle2 className="size-12 text-emerald-600" />
                    <h1 className="text-xl font-semibold">{t("booking.done_title")}</h1>
                    <p className="text-muted-foreground">{t("booking.done_hint")}</p>
                    <p className="text-sm">{t("booking.your_code")}</p>
                    <p className="font-mono text-3xl font-bold tracking-widest" data-testid="booking-code">
                        {done.lookup_code}
                    </p>
                    <div className="w-full text-left">
                        <BookingSummary booking={done} />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline">
                            <Link to={`/booking/${done.lookup_code}?phone=${encodeURIComponent(done.contact_phone)}`}>{t("booking.view")}</Link>
                        </Button>
                        {isGuestAccount && (
                            <Button asChild>
                                <Link to="/account">{t("nav.account")}</Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const needOtp = !isGuestAccount;
    const otpReady = otpSentTo !== null && otpSentTo === email.trim().toLowerCase();
    const canSubmit = !!restaurant && !!time && !!name.trim() && !!phone.trim() && (!needOtp || (!!email.trim() && /^\d{6}$/.test(otp.trim()) && otpReady));

    return (
        <form onSubmit={submit} className="mx-auto grid max-w-2xl gap-4">
            <h1 className="text-2xl font-bold">{t("booking.title")}</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("booking.step_when")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label>{t("booking.branch")}</Label>
                        <Select
                            value={restaurant ? String(restaurant.id) : ""}
                            onValueChange={(v) => {
                                setRestaurantId(v);
                                setTime("");
                            }}
                        >
                            <SelectTrigger className="w-full" aria-label={t("booking.branch")}>
                                <SelectValue placeholder={t("booking.choose_branch")} />
                            </SelectTrigger>
                            <SelectContent>
                                {bookable.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                        {r.name} · {r.address}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="bk-date">{t("booking.date")}</Label>
                            <Input
                                id="bk-date"
                                type="date"
                                min={todayStr()}
                                max={restaurant ? shiftDay(todayStr(), restaurant.online_booking_max_days) : undefined}
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setTime("");
                                }}
                                required
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="bk-guests">{t("booking.guests")}</Label>
                            <Input
                                id="bk-guests"
                                type="number"
                                min={1}
                                max={restaurant?.online_booking_max_guests ?? 50}
                                value={guests}
                                onChange={(e) => {
                                    setGuests(e.target.value);
                                    setTime("");
                                }}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label>{t("booking.time")}</Label>
                        {!restaurant ? (
                            <p className="text-sm text-muted-foreground">{t("booking.choose_branch_first")}</p>
                        ) : (
                            <SlotPicker restaurantId={restaurant.id} date={date} guestCount={guestCount} value={time} onChange={setTime} />
                        )}
                        {restaurant && (
                            <p className="text-xs text-muted-foreground">
                                {t("booking.rules", { hours: restaurant.online_booking_minutes / 60, lead: restaurant.online_booking_lead_minutes, max: restaurant.online_booking_max_guests })}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("booking.step_contact")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="bk-name">{t("booking.name")}</Label>
                            <Input id="bk-name" maxLength={255} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="bk-phone">{t("booking.phone")}</Label>
                            <Input id="bk-phone" type="tel" autoComplete="tel" maxLength={15} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="bk-email">{t("booking.email")}</Label>
                        <div className="flex gap-2">
                            <Input id="bk-email" type="email" autoComplete="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} required={needOtp} />
                            {needOtp && (
                                <Button type="button" variant="outline" onClick={sendOtp} disabled={busy || !/\S+@\S+\.\S+/.test(email)}>
                                    {otpReady ? t("booking.resend_code") : t("booking.send_code")}
                                </Button>
                            )}
                        </div>
                        {needOtp ? (
                            <p className="text-xs text-muted-foreground">{t("booking.email_hint")}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">{t("booking.logged_in_hint")}</p>
                        )}
                    </div>
                    {needOtp && otpReady && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="bk-otp">{t("booking.code")}</Label>
                            <Input
                                id="bk-otp"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                className="w-40 font-mono tracking-widest"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                required
                            />
                            <p className="text-xs text-muted-foreground">{t("booking.code_sent", { email: otpSentTo })}</p>
                        </div>
                    )}
                    <div className="grid gap-1.5">
                        <Label htmlFor="bk-note">{t("booking.note")}</Label>
                        <Textarea id="bk-note" rows={2} maxLength={500} placeholder={t("booking.note_placeholder")} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    {!isAuthenticated && (
                        <p className="text-sm text-muted-foreground">
                            {t("booking.login_prompt")}{" "}
                            <Link to="/login" state={{ from: { pathname: "/booking" } }} className="font-medium text-primary hover:underline">
                                {t("nav.login")}
                            </Link>{" "}
                            ·{" "}
                            <Link to="/register" className="font-medium text-primary hover:underline">
                                {t("nav.register")}
                            </Link>
                        </p>
                    )}
                </CardContent>
            </Card>

            <Button type="submit" size="lg" disabled={busy || !canSubmit}>
                {busy ? t("common.processing") : t("booking.submit", { time: time || "--:--" })}
            </Button>
        </form>
    );
};

export default BookingPage;

/** Các khung giờ còn bàn của chi nhánh trong ngày cho số khách */
const SlotPicker = ({ restaurantId, date, guestCount, value, onChange }: { restaurantId: number; date: string; guestCount: number; value: string; onChange: (time: string) => void }) => {
    const { t } = useTranslation("public");
    const fetcher = useCallback(async () => {
        if (!date || !(guestCount > 0)) return [];
        try {
            return (await getBookingSlots(restaurantId, date, guestCount)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            return [];
        }
    }, [restaurantId, date, guestCount]);
    const { data: slots = [], loading } = useAsyncData(fetcher);

    if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
    if (!slots.length) return <p className="text-sm text-muted-foreground">{t("booking.no_slots")}</p>;
    return (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("booking.time")}>
            {slots.map((s) => (
                <button
                    key={s.time}
                    type="button"
                    role="radio"
                    aria-checked={value === s.time}
                    disabled={!s.available}
                    onClick={() => onChange(s.time)}
                    className={cn(
                        "rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors",
                        value === s.time ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                        !s.available && "cursor-not-allowed text-muted-foreground line-through opacity-60",
                    )}
                >
                    {s.time}
                </button>
            ))}
        </div>
    );
};
