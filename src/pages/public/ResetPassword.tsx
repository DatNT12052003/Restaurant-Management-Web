import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Lock, KeyRound } from "lucide-react";
import loginBg from "@/assets/images/login-bg.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/hooks";
import { useTranslation } from "react-i18next";
import { resetPasswordThunk } from "@/store/auth/authThunk";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { getResetPasswordSchema, type ResetPasswordFormValues } from "@/validations/schemas";

// const resetPasswordSchema = z
//     .object({
//         newPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
//         confirmPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
//     })
//     .refine((data) => data.newPassword === data.confirmPassword, {
//         message: "Mật khẩu nhập lại không khớp",
//         path: ["confirmPassword"],
//     });

// type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPassword = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { reset_password_token } = location.state || {};

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(getResetPasswordSchema(t)),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordFormValues) => {
        try {
            setIsLoading(true);
            const result = await dispatch(
                resetPasswordThunk({
                    reset_password_token,
                    new_password: data.newPassword,
                    confirm_password: data.confirmPassword,
                }),
            ).unwrap();
            toast.success(result.message);
            navigate("/login");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
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
                        <KeyRound className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                        {t("auth:reset_password.title")}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        {t("auth:reset_password.description")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-0">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-sm font-medium">
                                {t("auth:reset_password.new_password")}
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-amber-600" />
                                <Input
                                    id="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder={t("auth:reset_password.new_password_placeholder")}
                                    className={`h-11 pl-10 pr-10 transition-all focus:ring-2 focus:ring-amber-500/20 ${
                                        errors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                                    {...register("newPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                {t("auth:reset_password.confirm_password")}
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-amber-600" />
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder={t("auth:reset_password.confirm_password_placeholder")}
                                    className={`h-11 pl-10 pr-10 transition-all focus:ring-2 focus:ring-amber-500/20 ${
                                        errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                                    {...register("confirmPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full bg-gradient-to-r from-amber-700 to-orange-700 font-semibold shadow-md transition-all hover:from-amber-800 hover:to-orange-800 hover:shadow-lg active:scale-[0.98] dark:from-amber-600 dark:to-orange-600 hover:cursor-pointer"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t("auth:reset_password.processing")}
                                </div>
                            ) : (
                                <>
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    {t("auth:reset_password.reset_button")}
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <Link to="/login" className="flex items-center gap-1 text-sm text-amber-700 hover:underline">
                        <ArrowLeft className="h-4 w-4" />
                        {t("auth:reset_password.back_to_login")}
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ResetPassword;
