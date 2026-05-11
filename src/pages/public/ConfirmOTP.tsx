import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, RotateCw, ShieldCheck } from "lucide-react";
import loginBg from "@/assets/images/login-bg.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Schema validation for OTP (6 digits)
const otpSchema = z.object({
    otp: z.string().length(6, "Mã OTP phải có 6 chữ số").regex(/^\d+$/, "Mã OTP chỉ được chứa chữ số"),
});

type OTPFormValues = z.infer<typeof otpSchema>;

export default function ConfirmOTP() {
    const navigate = useNavigate();
    const location = useLocation();
    // Lấy email từ state (từ trang ForgotPassword)
    const email = (location.state as { email?: string })?.email || "user@example.com";

    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [otpValue, setOtpValue] = useState("");

    // react-hook-form để hiển thị lỗi validation
    const {
        handleSubmit,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<OTPFormValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    // Timer đếm ngược
    useEffect(() => {
        if (countdown > 0 && !canResend) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && !canResend) {
            setCanResend(true);
        }
    }, [countdown, canResend]);

    // Xử lý thay đổi OTP và xóa lỗi
    const handleOtpChange = (value: string) => {
        setOtpValue(value);
        if (errors.otp) clearErrors("otp");
    };

    // Xác thực OTP
    const handleVerifyOTP = async () => {
        // Validate thủ công bằng schema
        console.log("Verifying OTP:", otpValue, "for email:", email);
        const result = otpSchema.safeParse({ otp: otpValue });

        if (!result.success) {
            setError("otp", { message: result.error.message });
            return;
        }

        setIsLoading(true);
        // Simulate API call xác thực OTP
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Verifying OTP:", otpValue, "for email:", email);
        // Giả sử thành công
        toast.success("Xác thực thành công! Vui lòng tạo mật khẩu mới.");
        navigate("/reset-password", { state: { email, otp: otpValue } });
        setIsLoading(false);
    };

    // Gửi lại OTP
    const handleResendOTP = async () => {
        setIsResending(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        console.log("Resend OTP to:", email);
        toast.success("Mã OTP mới đã được gửi đến email của bạn.");
        setCountdown(60);
        setCanResend(false);
        setIsResending(false);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 px-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Background pattern (optional) */}
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
                        Xác thực OTP
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        Nhập mã xác thực gồm 6 chữ số đã được gửi đến email{" "}
                        <span className="font-medium text-amber-700 dark:text-amber-400">{email}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-0">
                    <form onSubmit={handleSubmit(handleVerifyOTP)} className="space-y-5">
                        <div className="space-y-3">
                            <Label htmlFor="otp" className="text-sm font-medium">
                                Mã OTP
                            </Label>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otpValue}
                                    onChange={handleOtpChange}
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
                            </div>
                            {errors.otp && <p className="text-center text-xs text-red-500">{errors.otp.message}</p>}
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
                                        Gửi lại mã
                                    </button>
                                ) : (
                                    <span>Gửi lại sau {countdown} giây</span>
                                )}
                            </span>
                            <Link to="/forgot-password" className="text-amber-700 hover:underline">
                                Nhập lại email
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
                                    Đang xác thực...
                                </div>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Xác nhận
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
