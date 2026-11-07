import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { changePassword, updateProfile } from "@/apis";
import PageHeader from "@/components/common/PageHeader";
import { AvatarInput, ProfileFields } from "@/components/common/ProfileFields";
import { cleanProfile, toProfileFields } from "@/lib/profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/hooks";
import type { IChangePassword, IProfileFields } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { setAccessToken } from "@/store/auth/authSlice";
import { getMeThunk } from "@/store/auth/authThunk";

const EMPTY_PASSWORD: IChangePassword = { current_password: "", new_password: "", confirm_password: "" };

const Profile = () => {
    const { t } = useTranslation("admin");
    const dispatch = useAppDispatch();
    const { user, roles, username } = useAppSelector((s) => s.auth);
    const branches = useAppSelector((s) => s.restaurant.branches);

    const [profile, setProfile] = useState<IProfileFields>(() => toProfileFields(user || {}));
    const [avatar, setAvatar] = useState<File | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [password, setPassword] = useState<IChangePassword>(EMPTY_PASSWORD);
    const [savingPassword, setSavingPassword] = useState(false);

    if (!user) return null;

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const res = await updateProfile(user.id, cleanProfile(profile, true), avatar);
            toast.success(res.message);
            setAvatar(null);
            await dispatch(getMeThunk());
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.new_password !== password.confirm_password) {
            toast.error(t("profile.password_mismatch"));
            return;
        }
        setSavingPassword(true);
        try {
            const res = await changePassword(password);
            // Backend cấp token mới cho phiên hiện tại và đăng xuất các thiết bị khác
            if (res.data?.access_token) dispatch(setAccessToken(res.data.access_token));
            toast.success(res.message);
            setPassword(EMPTY_PASSWORD);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSavingPassword(false);
        }
    };

    const branch = branches.find((b) => b.id === user.restaurant_id);

    return (
        <div>
            <PageHeader title={t("profile.title")} description={t("profile.description")} />

            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("profile.info")}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-1">
                            @{username}
                            {roles.map((r) => (
                                <Badge key={r} variant="secondary">
                                    {t(`roles.${r}`, r)}
                                </Badge>
                            ))}
                            {branch && <span>· {branch.name}</span>}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                            <AvatarInput
                                currentUrl={user.avatar_url}
                                name={profile.full_name}
                                file={avatar}
                                onChange={setAvatar}
                            />
                            <ProfileFields idPrefix="me" value={profile} onChange={setProfile} />
                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={savingProfile}>
                                    {savingProfile ? t("common.processing") : t("common.save")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("profile.change_password")}</CardTitle>
                        <CardDescription>{t("profile.change_password_hint")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={savePassword} className="grid gap-4">
                            {(["current_password", "new_password", "confirm_password"] as const).map((field) => (
                                <div key={field} className="grid gap-2">
                                    <Label htmlFor={`pw-${field}`}>{t(`profile.${field}`)}</Label>
                                    <Input
                                        id={`pw-${field}`}
                                        type="password"
                                        required
                                        minLength={field === "current_password" ? 1 : 6}
                                        autoComplete={field === "current_password" ? "current-password" : "new-password"}
                                        value={password[field]}
                                        onChange={(e) => setPassword({ ...password, [field]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <Button type="submit" disabled={savingPassword}>
                                {savingPassword ? t("common.processing") : t("profile.change_password")}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;
