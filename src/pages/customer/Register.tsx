import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { registerGuest } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/hooks";
import { getErrorMessage } from "@/lib/api-error";
import { getMeThunk, loginThunk } from "@/store/auth/authThunk";

/** Khách tự đăng ký tài khoản (để đặt bàn không cần OTP, tích điểm, xem lịch sử). Đăng ký xong tự đăng nhập. */
const Register = () => {
    const { t } = useTranslation("public");
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [form, setForm] = useState({ full_name: "", phone_number: "", email: "", username: "", password: "", confirm: "" });
    const [busy, setBusy] = useState(false);
    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const mismatch = !!form.confirm && form.confirm !== form.password;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mismatch) return;
        setBusy(true);
        try {
            await registerGuest({
                user: { full_name: form.full_name.trim(), phone_number: form.phone_number.trim() || undefined, email: form.email.trim() || undefined },
                account: { username: form.username.trim(), password: form.password },
            });
            await dispatch(loginThunk({ username: form.username.trim(), password: form.password })).unwrap();
            await dispatch(getMeThunk()).unwrap();
            toast.success(t("register.done"));
            navigate("/account", { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader>
                <CardTitle>{t("register.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="rg-name">{t("booking.name")}</Label>
                        <Input id="rg-name" autoComplete="name" maxLength={255} value={form.full_name} onChange={set("full_name")} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="rg-phone">{t("booking.phone")}</Label>
                            <Input id="rg-phone" type="tel" autoComplete="tel" maxLength={15} value={form.phone_number} onChange={set("phone_number")} required />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="rg-email">{t("booking.email")}</Label>
                            <Input id="rg-email" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={set("email")} required />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="rg-username">{t("register.username")}</Label>
                        <Input id="rg-username" autoComplete="username" minLength={5} maxLength={50} value={form.username} onChange={set("username")} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="rg-password">{t("register.password")}</Label>
                            <Input id="rg-password" type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={set("password")} required />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="rg-confirm">{t("register.confirm")}</Label>
                            <Input id="rg-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required aria-invalid={mismatch} />
                        </div>
                    </div>
                    {mismatch && <p className="text-sm text-destructive">{t("register.mismatch")}</p>}
                    <Button type="submit" disabled={busy || mismatch}>
                        {busy ? t("common.processing") : t("register.submit")}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        {t("register.have_account")}{" "}
                        <Link to="/login" className="font-medium text-primary hover:underline">
                            {t("nav.login")}
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    );
};

export default Register;
