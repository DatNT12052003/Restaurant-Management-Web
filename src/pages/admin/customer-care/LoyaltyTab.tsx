import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { adjustLoyaltyPoints, getLoyaltyGuest, getLoyaltySettings, searchLoyaltyGuests, updateLoyaltySettings } from "@/apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData, useDebounce, usePermission } from "@/hooks";
import type { ILoyaltySettings } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

/** Điểm thưởng: cấu hình chung cả chuỗi (loyalty.manage), tra cứu khách, lịch sử và điều chỉnh điểm */
const LoyaltyTab = () => {
    const { t } = useTranslation("admin");
    const canManage = usePermission("loyalty.manage");
    const [query, setQuery] = useState("");
    const debounced = useDebounce(query.trim(), 300);
    const [openId, setOpenId] = useState<number | null>(null);

    const settingsFetcher = useCallback(async () => (await getLoyaltySettings()).data ?? null, []);
    const { data: settings, reload: reloadSettings } = useAsyncData(settingsFetcher);
    const resultsFetcher = useCallback(async () => (debounced.length >= 2 ? ((await searchLoyaltyGuests(debounced)).data ?? []) : []), [debounced]);
    const { data: results = [], reload: reloadResults } = useAsyncData(resultsFetcher);

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("loyalty.guests_title")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" placeholder={t("loyalty.search_placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("loyalty.search_placeholder")} />
                    </div>
                    {debounced.length < 2 && <p className="text-sm text-muted-foreground">{t("loyalty.search_hint")}</p>}
                    {debounced.length >= 2 && !results.length && <p className="text-sm text-muted-foreground">{t("loyalty.no_guest_found")}</p>}
                    <div className="divide-y rounded-md border empty:hidden">
                        {results.map((g) => (
                            <button key={g.id} type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setOpenId(g.id)}>
                                <span>
                                    <span className="font-medium">{g.full_name}</span>
                                    <span className="block text-xs text-muted-foreground">{[g.phone_number, g.email].filter(Boolean).join(" · ")}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                    {g.guest_status === "regular" && <Badge variant="outline">{t("loyalty.regular")}</Badge>}
                                    <span className="font-semibold tabular-nums">{t("loyalty.points_short", { count: g.loyalty_points })}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
            {settings && <SettingsCard key={settings.updated_at} settings={settings} canEdit={canManage} onSaved={reloadSettings} />}
            <GuestDialog
                guestId={openId}
                canAdjust={canManage}
                onOpenChange={(v) => !v && setOpenId(null)}
                onChanged={reloadResults}
            />
        </div>
    );
};

const FIELDS: { key: Exclude<keyof ILoyaltySettings, "enabled" | "updated_at">; min: number; max: number; step?: number }[] = [
    { key: "earn_amount", min: 1000, max: 10_000_000, step: 1000 },
    { key: "point_value", min: 1, max: 10_000_000, step: 100 },
    { key: "max_redeem_percent", min: 0, max: 100 },
    { key: "regular_visit_count", min: 1, max: 1000 },
    { key: "regular_window_months", min: 1, max: 120 },
];

const SettingsCard = ({ settings, canEdit, onSaved }: { settings: ILoyaltySettings; canEdit: boolean; onSaved: () => void }) => {
    const { t } = useTranslation("admin");
    const [enabled, setEnabled] = useState(settings.enabled);
    const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key])])) as Record<(typeof FIELDS)[number]["key"], string>);
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            toast.success((await updateLoyaltySettings({ enabled, ...Object.fromEntries(FIELDS.map((f) => [f.key, Number(values[f.key])])) })).message);
            onSaved();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t("loyalty.settings_title")}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit}>
                    <fieldset disabled={!canEdit} className="grid gap-3">
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
                            {t("loyalty.enabled")}
                        </label>
                        {FIELDS.map((f) => (
                            <div key={f.key} className="grid gap-1.5">
                                <Label htmlFor={`ly-${f.key}`}>{t(`loyalty.field.${f.key}`)}</Label>
                                <Input
                                    id={`ly-${f.key}`}
                                    type="number"
                                    min={f.min}
                                    max={f.max}
                                    step={f.step ?? 1}
                                    value={values[f.key]}
                                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                                    required
                                />
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                            {t("loyalty.rule_hint", { value: formatMoney(values.point_value), max: values.max_redeem_percent, earn: formatMoney(values.earn_amount) })}
                        </p>
                        {canEdit && (
                            <Button type="submit" disabled={busy}>
                                {busy ? t("common.processing") : t("common.save")}
                            </Button>
                        )}
                    </fieldset>
                </form>
            </CardContent>
        </Card>
    );
};

const GuestDialog = ({ guestId, canAdjust, onOpenChange, onChanged }: { guestId: number | null; canAdjust: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) => (
    <Dialog open={!!guestId} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">{guestId && <GuestBody key={guestId} guestId={guestId} canAdjust={canAdjust} onChanged={onChanged} />}</DialogContent>
    </Dialog>
);

const GuestBody = ({ guestId, canAdjust, onChanged }: { guestId: number; canAdjust: boolean; onChanged: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const fetcher = useCallback(async () => (await getLoyaltyGuest(guestId)).data ?? null, [guestId]);
    const { data: guest, reload } = useAsyncData(fetcher);
    const [points, setPoints] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    if (!guest) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    const adjust = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            toast.success((await adjustLoyaltyPoints(guest.id, Number(points), note.trim())).message);
            setPoints("");
            setNote("");
            reload();
            onChanged();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <>
            <DialogHeader>
                <DialogTitle>{guest.full_name}</DialogTitle>
                <DialogDescription>
                    {[guest.phone_number, guest.email].filter(Boolean).join(" · ")} · {t("loyalty.balance", { points: guest.loyalty_points, available: guest.available_points })}
                </DialogDescription>
            </DialogHeader>
            {canAdjust && (
                <form onSubmit={adjust} className="grid gap-2 rounded-md border p-3">
                    <Label>{t("loyalty.adjust")}</Label>
                    <div className="flex gap-2">
                        <Input type="number" className="w-32" placeholder="±" value={points} onChange={(e) => setPoints(e.target.value)} aria-label={t("loyalty.adjust_points")} required />
                        <Input placeholder={t("loyalty.adjust_note")} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-label={t("loyalty.adjust_note")} required />
                    </div>
                    <Button type="submit" variant="outline" disabled={busy || !Number(points) || !note.trim()}>
                        {t("loyalty.adjust")}
                    </Button>
                </form>
            )}
            <div className="divide-y rounded-md border text-sm">
                {!guest.transactions.length && <p className="p-3 text-muted-foreground">{t("common.no_data")}</p>}
                {guest.transactions.map((x) => (
                    <div key={x.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span>
                            {t(`loyalty.tx.${x.type}`)}
                            {x.order_code && <span className="text-muted-foreground"> · {x.order_code}</span>}
                            {x.type === "adjust" && x.note && <span className="text-muted-foreground"> · {x.note}</span>}
                            <span className="block text-xs text-muted-foreground">
                                {formatDateTime(x.created_at, i18n.language)}
                                {x.created_by_name && ` · ${x.created_by_name}`}
                            </span>
                        </span>
                        <span className={x.points > 0 ? "font-semibold text-emerald-700 tabular-nums dark:text-emerald-300" : "font-semibold text-destructive tabular-nums"}>
                            {x.points > 0 ? "+" : ""}
                            {x.points}
                            <span className="block text-right text-xs font-normal text-muted-foreground">= {x.balance_after}</span>
                        </span>
                    </div>
                ))}
            </div>
        </>
    );
};

export default LoyaltyTab;
