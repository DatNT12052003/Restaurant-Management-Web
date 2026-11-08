import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tokenFromQr } from "@/lib/hr";

/** BarcodeDetector chưa có trong lib của TypeScript */
interface IBarcodeDetector {
    detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
declare global {
    interface Window {
        BarcodeDetector?: new (options: { formats: string[] }) => IBarcodeDetector;
    }
}

const canScan = () => typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;

/**
 * Quét mã QR chấm công bằng camera (trình duyệt hỗ trợ BarcodeDetector). Trình duyệt khác: dùng ứng dụng camera của điện thoại
 * quét mã (mã là đường dẫn tới trang chấm công), hoặc dán mã vào ô bên dưới.
 */
const ScanQrDialog = ({ open, onOpenChange, onToken }: { open: boolean; onOpenChange: (open: boolean) => void; onToken: (token: string) => Promise<unknown> }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">{open && <Body onToken={onToken} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
);

const Body = ({ onToken, onClose }: { onToken: (token: string) => Promise<unknown>; onClose: () => void }) => {
    const { t } = useTranslation("admin");
    const videoRef = useRef<HTMLVideoElement>(null);
    const [manual, setManual] = useState("");
    const [busy, setBusy] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const scanning = canScan();
    const doneRef = useRef(false);
    // Mã vừa bị từ chối: camera không gửi lại liên tục (mã QR đổi mỗi 30 giây)
    const failedRef = useRef("");

    const submit = async (text: string, fromCamera = false) => {
        if (doneRef.current || !text.trim() || (fromCamera && text === failedRef.current)) return;
        doneRef.current = true;
        setBusy(true);
        try {
            await onToken(tokenFromQr(text));
            onClose();
        } catch {
            failedRef.current = text;
            doneRef.current = false;
        } finally {
            setBusy(false);
        }
    };
    const submitRef = useRef(submit);
    useEffect(() => {
        submitRef.current = submit;
    });

    useEffect(() => {
        if (!scanning) return;
        let stream: MediaStream | null = null;
        let timer: number | undefined;
        let stopped = false;
        const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "environment" } })
            .then(async (s) => {
                if (stopped) return s.getTracks().forEach((track) => track.stop());
                stream = s;
                const video = videoRef.current;
                if (!video) return;
                video.srcObject = s;
                await video.play();
                const tick = async () => {
                    if (stopped) return;
                    try {
                        const codes = await detector.detect(video);
                        if (codes[0]?.rawValue) await submitRef.current(codes[0].rawValue, true);
                    } catch {
                        // Khung hình chưa sẵn sàng: thử lại
                    }
                    timer = window.setTimeout(tick, 400);
                };
                tick();
            })
            .catch(() => setCameraError(true));
        return () => {
            stopped = true;
            window.clearTimeout(timer);
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [scanning]);

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("hr.clock.scan_title")}</DialogTitle>
                <DialogDescription>{scanning && !cameraError ? t("hr.clock.scan_hint") : t("hr.clock.scan_unsupported")}</DialogDescription>
            </DialogHeader>
            {scanning && !cameraError && <video ref={videoRef} className="aspect-square w-full rounded-md bg-black object-cover" muted playsInline />}
            <form
                className="grid gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    submit(manual);
                }}
            >
                <Label htmlFor="qr-manual">{t("hr.clock.paste_code")}</Label>
                <div className="flex gap-2">
                    <Input id="qr-manual" value={manual} onChange={(e) => setManual(e.target.value)} autoComplete="off" />
                    <Button type="submit" disabled={busy || !manual.trim()}>
                        {busy ? t("common.processing") : t("hr.clock.submit")}
                    </Button>
                </div>
            </form>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                    {t("common.close")}
                </Button>
            </DialogFooter>
        </>
    );
};

export default ScanQrDialog;
