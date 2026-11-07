import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReasonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    placeholder?: string;
    confirmLabel?: string;
    /** Trả về Promise; dialog tự đóng khi thành công, giữ nguyên khi lỗi */
    onConfirm: (reason: string) => Promise<unknown>;
}

/** Hộp thoại xác nhận có ô nhập lý do (không bắt buộc) */
export const ReasonDialog = ({ open, onOpenChange, ...props }: ReasonDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">{open && <Body {...props} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const Body = ({
    title,
    description,
    placeholder,
    confirmLabel,
    onConfirm,
    onClose,
}: Omit<ReasonDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await onConfirm(reason.trim());
            onClose();
        } catch {
            // Lỗi đã được hiển thị bởi nơi gọi
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <div className="grid gap-2 py-4">
                <Label htmlFor="reason-input">{t("order.reason")}</Label>
                <Textarea
                    id="reason-input"
                    rows={3}
                    maxLength={500}
                    value={reason}
                    placeholder={placeholder}
                    onChange={(e) => setReason(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" variant="destructive" disabled={busy}>
                    {busy ? t("common.processing") : confirmLabel || t("common.confirm")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default ReasonDialog;
