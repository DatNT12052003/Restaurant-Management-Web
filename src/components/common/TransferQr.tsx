import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { bankName } from "@/constants/banks";
import { useAsyncData, useNow } from "@/hooks";
import type { IQrInfo } from "@/interfaces";
import { formatMoney } from "@/lib/format";

/**
 * Giai đoạn 14: mã VietQR chuyển khoản (dùng ở màn hình thu ngân và trang bàn của khách).
 * Mọi app ngân hàng quét được; số tiền và nội dung điền sẵn. Hệ thống tự xác nhận khi ngân hàng báo về (SePay).
 */
const TransferQr = ({ qr }: { qr: IQrInfo }) => {
    const { t } = useTranslation("common");
    const now = useNow(1000);
    const fetcher = useCallback(() => QRCode.toDataURL(qr.payload, { width: 480, margin: 1, errorCorrectionLevel: "M" }), [qr.payload]);
    const { data: image } = useAsyncData(fetcher);

    const left = qr.expires_at ? Math.max(0, Math.floor((new Date(qr.expires_at).getTime() - now) / 1000)) : null;
    const copy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(t("transfer_qr.copied"));
        } catch {
            // Trình duyệt chặn clipboard (http, iframe): bỏ qua
        }
    };
    const row = (label: string, value: string, copyable = false) => (
        <div className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="flex items-center gap-1 text-right font-medium break-all">
                {value}
                {copyable && (
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copy(value)} aria-label={t("transfer_qr.copy")}>
                        <Copy className="h-3.5 w-3.5" />
                    </Button>
                )}
            </span>
        </div>
    );

    return (
        <div className="grid gap-3">
            {image ? (
                <img src={image} alt={t("transfer_qr.alt")} className="mx-auto aspect-square w-60 rounded-md border bg-white p-2" data-testid="transfer-qr" />
            ) : (
                <div className="mx-auto aspect-square w-60 animate-pulse rounded-md border bg-muted" />
            )}
            <div className="text-sm">
                {row(t("transfer_qr.bank"), bankName(qr.bank_bin))}
                {row(t("transfer_qr.account_no"), qr.account_no, true)}
                {qr.account_name && row(t("transfer_qr.account_name"), qr.account_name)}
                {row(t("transfer_qr.amount"), formatMoney(qr.amount))}
                {row(t("transfer_qr.content"), qr.content, true)}
            </div>
            <p className="text-center text-xs text-muted-foreground">{t("transfer_qr.hint")}</p>
            {left !== null && (
                <p className={left > 0 ? "text-center text-xs text-muted-foreground" : "text-center text-xs text-destructive"}>
                    {left > 0
                        ? t("transfer_qr.expires_in", { time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` })
                        : t("transfer_qr.expired")}
                </p>
            )}
        </div>
    );
};

export default TransferQr;
