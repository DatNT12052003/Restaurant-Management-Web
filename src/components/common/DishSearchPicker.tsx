import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronsUpDown } from "lucide-react";

import { getDishes } from "@/apis";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAsyncData, useDebounce } from "@/hooks";
import type { IDish, IGetQuery } from "@/interfaces";
import { formatMoney } from "@/lib/format";

const RESULT_LIMIT = 20;

/**
 * Chọn món bằng tìm kiếm phía server (không giới hạn số món trong thực đơn).
 * Mỗi lần chọn gọi `onPick`; ô tìm kiếm giữ nguyên để chọn tiếp.
 */
const DishSearchPicker = ({ placeholder, onPick }: { placeholder: string; onPick: (dish: IDish) => void }) => {
    const { t } = useTranslation("admin");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const debounced = useDebounce(search.trim(), 300);

    const fetcher = useCallback(async () => {
        if (!open) return [];
        const query: IGetQuery = { limit: RESULT_LIMIT, orderBy: [{ field: "name" }] };
        if (debounced) query.search = { text: debounced, fields: ["name"] };
        return (await getDishes(query)).data?.dishes || [];
    }, [open, debounced]);
    const { data: dishes = [], loading } = useAsyncData(fetcher);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="justify-between font-normal">
                    <span className="text-muted-foreground">{placeholder}</span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                {/* Lọc ở server nên tắt lọc của cmdk */}
                <Command shouldFilter={false}>
                    <CommandInput placeholder={t("menu.search_dish")} value={search} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty>{loading ? t("common.loading") : t("common.no_data")}</CommandEmpty>
                        <CommandGroup>
                            {dishes.map((d) => (
                                <CommandItem key={d.id} value={String(d.id)} onSelect={() => onPick(d)}>
                                    <span className="flex-1 truncate">
                                        {d.name}
                                        {d.status === "discontinued" ? ` (${t("menu.status.discontinued")})` : ""}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatMoney(d.price)}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {dishes.length === RESULT_LIMIT && (
                            <p className="px-3 py-2 text-xs text-muted-foreground">{t("menu.search_more_hint", { count: RESULT_LIMIT })}</p>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default DishSearchPicker;
