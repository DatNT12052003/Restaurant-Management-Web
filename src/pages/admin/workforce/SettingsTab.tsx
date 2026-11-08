import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { getHrSettings, rotateAttendanceQr, updateHrSettings } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData, usePermission } from "@/hooks";
import type { IHrSettings } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";

type Field = Exclude<keyof IHrSettings, "restaurant_id">;
const FIELDS: { key: Field; step?: number; min: number; max: number }[] = [
    { key: "standard_work_days", min: 1, max: 31 },
    { key: "standard_hours_per_day", step: 0.5, min: 0.5, max: 24 },
    { key: "late_grace_minutes", min: 0, max: 240 },
    { key: "early_leave_grace_minutes", min: 0, max: 240 },
    { key: "late_penalty_amount", step: 1000, min: 0, max: 9_999_999_999 },
    { key: "overtime_threshold_minutes", min: 0, max: 600 },
    { key: "overtime_multiplier", step: 0.1, min: 1, max: 5 },
    { key: "early_clock_in_minutes", min: 0, max: 720 },
];

/** Cấu hình nhân sự của chi nhánh (ngày công chuẩn, ân hạn, tăng ca, phạt đi muộn) và đổi khóa mã QR chấm công */
const SettingsTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const fetcher = useCallback(async () => (await getHrSettings(restaurantId)).data ?? null, [restaurantId]);
    const { data: settings, reload } = useAsyncData(fetcher);
    if (!settings) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    return <SettingsForm key={JSON.stringify(settings)} settings={settings} restaurantId={restaurantId} canEdit={can("payroll.manage")} canRotate={can(["attendance.manage", "payroll.manage"])} onSaved={reload} />;
};

const SettingsForm = ({
    settings,
    restaurantId,
    canEdit,
    canRotate,
    onSaved,
}: {
    settings: IHrSettings;
    restaurantId?: number;
    canEdit: boolean;
    canRotate: boolean;
    onSaved: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [values, setValues] = useState<Record<Field, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(Number(settings[f.key]))])) as Record<Field, string>);
    const [busy, setBusy] = useState(false);
    const [rotateOpen, setRotateOpen] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const payload = Object.fromEntries(FIELDS.map((f) => [f.key, Number(values[f.key])]));
            toast.success((await updateHrSettings(payload, restaurantId)).message);
            onSaved();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("hr.settings.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="grid gap-4">
                        <fieldset disabled={!canEdit} className="grid gap-3 sm:grid-cols-2">
                            {FIELDS.map((f) => (
                                <div key={f.key} className="grid gap-1.5">
                                    <Label htmlFor={`hr-${f.key}`}>{t(`hr.settings.${f.key}`)}</Label>
                                    <Input
                                        id={`hr-${f.key}`}
                                        type="number"
                                        min={f.min}
                                        max={f.max}
                                        step={f.step ?? 1}
                                        value={values[f.key]}
                                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">{t(`hr.settings.${f.key}_hint`)}</p>
                                </div>
                            ))}
                        </fieldset>
                        {canEdit && (
                            <div>
                                <Button type="submit" disabled={busy}>
                                    {busy ? t("common.processing") : t("common.save")}
                                </Button>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
            {canRotate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("hr.settings.qr_title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                        <p className="text-muted-foreground">{t("hr.settings.qr_hint")}</p>
                        <Button variant="outline" onClick={() => setRotateOpen(true)}>
                            <RefreshCw className="size-4" />
                            {t("hr.settings.rotate")}
                        </Button>
                    </CardContent>
                </Card>
            )}
            <ConfirmDialog
                open={rotateOpen}
                onOpenChange={setRotateOpen}
                title={t("hr.settings.rotate")}
                description={t("hr.settings.rotate_confirm")}
                onConfirm={async () => {
                    try {
                        toast.success((await rotateAttendanceQr(restaurantId)).message);
                    } catch (error) {
                        toast.error(getErrorMessage(error));
                        throw error;
                    }
                }}
            />
        </div>
    );
};

export default SettingsTab;
