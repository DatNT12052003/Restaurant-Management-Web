import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Printer, RefreshCw } from "lucide-react";

import { rotateTableQr } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAsyncData, usePermission } from "@/hooks";
import type { ITable } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { tableUrl } from "@/lib/customer";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Giai đoạn 13: mã QR gọi món của một bàn — xem, in, đổi mã (bản in cũ hết dùng được) */
const TableQrDialog = ({ table, roomName, onOpenChange, onRotated }: { table: ITable | null; roomName?: string; onOpenChange: (open: boolean) => void; onRotated: () => void }) => (
    <Dialog open={!!table} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">{table && <Body key={table.id} table={table} roomName={roomName} onRotated={onRotated} />}</DialogContent>
    </Dialog>
);

const Body = ({ table, roomName, onRotated }: { table: ITable; roomName?: string; onRotated: () => void }) => {
    const { t } = useTranslation("admin");
    const canRotate = usePermission("table.update");
    const [token, setToken] = useState(table.qr_token ?? "");
    const [confirm, setConfirm] = useState(false);
    const url = token ? tableUrl(token) : "";
    const fetcher = useCallback(async () => (url ? await QRCode.toDataURL(url, { width: 512, margin: 1 }) : null), [url]);
    const { data: image } = useAsyncData(fetcher);

    const print = () => {
        const w = window.open("", "_blank", "width=480,height=640");
        if (!w || !image) return;
        w.document.write(
            `<!doctype html><html><head><meta charset="utf-8"><title>${esc(table.name)}</title>
            <style>body{font-family:sans-serif;text-align:center;padding:24px}img{width:300px;height:300px}h1{margin:8px 0}p{color:#555}</style></head>
            <body><h1>${esc(t("table_qr.print_title", { table: table.name }))}</h1>${roomName ? `<p>${esc(roomName)}</p>` : ""}
            <img src="${image}" alt=""/><p>${esc(t("table_qr.print_hint"))}</p>
            <script>window.onload=function(){window.print();}</script></body></html>`,
        );
        w.document.close();
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("table_qr.title", { table: table.name })}</DialogTitle>
                <DialogDescription>{t("table_qr.hint")}</DialogDescription>
            </DialogHeader>
            {image ? (
                <img src={image} alt={t("table_qr.title", { table: table.name })} className="mx-auto aspect-square w-64 rounded-md border bg-white p-2" data-testid="table-qr" />
            ) : (
                <p className="text-center text-muted-foreground">{token ? t("common.loading") : t("table_qr.missing")}</p>
            )}
            {url && (
                <a href={url} target="_blank" rel="noreferrer" className="break-all text-center text-xs text-muted-foreground hover:underline">
                    {url}
                </a>
            )}
            <DialogFooter className="gap-2">
                {canRotate && (
                    <Button variant="outline" onClick={() => setConfirm(true)}>
                        <RefreshCw className="size-4" />
                        {t("table_qr.rotate")}
                    </Button>
                )}
                <Button onClick={print} disabled={!image}>
                    <Printer className="size-4" />
                    {t("table_qr.print")}
                </Button>
            </DialogFooter>
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                title={t("table_qr.rotate")}
                description={t("table_qr.rotate_confirm")}
                onConfirm={async () => {
                    try {
                        const res = await rotateTableQr(table.id);
                        setToken(res.data!.qr_token);
                        toast.success(res.message);
                        onRotated();
                    } catch (error) {
                        toast.error(getErrorMessage(error));
                        throw error;
                    }
                }}
            />
        </>
    );
};

export default TableQrDialog;
