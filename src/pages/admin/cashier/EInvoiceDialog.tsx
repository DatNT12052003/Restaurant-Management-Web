import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { issueEInvoice } from "@/apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IEInvoiceBuyer, IInvoice } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const TAX_CODE = /^\d{10}(-\d{3})?$/;

/** Giai đoạn 14: phát hành hóa đơn VAT điện tử cho order đã hoàn tất (người mua cá nhân hoặc doanh nghiệp) */
const EInvoiceDialog = ({
    invoice,
    open,
    onOpenChange,
    onIssued,
}: {
    invoice: IInvoice;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onIssued: () => void;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
            {open && <Body invoice={invoice} onClose={() => onOpenChange(false)} onIssued={onIssued} />}
        </DialogContent>
    </Dialog>
);

const Body = ({ invoice, onClose, onIssued }: { invoice: IInvoice; onClose: () => void; onIssued: () => void }) => {
    const { t } = useTranslation("admin");
    const [buyer, setBuyer] = useState<IEInvoiceBuyer>({
        buyer_type: "individual",
        buyer_name: invoice.order.guest_name ?? "",
        buyer_phone: invoice.order.guest_phone ?? "",
    });
    const [busy, setBusy] = useState(false);
    const company = buyer.buyer_type === "company";
    const taxInvalid = !!buyer.buyer_tax_code && !TAX_CODE.test(buyer.buyer_tax_code.trim());
    const invalid = taxInvalid || (company && (!buyer.buyer_company?.trim() || !buyer.buyer_tax_code?.trim()));
    const set = (patch: Partial<IEInvoiceBuyer>) => setBuyer((b) => ({ ...b, ...patch }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (invalid) return;
        setBusy(true);
        try {
            const res = await issueEInvoice(invoice.order.id, buyer);
            if (res.data?.status === "failed") toast.warning(t("einvoice.failed_toast", { error: res.data.error_message ?? "" }));
            else toast.success(res.message);
            onIssued();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const field = (id: keyof IEInvoiceBuyer, label: string, props: React.ComponentProps<typeof Input> = {}) => (
        <div className="grid gap-1.5">
            <Label htmlFor={`einv-${id}`}>{label}</Label>
            <Input id={`einv-${id}`} value={(buyer[id] as string) ?? ""} onChange={(e) => set({ [id]: e.target.value })} {...props} />
        </div>
    );

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t("einvoice.issue_title", { code: invoice.order.code })}</DialogTitle>
                <DialogDescription>{t("einvoice.issue_hint", { total: formatMoney(invoice.total) })}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
                <div className="grid grid-cols-2 gap-2">
                    {(["individual", "company"] as const).map((type) => (
                        <Button
                            key={type}
                            type="button"
                            variant={buyer.buyer_type === type ? "default" : "outline"}
                            onClick={() => set({ buyer_type: type })}
                        >
                            {t(`einvoice.buyer_type.${type}`)}
                        </Button>
                    ))}
                </div>
                {company && field("buyer_company", `${t("einvoice.buyer_company")} *`, { maxLength: 255, required: true })}
                {company && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="einv-buyer_tax_code">{t("einvoice.buyer_tax_code")} *</Label>
                        <Input
                            id="einv-buyer_tax_code"
                            inputMode="numeric"
                            maxLength={14}
                            className={cn(taxInvalid && "border-destructive")}
                            value={buyer.buyer_tax_code ?? ""}
                            onChange={(e) => set({ buyer_tax_code: e.target.value })}
                        />
                        {taxInvalid && <p className="text-xs text-destructive">{t("einvoice.tax_code_invalid")}</p>}
                    </div>
                )}
                {field("buyer_name", company ? t("einvoice.buyer_contact") : t("einvoice.buyer_name"), { maxLength: 255 })}
                {field("buyer_address", t("einvoice.buyer_address"), { maxLength: 1000 })}
                <div className="grid grid-cols-2 gap-3">
                    {field("buyer_email", t("einvoice.buyer_email"), { type: "email", maxLength: 255 })}
                    {field("buyer_phone", t("einvoice.buyer_phone"), { type: "tel", maxLength: 30 })}
                </div>
                {!company && <p className="text-xs text-muted-foreground">{t("einvoice.individual_hint")}</p>}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy || invalid}>
                    {busy ? t("common.processing") : t("einvoice.issue")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default EInvoiceDialog;
