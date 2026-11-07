import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GenderEnum } from "@/enum";
import type { IProfileFields } from "@/interfaces";

interface ProfileFieldsProps {
    value: IProfileFields;
    onChange: (value: IProfileFields) => void;
    idPrefix: string;
}

/** Họ tên, email, SĐT, ngày sinh, giới tính, địa chỉ */
export const ProfileFields = ({ value, onChange, idPrefix }: ProfileFieldsProps) => {
    const { t } = useTranslation("admin");
    const set = (patch: Partial<IProfileFields>) => onChange({ ...value, ...patch });

    return (
        <>
            <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${idPrefix}-name`}>{t("user.full_name")} *</Label>
                <Input
                    id={`${idPrefix}-name`}
                    required
                    value={value.full_name || ""}
                    onChange={(e) => set({ full_name: e.target.value })}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-email`}>{t("user.email")}</Label>
                <Input
                    id={`${idPrefix}-email`}
                    type="email"
                    value={value.email || ""}
                    onChange={(e) => set({ email: e.target.value })}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-phone`}>{t("user.phone")}</Label>
                <Input
                    id={`${idPrefix}-phone`}
                    type="tel"
                    value={value.phone_number || ""}
                    onChange={(e) => set({ phone_number: e.target.value })}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-dob`}>{t("user.dob")}</Label>
                <Input
                    id={`${idPrefix}-dob`}
                    type="date"
                    value={value.date_of_birth || ""}
                    onChange={(e) => set({ date_of_birth: e.target.value })}
                />
            </div>
            <div className="grid gap-2">
                <Label>{t("user.gender")}</Label>
                <Select value={value.gender || undefined} onValueChange={(v) => set({ gender: v as GenderEnum })}>
                    <SelectTrigger>
                        <SelectValue placeholder={t("common.not_set")} />
                    </SelectTrigger>
                    <SelectContent>
                        {(["male", "female", "other"] as const).map((g) => (
                            <SelectItem key={g} value={g}>
                                {t(`status.gender.${g}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`${idPrefix}-address`}>{t("user.address")}</Label>
                <Textarea
                    id={`${idPrefix}-address`}
                    rows={2}
                    value={value.address || ""}
                    onChange={(e) => set({ address: e.target.value })}
                />
            </div>
        </>
    );
};

interface AvatarInputProps {
    currentUrl?: string | null;
    name?: string;
    file: File | null;
    onChange: (file: File | null) => void;
}

/** Chọn ảnh đại diện, xem trước ảnh mới chọn */
export const AvatarInput = ({ currentUrl, name, file, onChange }: AvatarInputProps) => {
    const { t } = useTranslation("admin");
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );

    return (
        <div className="flex items-center gap-4 sm:col-span-2">
            <Avatar className="h-16 w-16">
                <AvatarImage src={preview || currentUrl || ""} alt="" />
                <AvatarFallback>{name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
                <Label htmlFor="avatar-input">{t("user.avatar")}</Label>
                <Input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onChange(e.target.files?.[0] || null)}
                />
            </div>
        </div>
    );
};

