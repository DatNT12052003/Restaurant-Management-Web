import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, User, LogIn, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import loginBg from "@/assets/images/login-bg.png";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { getLoginSchema, type LoginFormValues } from "@/validations/schemas/login";
import { useAppDispatch } from "@/hooks";
import { getMeThunk, loginThunk } from "@/store/auth/authThunk";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [showPassword, setShowPassword] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(getLoginSchema(t)),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const onSubmit = async (credentials: LoginFormValues) => {
        try {
            await dispatch(loginThunk(credentials)).unwrap();
            const user = await dispatch(getMeThunk()).unwrap();
            const roles = user.data?.roles || [];
            if (roles.includes("admin")) {
                navigate("/admin/dashboard");
            } else if (roles.includes("employee")) {
                navigate("/employee/tasks");
            } else {
                navigate("/guest/welcome");
            }
            toast.success("Đăng nhập thành công!");
        } catch (error) {
            toast.error("Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.");
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 px-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <div className="absolute right-4 top-4 z-20">
                <LanguageSwitcher />
            </div>

            {/* Background pattern & overlay */}
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
                        <UtensilsCrossed className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                        {t("auth:login.login")}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{t("auth:login.title")}</CardDescription>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-0">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-sm font-medium">
                                {t("auth:login.username")}
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-amber-600" />
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder={t("auth:login.username_placeholder")}
                                    className={`h-11 pl-10 transition-all focus:ring-2 focus:ring-amber-500/20 ${
                                        errors.username ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                                    {...register("username")}
                                />
                            </div>
                            {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">
                                {t("auth:login.password")}
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-amber-600" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t("auth:login.password_placeholder")}
                                    className={`h-11 pl-10 pr-10 transition-all focus:ring-2 focus:ring-amber-500/20 ${
                                        errors.password ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                />
                                <span>{t("auth:login.remember_me")}</span>
                            </label>
                            <button
                                type="button"
                                className="text-sm font-medium text-amber-700 transition-all hover:underline hover:underline-offset-4 dark:text-amber-400"
                                onClick={() => navigate("/forgot-password")}
                            >
                                {t("auth:login.forgot_password")}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full bg-gradient-to-r from-amber-700 to-orange-700 font-semibold shadow-md transition-all hover:from-amber-800 hover:to-orange-800 hover:shadow-lg active:scale-[0.98] dark:from-amber-600 dark:to-orange-600"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t("auth:login.processing")}
                                </div>
                            ) : (
                                <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    {t("auth:login.login_button")}
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
