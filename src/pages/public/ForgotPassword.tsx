import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Mail, Send } from "lucide-react";
import loginBg from "@/assets/images/login-bg.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Schema validation
const forgotPasswordSchema = z.object({
    email: z.string().email("Vui lòng nhập email hợp lệ"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        console.log("Reset password for:", data.email);
        toast.success("Yêu cầu đặt lại mật khẩu đã được gửi!", {
            description: `Vui lòng kiểm tra email ${data.email}.`,
        });
        setIsSubmitted(true);
        setIsLoading(false);
    };

    if (isSubmitted) {
        return (
            <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 px-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
                            <Mail className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                            Kiểm tra email
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            Chúng tôi đã gửi link đặt lại mật khẩu
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            Vui lòng kiểm tra hộp thư đến (và cả thư mục spam). Link sẽ hết hạn sau 30 phút.
                        </p>
                        <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                            Gửi lại yêu cầu
                        </Button>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link to="/login" className="text-sm text-amber-700 hover:underline flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại đăng nhập
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 px-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
                        <Mail className="h-8 w-8 text-amber-700 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
                        Quên mật khẩu
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        Nhập email đăng ký của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-0">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-amber-600" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@rms.com"
                                    className={`h-11 pl-10 transition-all focus:ring-2 focus:ring-amber-500/20 ${
                                        errors.email ? "border-red-500 focus-visible:ring-red-500" : ""
                                    }`}
                                    {...register("email")}
                                    disabled={isLoading}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full bg-gradient-to-r from-amber-700 to-orange-700 font-semibold shadow-md transition-all hover:from-amber-800 hover:to-orange-800 hover:shadow-lg active:scale-[0.98] dark:from-amber-600 dark:to-orange-600"
                            disabled={isLoading}
                            onClick={() => navigate("/confirm-otp")}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Đang xử lý...
                                </div>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Gửi yêu cầu
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-sm text-amber-700 hover:underline flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại đăng nhập
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
