import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IFeedbackPayload } from "@/interfaces";
import { cn } from "@/lib/utils";

export const Stars = ({ value, onChange, label, size = "size-7" }: { value: number; onChange?: (v: number) => void; label: string; size?: string }) => (
    <span className="inline-flex" role={onChange ? "radiogroup" : undefined} aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
            <button
                key={n}
                type="button"
                role={onChange ? "radio" : undefined}
                aria-checked={onChange ? value === n : undefined}
                aria-label={`${label}: ${n}/5`}
                disabled={!onChange}
                onClick={() => onChange?.(n)}
                className="disabled:cursor-default"
            >
                <Star className={cn(size, n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
        ))}
    </span>
);

/** Form đánh giá sau bữa ăn: 3 tiêu chí sao, nhận xét, đánh dấu khiếu nại (khiếu nại thì xin SĐT để liên hệ) */
const FeedbackForm = ({ onSubmit, askPhone = false }: { onSubmit: (payload: IFeedbackPayload) => Promise<unknown>; askPhone?: boolean }) => {
    const { t } = useTranslation("public");
    const [food, setFood] = useState(0);
    const [service, setService] = useState(0);
    const [ambience, setAmbience] = useState(0);
    const [comment, setComment] = useState("");
    const [complaint, setComplaint] = useState(false);
    const [phone, setPhone] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await onSubmit({
                food_rating: food,
                service_rating: service,
                ambience_rating: ambience,
                comment: comment.trim() || null,
                is_complaint: complaint,
                contact_phone: phone.trim() || null,
            });
        } catch {
            // Lỗi đã hiển thị ở nơi gọi
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            {(
                [
                    ["food", food, setFood],
                    ["service", service, setService],
                    ["ambience", ambience, setAmbience],
                ] as const
            ).map(([key, value, set]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-sm">{t(`feedback.${key}`)}</span>
                    <Stars value={value} onChange={set} label={t(`feedback.${key}`)} />
                </div>
            ))}
            <div className="grid gap-1.5">
                <Label htmlFor="fb-comment">{t("feedback.comment")}</Label>
                <Textarea id="fb-comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={complaint} onCheckedChange={(v) => setComplaint(v === true)} />
                {t("feedback.complaint")}
            </label>
            {askPhone && complaint && (
                <div className="grid gap-1.5">
                    <Label htmlFor="fb-phone">{t("feedback.phone")}</Label>
                    <Input id="fb-phone" type="tel" maxLength={15} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
            )}
            <Button type="submit" disabled={busy || !food || !service || !ambience}>
                {busy ? t("common.processing") : t("feedback.submit")}
            </Button>
        </form>
    );
};

export default FeedbackForm;
