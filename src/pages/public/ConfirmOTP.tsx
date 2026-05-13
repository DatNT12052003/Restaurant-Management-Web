import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, RotateCw, ShieldCheck } from "lucide-react";
import loginBg from "@/assets/images/login-bg.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/hooks";
import { confirmOTPThunk, forgotPasswordThunk } from "@/store/auth/authThunk";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { getOtpSchema, type OtpFormValues } from "@/validations/schemas";

const ConfirmOTP = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const location = useLocation();
    const { account_id, email } = location.state || {};

    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(300);
    const [canResend, setCanResend] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<OtpFormValues>({
        resolver: zodResolver(getOtpSchema(t)),
        defaultValues: { code: "" },
    });

    useEffect(() => {
        if (countdown > 0 && !canResend) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && !canResend) {
            setCanResend(true);
        }
    }, [countdown, canResend]);

    const handleVerifyOTP = async (data: OtpFormValues) => {
        try {
            setIsLoading(true);
            const result = await dispatch(
                confirmOTPThunk({ account_id, code: data.code, type: "RESET_PASSWORD" }),
            ).unwrap();
            toast.success(result.message);
            navigate("/reset-password", {
                state: { reset_password_token: result.data?.reset_password_token, from: "/confirm-otp" },
            });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        try {
            setIsResending(true);
            const result = await dispatch(forgotPasswordThunk({ email, type: "RESET_PASSWORD" })).unwrap();
            toast.success(result.message);
            setCountdown(300);
            reset({ code: "" });
            setCanResend(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 px-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <div className="absolute right-4 top-4 z-20">
                <LanguageSwitcher />
            </div>

            <div className="absolute inset-0 z-0 opacity-10">
                <div
                    className="absolute inset-0 bg-cover bg-center mix-blend-overlay"
                    style={{ backgroundImage: `url(${loginBg})` }}
                />
            </div>

            <Card className="relative z-10 w-full max-w-md border-0 shadow-2xl backdrop-blur-md dark:bg-slate-900/90">
                <div className="absolute left-0 right-0 top-0 h-2 rounded-t-xl bg-gradient-to-r from-amber-600 to-red-600" />

                <CardHeader className="space-y-3 pb-6 pt-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <ShieldCheck className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                        {t("auth:confirm_otp.title")}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        {t("auth:confirm_otp.description")}{" "}
                        <span className="font-medium text-amber-700 dark:text-amber-400">{email}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-0">
                    <form onSubmit={handleSubmit(handleVerifyOTP)} className="space-y-5">
                        <div className="space-y-3">
                            <Label htmlFor="code" className="text-sm font-medium">
                                {t("auth:confirm_otp.code")}
                            </Label>
                            <div className="flex justify-center">
                                <Controller
                                    name="code"
                                    control={control}
                                    render={({ field }) => (
                                        <InputOTP
                                            maxLength={6}
                                            value={field.value}
                                            onChange={field.onChange}
                                            disabled={isLoading}
                                            pattern="^[0-9]+$"
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} />
                                                <InputOTPSlot index={1} />
                                                <InputOTPSlot index={2} />
                                                <InputOTPSlot index={3} />
                                                <InputOTPSlot index={4} />
                                                <InputOTPSlot index={5} />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    )}
                                />
                            </div>
                            {errors.code && <p className="text-center text-xs text-red-500">{errors.code.message}</p>}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {canResend ? (
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={isResending}
                                        className="flex items-center gap-1 text-amber-700 hover:underline dark:text-amber-400"
                                    >
                                        {isResending ? (
                                            <div className="h-3 w-3 animate-spin rounded-full border border-amber-700 border-t-transparent" />
                                        ) : (
                                            <RotateCw className="h-3 w-3" />
                                        )}
                                        {t("auth:confirm_otp.resend")}
                                    </button>
                                ) : (
                                    <span>{t("auth:confirm_otp.countdown_message", { countdown })}</span>
                                )}
                            </span>
                            <Link
                                to="/forgot-password"
                                state={{ from: "/confirm-otp" }}
                                className="text-amber-700 hover:underline"
                            >
                                {t("auth:confirm_otp.enter_email")}
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full bg-gradient-to-r from-amber-700 to-orange-700 font-semibold shadow-md transition-all hover:from-amber-800 hover:to-orange-800 hover:shadow-lg active:scale-[0.98] dark:from-amber-600 dark:to-orange-600"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t("auth:confirm_otp.processing")}
                                </div>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    {t("auth:confirm_otp.verify_button")}
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-sm text-amber-700 hover:underline flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        {t("auth:confirm_otp.back_to_login")}
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ConfirmOTP;
