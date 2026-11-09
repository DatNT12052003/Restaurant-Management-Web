import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IPublicMenu, IPublicMenuItem } from "@/interfaces";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Section = "food" | "drink" | "combo";

/**
 * Thực đơn chia theo món ăn / đồ uống / combo, lọc theo thẻ. Có `quantities` + `onChange` thì hiện nút thêm bớt
 * (trang gọi món tại bàn).
 */
const MenuList = ({
    menu,
    quantities,
    onChange,
}: {
    menu: Pick<IPublicMenu, "dishes" | "combos">;
    quantities?: Record<string, number>;
    onChange?: (item: IPublicMenuItem, quantity: number) => void;
}) => {
    const { t } = useTranslation("public");
    const sections: { key: Section; items: IPublicMenuItem[] }[] = (
        [
            { key: "food" as const, items: menu.dishes.filter((d) => d.category !== "drink") },
            { key: "drink" as const, items: menu.dishes.filter((d) => d.category === "drink") },
            { key: "combo" as const, items: menu.combos },
        ] satisfies { key: Section; items: IPublicMenuItem[] }[]
    ).filter((s) => s.items.length);
    const [active, setActive] = useState<Section | null>(null);
    const [tag, setTag] = useState<number | null>(null);
    const current = sections.find((s) => s.key === active) ?? sections[0];
    const tags = [...new Map((current?.items ?? []).flatMap((i) => i.tags).map((x) => [x.id, x])).values()];
    const items = (current?.items ?? []).filter((i) => tag === null || i.tags.some((x) => x.id === tag));

    if (!sections.length) return <p className="py-8 text-center text-muted-foreground">{t("menu.empty")}</p>;

    return (
        <div className="grid gap-3">
            <div className="sticky top-14 z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur">
                {sections.map((s) => (
                    <Button
                        key={s.key}
                        size="sm"
                        variant={current?.key === s.key ? "default" : "outline"}
                        onClick={() => {
                            setActive(s.key);
                            setTag(null);
                        }}
                    >
                        {t(`menu.section.${s.key}`)} ({s.items.length})
                    </Button>
                ))}
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant={tag === null ? "default" : "outline"} className="cursor-pointer" onClick={() => setTag(null)}>
                        {t("menu.all_tags")}
                    </Badge>
                    {tags.map((x) => (
                        <Badge key={x.id} variant={tag === x.id ? "default" : "outline"} className="cursor-pointer" onClick={() => setTag(x.id)}>
                            {x.name}
                        </Badge>
                    ))}
                </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                    const key = `${item.kind}-${item.id}`;
                    const qty = quantities?.[key] ?? 0;
                    return (
                        <div key={key} className={cn("flex gap-3 rounded-lg border bg-card p-3", qty > 0 && "border-primary")}>
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="size-20 shrink-0 rounded-md object-cover" loading="lazy" />
                            ) : (
                                <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted">
                                    <UtensilsCrossed className="size-6 text-muted-foreground" />
                                </div>
                            )}
                            <div className="grid min-w-0 flex-1 content-start gap-1">
                                <p className="font-medium leading-tight">{item.name}</p>
                                {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
                                {item.items && item.items.length > 0 && (
                                    <p className="text-xs text-muted-foreground">{item.items.map((x) => `${x.quantity}× ${x.name}`).join(", ")}</p>
                                )}
                                <div className="mt-auto flex items-center justify-between gap-2">
                                    <span className="font-semibold tabular-nums text-orange-700 dark:text-orange-300">{formatMoney(item.price)}</span>
                                    {onChange &&
                                        (qty > 0 ? (
                                            <span className="flex items-center gap-1">
                                                <Button size="icon" variant="outline" className="size-8" aria-label={t("table.less", { name: item.name })} onClick={() => onChange(item, qty - 1)}>
                                                    <Minus className="size-4" />
                                                </Button>
                                                <span className="w-6 text-center font-medium tabular-nums">{qty}</span>
                                                <Button size="icon" className="size-8" aria-label={t("table.more", { name: item.name })} onClick={() => onChange(item, Math.min(50, qty + 1))}>
                                                    <Plus className="size-4" />
                                                </Button>
                                            </span>
                                        ) : (
                                            <Button size="sm" onClick={() => onChange(item, 1)} aria-label={t("table.add_item", { name: item.name })}>
                                                <Plus className="size-4" />
                                                {t("table.add")}
                                            </Button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MenuList;
