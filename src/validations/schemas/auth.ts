import { z } from "zod";
import type { TFunction } from "i18next";

export const getLoginSchema = (t: TFunction) =>
    z.object({
        username: z.string().min(1, t("validation:login.username_required")).min(5, t("validation:login.username_min")),
        password: z.string().min(1, t("validation:login.password_required")).min(6, t("validation:login.password_min")),
    });

export type LoginFormValues = z.infer<ReturnType<typeof getLoginSchema>>;

export const getForgotPasswordSchema = (t: TFunction) =>
    z.object({
        email: z.string().email(t("validation:forgot_password.email_invalid")),
    });

export type ForgotPasswordFormValues = z.infer<ReturnType<typeof getForgotPasswordSchema>>;

export const getOtpSchema = (t: TFunction) =>
    z.object({
        code: z
            .string()
            .min(1, {
                message: t("validation:confirm_otp.code_required"),
            })
            .length(6, {
                message: t("validation:confirm_otp.code_length"),
            })
            .regex(/^\d+$/, {
                message: t("validation:confirm_otp.code_digits"),
            }),
    });
export type OtpFormValues = z.infer<ReturnType<typeof getOtpSchema>>;

export const getResetPasswordSchema = (t: TFunction) =>
    z
        .object({
            newPassword: z.string().min(6, t("validation:reset_password.new_password_min")),
            confirmPassword: z.string().min(6, t("validation:reset_password.confirm_password_min")),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: t("validation:reset_password.passwords_must_match"),
            path: ["confirmPassword"],
        });

export type ResetPasswordFormValues = z.infer<ReturnType<typeof getResetPasswordSchema>>;
