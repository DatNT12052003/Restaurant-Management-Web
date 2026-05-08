import { z } from "zod";
import type { TFunction } from "i18next";

export const getLoginSchema = (t: TFunction) =>
    z.object({
        username: z.string().min(1, t("validation:login.username_required")).min(5, t("validation:login.username_min")),
        password: z.string().min(1, t("validation:login.password_required")).min(6, t("validation:login.password_min")),
    });

export type LoginFormValues = z.infer<ReturnType<typeof getLoginSchema>>;
