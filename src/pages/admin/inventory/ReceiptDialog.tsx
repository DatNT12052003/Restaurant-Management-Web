import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";

import { createReceipt } from "@/apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { IInventoryReceipt, IReceiptPayload, IStockItem, InventoryReceiptTypeEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ReceiptDialogProps {
    type: InventoryReceiptTypeEnum | null;
    stock: IStockItem[];
    /** Admin: chi nhánh đang chọn */
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onSaved: (receipt: IInventoryReceipt) => void;
}

/** Lập phiếu nhập / xuất / kiểm kê */
export const ReceiptDialog = ({ type, onOpenChange, ...props }: ReceiptDialogProps) => {
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={!!type} onOpenChange={(v) => !busy && onOpenChange(v)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
                {type && <Body key={type} type={type} {...props} busy={busy} setBusy={setBusy} onClose={() => onOpenChange(false)} />}
            </DialogContent>
        </Dialog>
    );
};

interface Line {
    key: number;
    ingredient_id?: number;
    quantity: string;
    unit_price: string;
}

let lineKey = 0;
const emptyLine = (): Line => ({ key: ++lineKey, quantity: "", unit_price: "" });

const Body = ({
    type,
    stock,
    restaurantId,
    busy,
    setBusy,
    onClose,
    onSaved,
}: Omit<ReceiptDialogProps, "type" | "onOpenChange"> & {
    type: InventoryReceiptTypeEnum;
    busy: boolean;
    setBusy: (v: boolean) => void;
    onClose: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [lines, setLines] = useState<Line[]>([emptyLine()]);
    const [supplier, setSupplier] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    // Kiểm kê: số thực tế theo từng nguyên liệu ("" = không kiểm)
    const [counts, setCounts] = useState<Record<number, string>>({});
    const [countSearch, setCountSearch] = useState("");

    const byId = useMemo(() => new Map(stock.map((s) => [s.ingredient_id, s])), [stock]);
    // Nhập: nguyên liệu đang dùng; xuất: nguyên liệu còn tồn
    const choices = useMemo(
        () => stock.filter((s) => (type === "import" ? s.status === "active" : Number(s.quantity) > 0)),
        [stock, type],
    );

    const patch = (key: number, change: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
    const used = new Set(lines.map((l) => l.ingredient_id).filter(Boolean));

    const total =
        type === "import"
            ? lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0)
            : type === "export"
              ? lines.reduce((s, l) => s + (Number(l.quantity) || 0) * Number(byId.get(l.ingredient_id!)?.avg_unit_cost ?? 0), 0)
              : Object.entries(counts).reduce((s, [id, v]) => {
                    const item = byId.get(Number(id));
                    if (!item || v === "") return s;
                    return s + (Number(v) - Number(item.quantity)) * Number(item.avg_unit_cost);
                }, 0);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        let payloadLines: IReceiptPayload["lines"];
        if (type === "adjust") {
            payloadLines = Object.entries(counts)
                .filter(([, v]) => v !== "")
                .map(([id, v]) => ({ ingredient_id: Number(id), quantity: Number(v) }));
        } else {
            payloadLines = lines
                .filter((l) => l.ingredient_id && l.quantity)
                .map((l) => ({
                    ingredient_id: l.ingredient_id!,
                    quantity: Number(l.quantity),
                    ...(type === "import" ? { unit_price: Number(l.unit_price) || 0 } : {}),
                }));
        }
        if (payloadLines.length === 0) return toast.error(t("inventory.receipt.lines_required"));
        if (type === "export") {
            const over = payloadLines.find((l) => l.quantity > Number(byId.get(l.ingredient_id)?.quantity ?? 0));
            if (over) return toast.error(t("inventory.receipt.over_stock", { name: byId.get(over.ingredient_id)?.name }));
        }
        setBusy(true);
        try {
            const res = await createReceipt({
                restaurant_id: restaurantId,
                type,
                supplier: type === "import" ? supplier.trim() || null : null,
                reason: reason.trim() || null,
                note: note.trim() || null,
                lines: payloadLines,
            });
            toast.success(res.message);
            onSaved(res.data!);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const countRows = stock.filter((s) => !countSearch.trim() || s.name.toLowerCase().includes(countSearch.trim().toLowerCase()));

    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t(`inventory.receipt.title_${type}`)}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                {type === "adjust" ? (
                    <div className="grid gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-8" placeholder={t("inventory.search")} value={countSearch} onChange={(e) => setCountSearch(e.target.value)} />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("inventory.receipt.count_hint")}</p>
                        <div className="max-h-[45vh] overflow-y-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted text-xs">
                                    <tr>
                                        <th className="px-3 py-2 text-left">{t("inventory.ingredient")}</th>
                                        <th className="px-3 py-2 text-right">{t("inventory.system_qty")}</th>
                                        <th className="px-3 py-2 text-right">{t("inventory.actual_qty")}</th>
                                        <th className="px-3 py-2 text-right">{t("inventory.difference")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {countRows.map((s) => {
                                        const v = counts[s.ingredient_id] ?? "";
                                        const diff = v === "" ? null : Number(v) - Number(s.quantity);
                                        return (
                                            <tr key={s.ingredient_id} className="border-t">
                                                <td className="px-3 py-1.5">
                                                    {s.name} <span className="text-xs text-muted-foreground">({s.unit})</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right">{formatQty(s.quantity)}</td>
                                                <td className="px-3 py-1.5">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.001"
                                                        className="ml-auto h-8 w-28 text-right"
                                                        value={v}
                                                        onChange={(e) => setCounts((c) => ({ ...c, [s.ingredient_id]: e.target.value }))}
                                                    />
                                                </td>
                                                <td
                                                    className={cn(
                                                        "px-3 py-1.5 text-right font-medium",
                                                        diff !== null && diff < 0 && "text-destructive",
                                                        diff !== null && diff > 0 && "text-emerald-600",
                                                    )}
                                                >
                                                    {diff === null || diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatQty(diff)}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {lines.map((l) => {
                            const item = l.ingredient_id ? byId.get(l.ingredient_id) : undefined;
                            const over = type === "export" && item && Number(l.quantity) > Number(item.quantity);
                            return (
                                <div key={l.key} className="grid grid-cols-[1fr_110px_auto] items-end gap-2 sm:grid-cols-[1fr_110px_140px_auto]">
                                    <div className="grid gap-1">
                                        <Label className="text-xs">{t("inventory.ingredient")}</Label>
                                        <Select value={l.ingredient_id ? String(l.ingredient_id) : ""} onValueChange={(v) => patch(l.key, { ingredient_id: Number(v) })}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t("inventory.receipt.pick_ingredient")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {choices
                                                    .filter((c) => c.ingredient_id === l.ingredient_id || !used.has(c.ingredient_id))
                                                    .map((c) => (
                                                        <SelectItem key={c.ingredient_id} value={String(c.ingredient_id)}>
                                                            {c.name} ({c.unit}) · {t("inventory.in_stock", { qty: formatQty(c.quantity) })}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs">
                                            {t("inventory.quantity")}
                                            {item && ` (${item.unit})`}
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.001"
                                            className={cn(over && "border-destructive")}
                                            value={l.quantity}
                                            onChange={(e) => patch(l.key, { quantity: e.target.value })}
                                        />
                                    </div>
                                    {type === "import" && (
                                        <div className="col-span-2 grid gap-1 sm:col-span-1">
                                            <Label className="text-xs">{t("inventory.unit_price")}</Label>
                                            <Input type="number" min={0} value={l.unit_price} onChange={(e) => patch(l.key, { unit_price: e.target.value })} />
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={lines.length === 1}
                                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                                        aria-label={t("common.delete")}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            );
                        })}
                        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                            <Plus className="h-4 w-4" />
                            {t("inventory.receipt.add_line")}
                        </Button>
                    </div>
                )}

                {type === "import" && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="rc-supplier">{t("inventory.supplier")}</Label>
                        <Input id="rc-supplier" maxLength={255} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                    </div>
                )}
                {type !== "import" && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="rc-reason">{t("inventory.reason")} *</Label>
                        <Input
                            id="rc-reason"
                            required
                            maxLength={1000}
                            placeholder={t(`inventory.receipt.reason_placeholder_${type}`)}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                )}
                <div className="grid gap-1.5">
                    <Label htmlFor="rc-note">{t("inventory.note")}</Label>
                    <Textarea id="rc-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="flex justify-between border-t pt-2 text-sm">
                    <span>{t(`inventory.receipt.total_${type}`)}</span>
                    <strong>{formatMoney(Math.round(total))}</strong>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy}>
                    {busy ? t("common.processing") : t("inventory.receipt.submit")}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default ReceiptDialog;
