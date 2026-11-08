import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Pencil, Search } from "lucide-react";

import { getInventoryTransactions, getReceipt, getReceipts, getStock, setMinQuantity } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, useAsyncData, usePermission, useRealtime } from "@/hooks";
import type { IGetQuery, IStockItem, InventoryReceiptTypeEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatDateTime, startOfDay } from "@/lib/datetime";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import IngredientsTab from "./IngredientsTab";
import ReceiptDialog from "./ReceiptDialog";

const TYPE_STYLE: Record<string, string> = {
    import: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    export: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    adjust: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    consume: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

/** Kho nguyên liệu theo nhà hàng (đặc tả 4.5): tồn kho, nhập / xuất / kiểm kê, lịch sử, danh mục */
const Inventory = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const needBranch = isAdmin && !currentBranch;
    const [receiptOf, setReceiptOf] = useState<number | null>(null);
    const [version, setVersion] = useState(0);

    if (needBranch) {
        return (
            <div>
                <PageHeader title={t("inventory.title")} description={t("inventory.description")} />
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("order.select_branch_first")}</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={t("inventory.title")} description={t("inventory.description")} />
            <Tabs defaultValue="stock">
                <TabsList className="mb-4">
                    <TabsTrigger value="stock">{t("inventory.tab_stock")}</TabsTrigger>
                    <TabsTrigger value="receipts">{t("inventory.tab_receipts")}</TabsTrigger>
                    <TabsTrigger value="history">{t("inventory.tab_history")}</TabsTrigger>
                    <TabsTrigger value="ingredients">{t("inventory.tab_ingredients")}</TabsTrigger>
                </TabsList>
                <TabsContent value="stock">
                    <StockTab
                        restaurantId={restaurantId}
                        onSaved={(id) => {
                            // Mở phiếu vừa lập; tab phiếu / lịch sử tải lại khi mở
                            setReceiptOf(id);
                            setVersion((v) => v + 1);
                        }}
                    />
                </TabsContent>
                <TabsContent value="receipts">
                    <ReceiptsTab key={version} restaurantId={restaurantId} onSelect={setReceiptOf} />
                </TabsContent>
                <TabsContent value="history">
                    <HistoryTab key={version} restaurantId={restaurantId} onSelectReceipt={setReceiptOf} />
                </TabsContent>
                <TabsContent value="ingredients">
                    <IngredientsTab canCreate={can("ingredient.create")} canUpdate={can("ingredient.update")} canDelete={can("ingredient.delete")} />
                </TabsContent>
            </Tabs>
            <ReceiptDetailDialog receiptId={receiptOf} onOpenChange={(v) => !v && setReceiptOf(null)} />
        </div>
    );
};

/** Tồn kho: tô dòng tồn thấp, lập phiếu, đặt ngưỡng tối thiểu */
const StockTab = ({ restaurantId, onSaved }: { restaurantId?: number; onSaved: (receiptId: number) => void }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const [lowOnly, setLowOnly] = useState(false);
    const [search, setSearch] = useState("");
    const [receiptType, setReceiptType] = useState<InventoryReceiptTypeEnum | null>(null);
    const [minOf, setMinOf] = useState<IStockItem | null>(null);

    const fetcher = useCallback(async () => {
        try {
            // Luôn lấy cả nguyên liệu ngừng dùng còn tồn, lọc tồn thấp ở client để dùng chung dữ liệu cho phiếu
            return (await getStock({ include_inactive: true }, restaurantId)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["inventory:changed"], reload);

    const items = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data?.items || []).filter(
            (i) =>
                (!lowOnly || i.is_low) &&
                (!q || i.name.toLowerCase().includes(q)) &&
                (i.status === "active" || Number(i.quantity) !== 0),
        );
    }, [data, lowOnly, search]);

    return (
        <div className="grid gap-3">
            {data && (
                <div className="grid gap-2 sm:grid-cols-3">
                    <Card>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("inventory.summary.value")}</p>
                            <p className="text-xl font-semibold">{formatMoney(data.summary.total_value)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="py-4">
                            <p className="text-xs text-muted-foreground">{t("inventory.summary.items")}</p>
                            <p className="text-xl font-semibold">{data.summary.item_count}</p>
                        </CardContent>
                    </Card>
                    <Card className={cn(data.summary.low_count > 0 && "border-amber-400")}>
                        <CardContent className="py-4">
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {t("inventory.summary.low")}
                            </p>
                            <p className={cn("text-xl font-semibold", data.summary.low_count > 0 && "text-amber-600")}>
                                {data.summary.low_count}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8" placeholder={t("inventory.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={lowOnly} onCheckedChange={(v) => setLowOnly(v === true)} />
                    {t("inventory.low_only")}
                </label>
                <div className="ml-auto flex flex-wrap gap-2">
                    {can("inventory.import") && (
                        <Button onClick={() => setReceiptType("import")}>
                            <ArrowDownToLine className="h-4 w-4" />
                            {t("inventory.action.import")}
                        </Button>
                    )}
                    {can("inventory.export") && (
                        <Button variant="outline" onClick={() => setReceiptType("export")}>
                            <ArrowUpFromLine className="h-4 w-4" />
                            {t("inventory.action.export")}
                        </Button>
                    )}
                    {can("inventory.adjust") && (
                        <Button variant="outline" onClick={() => setReceiptType("adjust")}>
                            <ClipboardCheck className="h-4 w-4" />
                            {t("inventory.action.adjust")}
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("inventory.ingredient")}</TableHead>
                                <TableHead className="text-right">{t("inventory.quantity")}</TableHead>
                                <TableHead className="text-right">{t("inventory.min_quantity")}</TableHead>
                                <TableHead className="text-right">{t("inventory.avg_cost")}</TableHead>
                                <TableHead className="text-right">{t("inventory.stock_value")}</TableHead>
                                <TableHead>{t("inventory.last_change")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("inventory.no_items")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((i) => (
                                    <TableRow key={i.ingredient_id} className={cn(i.is_low && "bg-amber-50 dark:bg-amber-950/30")}>
                                        <TableCell>
                                            <span className="font-medium">{i.name}</span>
                                            {i.is_low && (
                                                <Badge variant="outline" className="ml-2 border-amber-400 text-amber-700">
                                                    {t("inventory.low_badge")}
                                                </Badge>
                                            )}
                                            {i.status === "inactive" && (
                                                <Badge variant="secondary" className="ml-2">
                                                    {t("status.ingredient.inactive")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "text-right font-semibold",
                                                i.is_low && "text-amber-700",
                                                Number(i.quantity) < 0 && "text-destructive",
                                            )}
                                            title={Number(i.quantity) < 0 ? t("inventory.negative_hint") : undefined}
                                        >
                                            {formatQty(i.quantity)} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(i.min_quantity) > 0 ? formatQty(i.min_quantity) : "—"}
                                            {can("inventory.adjust") && (
                                                <Button size="icon" variant="ghost" className="ml-1 h-6 w-6" onClick={() => setMinOf(i)} aria-label={t("inventory.set_min")}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">{formatMoney(i.avg_unit_cost)}</TableCell>
                                        <TableCell className="text-right">{formatMoney(i.stock_value)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {i.last_change_at ? formatDateTime(i.last_change_at) : "—"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ReceiptDialog
                type={receiptType}
                stock={data?.items || []}
                restaurantId={restaurantId}
                onOpenChange={(v) => !v && setReceiptType(null)}
                onSaved={(receipt) => {
                    reload();
                    onSaved(receipt.id);
                }}
            />
            <MinQuantityDialog item={minOf} restaurantId={restaurantId} onOpenChange={(v) => !v && setMinOf(null)} onSaved={reload} />
        </div>
    );
};

const MinQuantityDialog = ({
    item,
    restaurantId,
    onOpenChange,
    onSaved,
}: {
    item: IStockItem | null;
    restaurantId?: number;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) => (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
            {item && <MinQuantityBody key={item.ingredient_id} item={item} restaurantId={restaurantId} onClose={() => onOpenChange(false)} onSaved={onSaved} />}
        </DialogContent>
    </Dialog>
);

const MinQuantityBody = ({
    item,
    restaurantId,
    onClose,
    onSaved,
}: {
    item: IStockItem;
    restaurantId?: number;
    onClose: () => void;
    onSaved: () => void;
}) => {
    const { t } = useTranslation("admin");
    const [value, setValue] = useState(String(Number(item.min_quantity)));
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const res = await setMinQuantity(item.ingredient_id, Number(value) || 0, restaurantId);
            toast.success(res.message);
            onSaved();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <form onSubmit={submit}>
            <DialogHeader>
                <DialogTitle>{t("inventory.set_min_title", { name: item.name })}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
                <Label htmlFor="min-qty">
                    {t("inventory.min_quantity")} ({item.unit})
                </Label>
                <Input id="min-qty" type="number" min={0} step="0.001" value={value} onChange={(e) => setValue(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("inventory.min_hint")}</p>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={busy}>
                    {busy ? t("common.processing") : t("common.save")}
                </Button>
            </DialogFooter>
        </form>
    );
};

/** Danh sách phiếu kho */
const ReceiptsTab = ({ restaurantId, onSelect }: { restaurantId?: number; onSelect: (id: number) => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [type, setType] = useState<InventoryReceiptTypeEnum | "all">("all");
    const [date, setDate] = useState("");
    const [page, setPage] = useState(1);

    const fetcher = useCallback(async () => {
        const query: IGetQuery & { type?: InventoryReceiptTypeEnum; from?: string; to?: string } = { currentPage: page, limit: 20 };
        if (type !== "all") query.type = type;
        if (date) {
            const from = startOfDay(date);
            query.from = from.toISOString();
            query.to = addDays(from, 1).toISOString();
        }
        try {
            return (await getReceipts(query, restaurantId)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, type, date, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["inventory:changed"], reload, 800);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
                <Select
                    value={type}
                    onValueChange={(v) => {
                        setType(v as InventoryReceiptTypeEnum | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("inventory.all_types")}</SelectItem>
                        {(["import", "export", "adjust"] as const).map((tp) => (
                            <SelectItem key={tp} value={tp}>
                                {t(`inventory.type.${tp}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    className="w-auto"
                    value={date}
                    onChange={(e) => {
                        setDate(e.target.value);
                        setPage(1);
                    }}
                />
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("inventory.code")}</TableHead>
                                <TableHead>{t("inventory.type_label")}</TableHead>
                                <TableHead>{t("inventory.time")}</TableHead>
                                <TableHead>{t("inventory.supplier_or_reason")}</TableHead>
                                <TableHead className="text-center">{t("inventory.lines")}</TableHead>
                                <TableHead className="text-right">{t("inventory.value")}</TableHead>
                                <TableHead>{t("inventory.created_by")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : (data?.receipts.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.receipts.map((r) => (
                                    <TableRow key={r.id} className="cursor-pointer" onClick={() => onSelect(r.id)}>
                                        <TableCell className="font-mono text-xs font-semibold">{r.code}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={TYPE_STYLE[r.type]}>
                                                {t(`inventory.type.${r.type}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(r.created_at, i18n.language)}</TableCell>
                                        <TableCell className="max-w-56 truncate">{r.supplier || r.reason || "—"}</TableCell>
                                        <TableCell className="text-center">{r.line_count}</TableCell>
                                        <TableCell className={cn("text-right", Number(r.total_value) < 0 && "text-destructive")}>
                                            {formatMoney(r.total_value)}
                                        </TableCell>
                                        <TableCell>{r.created_by_name || "—"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}
        </div>
    );
};

/** Sổ biến động kho (lọc theo nguyên liệu) */
const HistoryTab = ({ restaurantId, onSelectReceipt }: { restaurantId?: number; onSelectReceipt: (id: number) => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [ingredient, setIngredient] = useState("all");
    const [page, setPage] = useState(1);

    const stockFetcher = useCallback(async () => (await getStock({ include_inactive: true }, restaurantId)).data?.items || [], [restaurantId]);
    const { data: stock } = useAsyncData(stockFetcher);

    const fetcher = useCallback(async () => {
        try {
            const query = { currentPage: page, limit: 30, ...(ingredient !== "all" ? { ingredient_id: Number(ingredient) } : {}) };
            return (await getInventoryTransactions(query, restaurantId)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, ingredient, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["inventory:changed"], reload, 800);

    return (
        <div className="grid gap-3">
            <Select
                value={ingredient}
                onValueChange={(v) => {
                    setIngredient(v);
                    setPage(1);
                }}
            >
                <SelectTrigger className="w-64">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("inventory.all_ingredients")}</SelectItem>
                    {(stock || []).map((s) => (
                        <SelectItem key={s.ingredient_id} value={String(s.ingredient_id)}>
                            {s.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("inventory.time")}</TableHead>
                                <TableHead>{t("inventory.ingredient")}</TableHead>
                                <TableHead>{t("inventory.type_label")}</TableHead>
                                <TableHead className="text-right">{t("inventory.change")}</TableHead>
                                <TableHead className="text-right">{t("inventory.after")}</TableHead>
                                <TableHead className="text-right">{t("inventory.unit_price")}</TableHead>
                                <TableHead>{t("inventory.reason")}</TableHead>
                                <TableHead>{t("inventory.code")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : (data?.transactions.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.transactions.map((tx) => {
                                    const change = Number(tx.quantity_change);
                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="whitespace-nowrap">{formatDateTime(tx.created_at, i18n.language)}</TableCell>
                                            <TableCell>{tx.ingredient_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={TYPE_STYLE[tx.type]}>
                                                    {t(`inventory.type.${tx.type}`)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-medium", change < 0 ? "text-destructive" : "text-emerald-600")}>
                                                {change > 0 ? "+" : ""}
                                                {formatQty(change)} {tx.unit}
                                            </TableCell>
                                            <TableCell className="text-right">{formatQty(tx.quantity_after)}</TableCell>
                                            <TableCell className="text-right">{formatMoney(tx.unit_price)}</TableCell>
                                            <TableCell className="max-w-48 truncate text-xs">
                                                {tx.reason || (tx.type === "consume" ? t("inventory.consume_reason") : "—")}
                                            </TableCell>
                                            <TableCell>
                                                {tx.receipt_id ? (
                                                    <button type="button" className="font-mono text-xs hover:underline" onClick={() => onSelectReceipt(tx.receipt_id!)}>
                                                        {tx.receipt_code}
                                                    </button>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}
        </div>
    );
};

/** Chi tiết một phiếu kho */
const ReceiptDetailDialog = ({ receiptId, onOpenChange }: { receiptId: number | null; onOpenChange: (open: boolean) => void }) => (
    <Dialog open={!!receiptId} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">{receiptId && <ReceiptDetail key={receiptId} id={receiptId} />}</DialogContent>
    </Dialog>
);

const ReceiptDetail = ({ id }: { id: number }) => {
    const { t, i18n } = useTranslation("admin");
    const fetcher = useCallback(async () => {
        try {
            return (await getReceipt(id)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [id]);
    const { data: r, loading } = useAsyncData(fetcher);
    if (loading && !r) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    if (!r) return null;
    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {r.code}
                    <Badge variant="outline" className={TYPE_STYLE[r.type]}>
                        {t(`inventory.type.${r.type}`)}
                    </Badge>
                </DialogTitle>
            </DialogHeader>
            <div className="grid gap-1 text-sm">
                <p>
                    {formatDateTime(r.created_at, i18n.language)} · {r.created_by_name || "—"}
                </p>
                {r.supplier && (
                    <p>
                        {t("inventory.supplier")}: {r.supplier}
                    </p>
                )}
                {r.reason && (
                    <p>
                        {t("inventory.reason")}: {r.reason}
                    </p>
                )}
                {r.note && <p className="text-muted-foreground">{r.note}</p>}
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("inventory.ingredient")}</TableHead>
                        <TableHead className="text-right">{t("inventory.change")}</TableHead>
                        <TableHead className="text-right">{t("inventory.after")}</TableHead>
                        <TableHead className="text-right">{t("inventory.unit_price")}</TableHead>
                        <TableHead className="text-right">{t("inventory.value")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(r.lines || []).map((l) => (
                        <TableRow key={l.id}>
                            <TableCell>{l.ingredient_name}</TableCell>
                            <TableCell className="text-right">
                                {Number(l.quantity_change) > 0 ? "+" : ""}
                                {formatQty(l.quantity_change)} {l.unit}
                            </TableCell>
                            <TableCell className="text-right">{formatQty(l.quantity_after)}</TableCell>
                            <TableCell className="text-right">{formatMoney(l.unit_price)}</TableCell>
                            <TableCell className="text-right">
                                {formatMoney(Math.round(Math.abs(Number(l.quantity_change)) * Number(l.unit_price)))}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>{t(`inventory.receipt.total_${r.type}`)}</span>
                <span>{formatMoney(r.total_value)}</span>
            </div>
        </>
    );
};

export default Inventory;
