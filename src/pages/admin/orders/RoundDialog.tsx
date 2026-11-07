import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Minus, Plus, Search, Send, Trash2, UtensilsCrossed } from "lucide-react";

import { getRestaurantMenu, sendOrderRound } from "@/apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsyncData } from "@/hooks";
import type { IOrderDetail, IRestaurantMenuItem } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type MenuTab = "all" | "food" | "drink" | "combo";

interface CartLine {
    key: string;
    kind: "dish" | "combo";
    id: number;
    name: string;
    price: number;
    quantity: number;
    note: string;
}

interface RoundDialogProps {
    order: IOrderDetail | null;
    onOpenChange: (open: boolean) => void;
    onSent: () => void;
}

/** Gọi món theo đợt: chọn món / combo đang bán tại chi nhánh, số lượng, ghi chú, rồi gửi bếp */
export const RoundDialog = ({ order, onOpenChange, onSent }: RoundDialogProps) => {
    const [sending, setSending] = useState(false);
    return (
        <Dialog open={!!order} onOpenChange={(v) => !sending && onOpenChange(v)}>
            <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
                {order && (
                    <Body
                        key={order.id}
                        order={order}
                        sending={sending}
                        setSending={setSending}
                        onClose={() => onOpenChange(false)}
                        onSent={onSent}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

const Body = ({
    order,
    sending,
    setSending,
    onClose,
    onSent,
}: {
    order: IOrderDetail;
    sending: boolean;
    setSending: (v: boolean) => void;
    onClose: () => void;
    onSent: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [tab, setTab] = useState<MenuTab>("all");
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartLine[]>([]);
    const [tableId, setTableId] = useState<number | undefined>(order.tables[0]?.id);
    const [roundNote, setRoundNote] = useState("");

    const restaurantId = order.restaurant_id;
    const fetcher = useCallback(async () => {
        try {
            return (await getRestaurantMenu(restaurantId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data: menu, loading } = useAsyncData(fetcher);

    const items = useMemo(() => {
        const sellable = (i: IRestaurantMenuItem) => i.is_available && i.status === "active";
        const dishes = (menu?.dishes || []).filter(sellable).map((d) => ({ ...d, kind: "dish" as const }));
        const combos = (menu?.combos || []).filter(sellable).map((c) => ({ ...c, kind: "combo" as const }));
        const q = search.trim().toLowerCase();
        return [...dishes, ...combos].filter((i) => {
            if (tab === "combo" && i.kind !== "combo") return false;
            if ((tab === "food" || tab === "drink") && (i.kind !== "dish" || i.category !== tab)) return false;
            return !q || i.name.toLowerCase().includes(q);
        });
    }, [menu, tab, search]);

    const add = (kind: "dish" | "combo", item: IRestaurantMenuItem) =>
        setCart((prev) => {
            // Gộp vào dòng chưa có ghi chú của cùng món
            const idx = prev.findIndex((l) => l.kind === kind && l.id === item.id && !l.note);
            if (idx >= 0) return prev.map((l, i) => (i === idx ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l));
            return [
                ...prev,
                { key: `${kind}-${item.id}-${Date.now()}`, kind, id: item.id, name: item.name, price: Number(item.price), quantity: 1, note: "" },
            ];
        });
    const patch = (key: string, change: Partial<CartLine>) =>
        setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...change } : l)).filter((l) => l.quantity > 0));

    const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const count = cart.reduce((sum, l) => sum + l.quantity, 0);
    const inCart = (kind: string, id: number) =>
        cart.filter((l) => l.kind === kind && l.id === id).reduce((s, l) => s + l.quantity, 0);

    const send = async () => {
        if (cart.length === 0) return toast.error(t("order.round.empty_cart"));
        setSending(true);
        try {
            const res = await sendOrderRound(order.id, {
                table_id: tableId,
                note: roundNote.trim() || null,
                items: cart.filter((l) => l.kind === "dish").map((l) => ({ dish_id: l.id, quantity: l.quantity, note: l.note.trim() || null })),
                combos: cart.filter((l) => l.kind === "combo").map((l) => ({ combo_id: l.id, quantity: l.quantity, note: l.note.trim() || null })),
            });
            toast.success(res.message);
            onSent();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("order.round.title", { code: order.code, no: order.rounds.length + 1 })}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2 lg:grid-cols-[1fr_360px]">
                {/* Thực đơn */}
                <div className="grid content-start gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tabs value={tab} onValueChange={(v) => setTab(v as MenuTab)}>
                            <TabsList>
                                {(["all", "food", "drink", "combo"] as const).map((k) => (
                                    <TabsTrigger key={k} value={k}>
                                        {t(`order.round.tab_${k}`)}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        <div className="relative min-w-48 flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder={t("order.round.search")}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
                        {loading ? (
                            <p className="col-span-full py-8 text-center text-muted-foreground">{t("common.loading")}</p>
                        ) : items.length === 0 ? (
                            <p className="col-span-full py-8 text-center text-muted-foreground">{t("order.round.no_items")}</p>
                        ) : (
                            items.map((item) => {
                                const qty = inCart(item.kind, item.id);
                                return (
                                    <button
                                        key={`${item.kind}-${item.id}`}
                                        type="button"
                                        onClick={() => add(item.kind, item)}
                                        className={cn(
                                            "relative flex flex-col overflow-hidden rounded-lg border text-left transition-colors hover:border-primary",
                                            qty > 0 && "border-primary ring-1 ring-primary",
                                        )}
                                    >
                                        <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                                            ) : (
                                                <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.kind === "combo" ? t("order.round.combo") : t(`menu.category.${item.category}`)} ·{" "}
                                                {formatMoney(item.price)}
                                            </p>
                                        </div>
                                        {qty > 0 && (
                                            <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                                {qty}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Giỏ món của đợt */}
                <div className="grid content-start gap-3 rounded-lg border p-3">
                    {order.tables.length > 1 && (
                        <div className="grid gap-1.5">
                            <Label>{t("order.round.for_table")}</Label>
                            <Select value={String(tableId ?? "")} onValueChange={(v) => setTableId(Number(v))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {order.tables.map((tb) => (
                                        <SelectItem key={tb.id} value={String(tb.id)}>
                                            {tb.name} · {tb.room_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <p className="text-sm font-semibold">{t("order.round.cart", { count })}</p>
                    {cart.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t("order.round.cart_hint")}</p>
                    ) : (
                        <div className="grid max-h-[40vh] gap-2 overflow-y-auto">
                            {cart.map((l) => (
                                <div key={l.key} className="grid gap-1.5 rounded-md border p-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-medium">{l.name}</span>
                                        <span className="whitespace-nowrap text-sm">{formatMoney(l.price * l.quantity)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => patch(l.key, { quantity: l.quantity - 1 })} aria-label="-">
                                            <Minus className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="w-8 text-center text-sm font-semibold">{l.quantity}</span>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={() => patch(l.key, { quantity: Math.min(99, l.quantity + 1) })}
                                            aria-label="+"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                        <Input
                                            className="ml-1 h-7 text-xs"
                                            placeholder={t("order.round.line_note")}
                                            maxLength={500}
                                            value={l.note}
                                            onChange={(e) => patch(l.key, { note: e.target.value })}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => patch(l.key, { quantity: 0 })}
                                            aria-label={t("common.delete")}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Input
                        placeholder={t("order.round.round_note")}
                        maxLength={1000}
                        value={roundNote}
                        onChange={(e) => setRoundNote(e.target.value)}
                    />
                    <div className="flex items-center justify-between border-t pt-2 text-sm">
                        <span>{t("order.round.total")}</span>
                        <strong>{formatMoney(total)}</strong>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={sending}>
                    {t("common.cancel")}
                </Button>
                <Button onClick={send} disabled={sending || cart.length === 0}>
                    <Send className="h-4 w-4" />
                    {sending ? t("common.processing") : t("order.round.send")}
                </Button>
            </DialogFooter>
        </>
    );
};

export default RoundDialog;
