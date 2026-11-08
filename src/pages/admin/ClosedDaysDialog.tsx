import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { createClosedDay, deleteClosedDay, getClosedDays } from "@/apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsyncData } from "@/hooks";
import { getErrorMessage } from "@/lib/api-error";
import { toDateInput } from "@/lib/datetime";

/** Ngày nghỉ của chi nhánh: không tính vào giờ mở cửa khi tính tỷ lệ lấp đầy bàn */
const ClosedDaysDialog = ({
    restaurant,
    canEdit,
    onOpenChange,
}: {
    restaurant: { id: number; name: string } | null;
    canEdit: boolean;
    onOpenChange: (open: boolean) => void;
}) => (
    <Dialog open={!!restaurant} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            {restaurant && <Body key={restaurant.id} restaurant={restaurant} canEdit={canEdit} />}
        </DialogContent>
    </Dialog>
);

const Body = ({ restaurant, canEdit }: { restaurant: { id: number; name: string }; canEdit: boolean }) => {
    const { t, i18n } = useTranslation("admin");
    const [day, setDay] = useState(toDateInput(new Date()));
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const fetcher = useCallback(async () => {
        try {
            return (await getClosedDays(restaurant.id)).data || [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurant.id]);
    const { data, loading, reload } = useAsyncData(fetcher);

    const run = async (action: () => Promise<{ message: string }>) => {
        setBusy(true);
        try {
            toast.success((await action()).message);
            reload();
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const label = (d: string) =>
        new Date(`${d}T00:00:00`).toLocaleDateString(i18n.language === "en" ? "en-GB" : "vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("restaurant.closed_days_title", { name: restaurant.name })}</DialogTitle>
                <DialogDescription>{t("restaurant.closed_days_desc")}</DialogDescription>
            </DialogHeader>

            {canEdit && (
                <form
                    className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (day && (await run(() => createClosedDay(restaurant.id, day, note.trim() || null)))) setNote("");
                    }}
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="closed-day">{t("restaurant.closed_day")}</Label>
                        <Input id="closed-day" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="closed-note">{t("restaurant.closed_note")}</Label>
                        <Input id="closed-note" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={busy || !day}>
                        {t("common.add")}
                    </Button>
                </form>
            )}

            <div className="divide-y rounded-md border">
                {loading && !data ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : !data?.length ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">{t("restaurant.no_closed_days")}</p>
                ) : (
                    data.map((d) => (
                        <div key={d.day} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <span className="w-36 font-medium tabular-nums">{label(d.day)}</span>
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.note || "—"}</span>
                            {canEdit && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy}
                                    onClick={() => run(() => deleteClosedDay(restaurant.id, d.day))}
                                    aria-label={t("common.delete")}
                                    title={t("common.delete")}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

export default ClosedDaysDialog;
