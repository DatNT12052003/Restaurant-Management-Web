import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BellRing, Lock, Search, Users } from "lucide-react";

import { getActiveOrders, getAllRooms, getAllTables, getOrders } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { USAGE_STATUSES, USAGE_STATUS_STYLE } from "@/constants/roles";
import { ORDER_STATUSES, ORDER_STATUS_STYLE } from "@/constants/order";
import type { OrderStatusEnum } from "@/enum";
import { useAppSelector, useAsyncData, useDebounce, useNow, usePermission, useRealtime } from "@/hooks";
import type { IGetQuery, IOrder, IRoom, ITable } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatDateTime, startOfDay, toDateInput } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import OpenOrderDialog from "./OpenOrderDialog";
import OrderSheet, { type IFreeTable } from "./OrderSheet";

/** Phục vụ (đặc tả 4.7): sơ đồ bàn với order đang mở, mở order, gọi món; lịch sử order */
const Orders = () => {
    const { t } = useTranslation("admin");
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const needBranch = isAdmin && !currentBranch;
    const can = usePermission();
    const canSeeFloor = can("room.view") && can("table.view");

    const [tab, setTab] = useState(canSeeFloor ? "floor" : "history");
    const [sheetOrderId, setSheetOrderId] = useState<number | null>(null);
    const [openFor, setOpenFor] = useState<ITable | null>(null);

    // ---- Sơ đồ + order đang mở ----
    const floorFetcher = useCallback(async (): Promise<{ rooms: IRoom[]; tables: ITable[]; orders: IOrder[] }> => {
        if (needBranch) return { rooms: [], tables: [], orders: [] };
        try {
            const [rooms, tables, orders] = await Promise.all([
                canSeeFloor ? getAllRooms(restaurantId) : Promise.resolve({ data: [] as IRoom[] }),
                canSeeFloor ? getAllTables(restaurantId) : Promise.resolve({ data: [] as ITable[] }),
                getActiveOrders(restaurantId),
            ]);
            return { rooms: rooms.data || [], tables: tables.data || [], orders: orders.data || [] };
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId, needBranch, canSeeFloor]);
    const { data: floor, loading, reload } = useAsyncData(floorFetcher);
    useRealtime(["order:created", "order:updated", "order:round_sent", "order_item:status_changed", "table:status_changed"], reload);

    const orderByTable = useMemo(() => {
        const map = new Map<number, IOrder>();
        (floor?.orders || []).forEach((o) => o.tables.forEach((tb) => map.set(tb.id, o)));
        return map;
    }, [floor]);
    const freeTables: IFreeTable[] = useMemo(() => {
        const activeRooms = new Map((floor?.rooms || []).filter((r) => r.is_active).map((r) => [r.id, r]));
        return (floor?.tables || [])
            .filter((tb) => activeRooms.has(tb.room_id) && !orderByTable.has(tb.id))
            .map((tb) => ({ id: tb.id, name: tb.name, capacity: tb.capacity, room_name: activeRooms.get(tb.room_id)!.name }))
            .sort((a, b) => a.room_name.localeCompare(b.room_name) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    }, [floor, orderByTable]);

    if (needBranch) {
        return (
            <div>
                <PageHeader title={t("order.title")} description={t("order.description")} />
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("order.select_branch_first")}</CardContent>
                </Card>
            </div>
        );
    }

    const onTableClick = (table: ITable, roomActive: boolean) => {
        const order = orderByTable.get(table.id);
        if (order) return setSheetOrderId(order.id);
        if (roomActive && can("order.create")) setOpenFor(table);
    };

    return (
        <div>
            <PageHeader title={t("order.title")} description={t("order.description")} />
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-4">
                    {canSeeFloor && <TabsTrigger value="floor">{t("order.tab_floor")}</TabsTrigger>}
                    <TabsTrigger value="history">{t("order.tab_history")}</TabsTrigger>
                </TabsList>

                {canSeeFloor && (
                    <TabsContent value="floor">
                        {loading && !floor ? (
                            <p className="text-muted-foreground">{t("common.loading")}</p>
                        ) : (
                            <FloorPlan
                                rooms={floor?.rooms || []}
                                tables={floor?.tables || []}
                                orderByTable={orderByTable}
                                openCount={floor?.orders.length ?? 0}
                                onTableClick={onTableClick}
                            />
                        )}
                    </TabsContent>
                )}
                <TabsContent value="history">
                    <OrderHistory restaurantId={restaurantId} onSelect={setSheetOrderId} />
                </TabsContent>
            </Tabs>

            <OrderSheet
                orderId={sheetOrderId}
                freeTables={freeTables}
                onOpenChange={(v) => !v && setSheetOrderId(null)}
                onChanged={reload}
            />
            <OpenOrderDialog
                table={openFor}
                freeTables={freeTables}
                restaurantId={restaurantId}
                onOpenChange={(v) => !v && setOpenFor(null)}
                onOpened={(order) => {
                    reload();
                    setSheetOrderId(order.id);
                }}
            />
        </div>
    );
};

/** Sơ đồ bàn theo phòng; bàn có order hiển thị mã, số khách, thời gian ngồi, món chờ phục vụ */
const FloorPlan = ({
    rooms,
    tables,
    orderByTable,
    openCount,
    onTableClick,
}: {
    rooms: IRoom[];
    tables: ITable[];
    orderByTable: Map<number, IOrder>;
    openCount: number;
    onTableClick: (table: ITable, roomActive: boolean) => void;
}) => {
    const { t } = useTranslation("admin");
    const now = useNow(30_000);
    const byName = <T extends { name: string }>(list: T[]) =>
        [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (rooms.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">{t("room.no_rooms")}</CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
                {USAGE_STATUSES.map((st) => (
                    <span key={st} className={cn("rounded-md border px-3 py-1 text-sm", USAGE_STATUS_STYLE[st])}>
                        {t(`status.usage.${st}`)}: <strong>{tables.filter((tb) => tb.status === st).length}</strong>
                    </span>
                ))}
                <span className="rounded-md border px-3 py-1 text-sm">
                    {t("order.open_orders")}: <strong>{openCount}</strong>
                </span>
            </div>
            {byName(rooms).map((room) => {
                const roomTables = byName(tables.filter((tb) => tb.room_id === room.id));
                if (roomTables.length === 0) return null;
                return (
                    <Card key={room.id} className={cn(!room.is_active && "opacity-60")}>
                        <CardContent className="p-4">
                            <p className="mb-3 flex items-center gap-2 font-medium">
                                {room.name}
                                <Badge variant="outline">{t(`status.room_type.${room.type}`)}</Badge>
                                {!room.is_active && <Lock className="h-4 w-4 text-muted-foreground" />}
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                {roomTables.map((table) => {
                                    const order = orderByTable.get(table.id);
                                    const ready = order?.line_counts?.ready ?? 0;
                                    const minutes = order ? Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000)) : 0;
                                    return (
                                        <button
                                            key={table.id}
                                            type="button"
                                            onClick={() => onTableClick(table, room.is_active)}
                                            className={cn(
                                                "relative flex min-h-24 flex-col rounded-lg border p-3 text-left transition hover:shadow-md",
                                                USAGE_STATUS_STYLE[table.status],
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span className="text-lg font-semibold">{table.name}</span>
                                                <span className="flex items-center gap-0.5 text-xs">
                                                    <Users className="h-3 w-3" />
                                                    {order ? `${order.guest_count}/${table.capacity}` : table.capacity}
                                                </span>
                                            </div>
                                            {order ? (
                                                <div className="mt-1 grid gap-0.5 text-xs">
                                                    <span className="font-medium">{order.code.split("-").pop()}</span>
                                                    <span>
                                                        {t("order.minutes", { count: minutes })} · {formatMoney(order.total)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="mt-1 text-xs font-medium">{t(`status.usage.${table.status}`)}</span>
                                            )}
                                            {ready > 0 && (
                                                <span className="absolute -right-1.5 -top-1.5 flex items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white shadow">
                                                    <BellRing className="h-3 w-3" />
                                                    {ready}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

/** Lịch sử order: lọc theo trạng thái, ngày, mã */
const OrderHistory = ({ restaurantId, onSelect }: { restaurantId?: number; onSelect: (id: number) => void }) => {
    const { t, i18n } = useTranslation("admin");
    const [status, setStatus] = useState<OrderStatusEnum | "all">("all");
    const [date, setDate] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const debounced = useDebounce(search.trim(), 400);

    const fetcher = useCallback(async () => {
        const query: IGetQuery & { from?: string; to?: string } = { currentPage: page, limit: 20 };
        if (status !== "all") query.filters = [{ field: "status", value: status }];
        if (debounced) query.search = { text: debounced, fields: ["code"] };
        if (date) {
            const from = startOfDay(date);
            query.from = from.toISOString();
            query.to = addDays(from, 1).toISOString();
        }
        try {
            return (await getOrders(query, restaurantId)).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [page, status, debounced, date, restaurantId]);
    const { data, loading, reload } = useAsyncData(fetcher);
    useRealtime(["order:created", "order:updated"], reload, 1000);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setStatus(v as OrderStatusEnum | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
                        {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`status.order.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    className="w-auto"
                    value={date}
                    max={toDateInput(new Date())}
                    onChange={(e) => {
                        setDate(e.target.value);
                        setPage(1);
                    }}
                />
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder={t("order.search_code")}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("order.code")}</TableHead>
                                <TableHead>{t("order.opened_at")}</TableHead>
                                <TableHead>{t("reservation.form.tables")}</TableHead>
                                <TableHead className="text-center">{t("reservation.guest_count")}</TableHead>
                                <TableHead className="text-right">{t("order.total")}</TableHead>
                                <TableHead>{t("reservation.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !data ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : (data?.orders.length ?? 0) === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {t("common.no_data")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data!.orders.map((o) => (
                                    <TableRow key={o.id} className="cursor-pointer" onClick={() => onSelect(o.id)}>
                                        <TableCell className="font-medium">{o.code}</TableCell>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(o.created_at, i18n.language)}</TableCell>
                                        <TableCell>{o.tables.map((tb) => tb.name).join(", ") || "—"}</TableCell>
                                        <TableCell className="text-center">{o.guest_count}</TableCell>
                                        <TableCell className="text-right">{formatMoney(o.total)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={ORDER_STATUS_STYLE[o.status]}>
                                                {t(`status.order.${o.status}`)}
                                            </Badge>
                                        </TableCell>
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

export default Orders;
