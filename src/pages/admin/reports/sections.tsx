import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, ClipboardList, Table2, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
    getInventoryReport,
    getOccupancyReport,
    getReportOverview,
    getRevenueReport,
    getTipsReport,
    getTopItemsReport,
} from "@/apis";
import { ChartCard, ChartLegend, ChartTooltip, EmptyChart, StatTile } from "@/components/charts/ChartKit";
import {
    AXIS_PROPS,
    BAR_RADIUS,
    GRID_PROPS,
    HBAR_RADIUS,
    SERIES_COLORS,
    formatCompact,
    formatPercent,
    formatPeriod,
} from "@/components/charts/chart-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, useAsyncData, useRealtime } from "@/hooks";
import type { IReportQuery, ReportGroupBy, RevenueBasis } from "@/interfaces";
import ExportExcelButton from "./ExportExcelButton";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHART_HEIGHT = 280;

/** Gọi API báo cáo; bỏ qua khi khoảng ngày không hợp lệ */
const useReport = <T,>(load: (q: IReportQuery) => Promise<{ data?: T }>, query: IReportQuery, valid: boolean) => {
    const fetcher = useCallback(async () => {
        if (!valid) return null;
        try {
            return (await load(query)).data ?? null;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [load, query, valid]);
    return useAsyncData(fetcher);
};

/** Màu theo nhà hàng: cố định theo thứ tự id trong danh sách chi nhánh, không theo thứ hạng doanh thu */
const useRestaurantColors = () => {
    const branches = useAppSelector((s) => s.restaurant.branches);
    return useMemo(() => {
        const ids = [...branches].map((b) => b.id).sort((a, b) => a - b);
        return (id: number) => SERIES_COLORS[ids.indexOf(id)] ?? "var(--muted-foreground)";
    }, [branches]);
};

const Loading = () => {
    const { t } = useTranslation("admin");
    return <EmptyChart text={t("common.loading")} height={CHART_HEIGHT} />;
};

// ---------------------------------------------------------------------------
// Tổng quan
// ---------------------------------------------------------------------------

export const OverviewTiles = ({ query, valid }: { query: IReportQuery; valid: boolean }) => {
    const { t } = useTranslation("admin");
    const { data, reload } = useReport(getReportOverview, query, valid);
    useRealtime(["payment:changed", "order:updated", "order:created", "table:status_changed", "reservation:changed", "inventory:changed"], reload, 1500);
    if (!data) return null;
    const { current: c, previous: p, live } = data;
    const vsHint = t("report.vs_previous");

    return (
        <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label={t("report.kpi.net_revenue")} value={formatMoney(c.net_revenue)} current={c.net_revenue} previous={p.net_revenue} hint={vsHint} />
                <StatTile label={t("report.kpi.completed_orders")} value={String(c.completed_orders)} current={c.completed_orders} previous={p.completed_orders} hint={vsHint} />
                <StatTile label={t("report.kpi.avg_order_value")} value={formatMoney(Math.round(c.avg_order_value))} current={c.avg_order_value} previous={p.avg_order_value} hint={vsHint} />
                <StatTile label={t("report.kpi.guests")} value={String(c.guests)} current={c.guests} previous={p.guests} hint={vsHint} />
                <StatTile
                    label={t("report.kpi.refunded")}
                    value={formatMoney(c.refunded)}
                    current={c.refunded}
                    previous={p.refunded}
                    invert
                    hint={vsHint}
                />
                <StatTile label={t("report.kpi.discount_total")} value={formatMoney(c.discount_total)} hint={t("report.kpi.gross_sales", { amount: formatMoney(c.gross_sales) })} />
                <StatTile
                    label={t("report.kpi.cancelled_orders")}
                    value={String(c.cancelled_orders)}
                    current={c.cancelled_orders}
                    previous={p.cancelled_orders}
                    invert
                    hint={vsHint}
                />
                <StatTile
                    label={t("report.kpi.reservations")}
                    value={String(c.reservations)}
                    hint={t("report.kpi.reservations_hint", { no_show: c.reservations_no_show, cancelled: c.reservations_cancelled })}
                />
            </div>

            <div>
                <p className="mb-2 text-sm font-medium">{t("report.live.title")}</p>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <StatTile icon={<Wallet className="h-3.5 w-3.5" />} label={t("report.live.today_revenue")} value={formatMoney(live.today_net_revenue)} />
                    <StatTile icon={<ClipboardList className="h-3.5 w-3.5" />} label={t("report.live.open_orders")} value={String(live.open_orders)} />
                    <StatTile
                        icon={<Table2 className="h-3.5 w-3.5" />}
                        label={t("report.live.occupied_tables")}
                        value={`${live.occupied_tables} / ${live.total_tables}`}
                        hint={live.total_tables ? formatPercent(live.occupied_tables / live.total_tables, 0) : undefined}
                    />
                    <StatTile icon={<CalendarClock className="h-3.5 w-3.5" />} label={t("report.live.upcoming_reservations")} value={String(live.upcoming_reservations_today)} />
                    <StatTile
                        icon={<AlertTriangle className="h-3.5 w-3.5" />}
                        label={t("report.live.low_stock")}
                        value={String(live.low_stock)}
                        hint={live.low_stock > 0 ? t("report.live.low_stock_hint") : undefined}
                    />
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Doanh thu
// ---------------------------------------------------------------------------

export const RevenueSection = ({ query, valid, compact = false }: { query: IReportQuery; valid: boolean; compact?: boolean }) => {
    const { t, i18n } = useTranslation("admin");
    // Giai đoạn 10: doanh thu theo thời điểm thanh toán (mặc định) hoặc thời điểm hoàn tất order
    const [basis, setBasis] = useState<RevenueBasis>("paid");
    const revenueQuery = useMemo(() => (compact ? query : { ...query, basis }), [query, basis, compact]);
    const { data, loading } = useReport(getRevenueReport, revenueQuery, valid);
    const colorOf = useRestaurantColors();
    const groupBy = (query.group_by ?? "day") as ReportGroupBy;
    // Xem cả chuỗi và có > 1 nhà hàng: cột chồng theo nhà hàng
    const stacked = !query.restaurant_id && (data?.by_restaurant.length ?? 0) > 1;

    const restaurants = useMemo(
        () => [...(data?.by_restaurant ?? [])].sort((a, b) => a.restaurant_id - b.restaurant_id),
        [data],
    );
    const chartData = useMemo(() => {
        if (!data) return [];
        if (!stacked) return data.series.map((p) => ({ period: p.period, net: p.net }));
        return data.series.map((p) => {
            const row: Record<string, number | string> = { period: p.period };
            for (const r of restaurants) row[`r${r.restaurant_id}`] = 0;
            for (const e of data.series_by_restaurant.filter((e) => e.period === p.period)) row[`r${e.restaurant_id}`] = e.net;
            return row;
        });
    }, [data, stacked, restaurants]);

    const money = (v: number) => formatMoney(v);
    const hasData = !!data && data.series.some((p) => p.net !== 0 || p.orders > 0);

    const trend = (
        <ChartCard
            title={t("report.revenue.title")}
            description={data ? t("report.revenue.total", { amount: formatMoney(data.totals.net), orders: data.totals.orders }) : undefined}
        >
            {loading && !data ? (
                <Loading />
            ) : !hasData ? (
                <EmptyChart text={t("report.no_data")} height={CHART_HEIGHT} />
            ) : (
                <>
                    {stacked && <ChartLegend items={restaurants.map((r) => ({ label: r.restaurant_name, color: colorOf(r.restaurant_id) }))} />}
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                        <BarChart data={chartData} barCategoryGap="20%">
                            <CartesianGrid {...GRID_PROPS} />
                            <XAxis dataKey="period" {...AXIS_PROPS} tickFormatter={(v) => formatPeriod(v, groupBy)} minTickGap={12} />
                            <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v) => formatCompact(v, i18n.language)} />
                            <Tooltip
                                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                                content={<ChartTooltip labelFormatter={(l) => formatPeriod(l, groupBy)} valueFormatter={money} />}
                            />
                            {stacked ? (
                                restaurants.map((r, i) => (
                                    <Bar
                                        key={r.restaurant_id}
                                        dataKey={`r${r.restaurant_id}`}
                                        name={r.restaurant_name}
                                        stackId="net"
                                        fill={colorOf(r.restaurant_id)}
                                        stroke="var(--card)"
                                        strokeWidth={1}
                                        maxBarSize={40}
                                        radius={i === restaurants.length - 1 ? BAR_RADIUS : undefined}
                                    />
                                ))
                            ) : (
                                <Bar dataKey="net" name={t("report.revenue.net")} fill={SERIES_COLORS[0]} radius={BAR_RADIUS} maxBarSize={40} />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </>
            )}
        </ChartCard>
    );

    if (compact) return trend;

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Select value={basis} onValueChange={(v) => setBasis(v as RevenueBasis)}>
                        <SelectTrigger className="w-64" aria-label={t("report.revenue.basis")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paid">{t("report.revenue.basis_paid")}</SelectItem>
                            <SelectItem value="completed">{t("report.revenue.basis_completed")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">{t(`report.revenue.basis_${basis}_hint`)}</span>
                </div>
                <ExportExcelButton
                    title={`${t("report.tab.revenue")} (${t(`report.revenue.basis_${basis}`)})`}
                    fileKey="doanh-thu"
                    query={query}
                    disabled={!data}
                    sheets={() => [
                        {
                            name: t("report.revenue.table"),
                            columns: [
                                { header: t("report.period"), value: (p: NonNullable<typeof data>["series"][number]) => p.period },
                                { header: t("report.revenue.collected"), value: (p: NonNullable<typeof data>["series"][number]) => p.collected, type: "money" },
                                { header: t("report.revenue.refunded"), value: (p: NonNullable<typeof data>["series"][number]) => p.refunded, type: "money" },
                                { header: t("report.revenue.net"), value: (p: NonNullable<typeof data>["series"][number]) => p.net, type: "money" },
                                { header: t("report.revenue.orders"), value: (p: NonNullable<typeof data>["series"][number]) => p.orders, type: "number" },
                                { header: t("report.revenue.guests"), value: (p: NonNullable<typeof data>["series"][number]) => p.guests, type: "number" },
                            ],
                            rows: data?.series ?? [],
                        },
                        {
                            name: t("report.revenue.by_restaurant"),
                            columns: [
                                { header: t("report.restaurant"), value: (r: { restaurant_name: string }) => r.restaurant_name, width: 30 },
                                { header: t("report.revenue.net"), value: (r: { net: number }) => r.net, type: "money" },
                                { header: t("report.revenue.orders"), value: (r: { orders: number }) => r.orders, type: "number" },
                            ],
                            rows: data?.by_restaurant ?? [],
                        },
                        {
                            name: t("report.revenue.by_method"),
                            columns: [
                                { header: t("report.revenue.method"), value: (m: { method: string }) => t(`cashier.method.${m.method}`) },
                                { header: t("report.revenue.collected"), value: (m: { collected: number }) => m.collected, type: "money" },
                                { header: t("report.revenue.refunded"), value: (m: { refunded: number }) => m.refunded, type: "money" },
                                { header: t("report.revenue.net"), value: (m: { net: number }) => m.net, type: "money" },
                            ],
                            rows: data?.by_method ?? [],
                        },
                    ]}
                />
            </div>
            {trend}
            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title={t("report.revenue.by_method")}>
                    {!data?.by_method.length ? (
                        <EmptyChart text={t("report.no_data")} height={180} />
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(120, data.by_method.length * 52)}>
                            <BarChart
                                layout="vertical"
                                data={data.by_method.map((m) => ({ ...m, label: t(`cashier.method.${m.method}`) }))}
                                barCategoryGap="25%"
                            >
                                <CartesianGrid {...GRID_PROPS} vertical horizontal={false} />
                                <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v) => formatCompact(v, i18n.language)} />
                                <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={96} />
                                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip valueFormatter={money} />} />
                                <Bar dataKey="net" name={t("report.revenue.net")} fill={SERIES_COLORS[0]} radius={HBAR_RADIUS} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
                <ChartCard title={t("report.revenue.by_restaurant")}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("report.restaurant")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.net")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.orders")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(data?.by_restaurant ?? []).map((r) => (
                                <TableRow key={r.restaurant_id}>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-2">
                                            {stacked && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(r.restaurant_id) }} />}
                                            {r.restaurant_name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.net)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                                </TableRow>
                            ))}
                            {!data?.by_restaurant.length && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                        {t("report.no_data")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ChartCard>
            </div>
            {/* Bảng số liệu (thay cho đọc biểu đồ) */}
            <ChartCard title={t("report.revenue.table")}>
                <div className="max-h-96 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("report.period")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.collected")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.refunded")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.net")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.orders")}</TableHead>
                                <TableHead className="text-right">{t("report.revenue.guests")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...(data?.series ?? [])].reverse().map((p) => (
                                <TableRow key={p.period}>
                                    <TableCell>{groupBy === "week" ? t("report.week_of", { date: formatPeriod(p.period) }) : formatPeriod(p.period, groupBy)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(p.collected)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{p.refunded ? formatMoney(p.refunded) : "—"}</TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.net)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{p.orders}</TableCell>
                                    <TableCell className="text-right tabular-nums">{p.guests}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </ChartCard>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Món bán chạy
// ---------------------------------------------------------------------------

export const TopItemsSection = ({ query, valid, compact = false }: { query: IReportQuery; valid: boolean; compact?: boolean }) => {
    const { t } = useTranslation("admin");
    const [category, setCategory] = useState<"all" | "food" | "drink">("all");
    const q = useMemo(
        () => ({ ...query, limit: compact ? 5 : 10, ...(category !== "all" ? { category } : {}) }),
        [query, compact, category],
    );
    const { data, loading } = useReport(getTopItemsReport, q, valid);

    const chart = (items: { name: string; quantity: number; revenue: number }[]) =>
        loading && !data ? (
            <Loading />
        ) : !items.length ? (
            <EmptyChart text={t("report.no_data")} height={160} />
        ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, items.length * 36)}>
                <BarChart layout="vertical" data={items} barCategoryGap="25%">
                    <CartesianGrid {...GRID_PROPS} vertical horizontal={false} />
                    <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={compact ? 120 : 160} />
                    <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                        content={
                            <ChartTooltip
                                valueFormatter={(v, row) => `${v} · ${formatMoney(Number((row.payload as { revenue?: number })?.revenue ?? 0))}`}
                            />
                        }
                    />
                    <Bar dataKey="quantity" name={t("report.top.quantity")} fill={SERIES_COLORS[0]} radius={HBAR_RADIUS} maxBarSize={22} />
                </BarChart>
            </ResponsiveContainer>
        );

    const table = (items: { id: number; name: string; quantity: number; revenue: number; order_count: number }[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t("report.top.name")}</TableHead>
                    <TableHead className="text-right">{t("report.top.quantity")}</TableHead>
                    <TableHead className="text-right">{t("report.top.orders")}</TableHead>
                    <TableHead className="text-right">{t("report.top.revenue")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, i) => (
                    <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.order_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(item.revenue)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const filter = (
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
            <SelectTrigger className="h-8 w-36" aria-label={t("menu.category_label")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t("menu.all_categories")}</SelectItem>
                <SelectItem value="food">{t("menu.category.food")}</SelectItem>
                <SelectItem value="drink">{t("menu.category.drink")}</SelectItem>
            </SelectContent>
        </Select>
    );

    if (compact) {
        return (
            <ChartCard title={t("report.top.title")} description={t("report.top.by_quantity")}>
                {chart(data?.dishes ?? [])}
            </ChartCard>
        );
    }

    const topColumns = [
        { header: t("report.top.name"), value: (i: { name: string }) => i.name, width: 30 },
        { header: t("report.top.quantity"), value: (i: { quantity: number }) => i.quantity, type: "number" as const },
        { header: t("report.top.orders"), value: (i: { order_count: number }) => i.order_count, type: "number" as const },
        { header: t("report.top.revenue"), value: (i: { revenue: number }) => i.revenue, type: "money" as const },
    ];

    return (
        <Tabs defaultValue="dishes">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                    <TabsTrigger value="dishes">{t("report.top.dishes")}</TabsTrigger>
                    <TabsTrigger value="combos" disabled={category !== "all"}>
                        {t("report.top.combos")}
                    </TabsTrigger>
                </TabsList>
                <ExportExcelButton
                    title={t("report.tab.top")}
                    fileKey="mon-ban-chay"
                    query={query}
                    disabled={!data}
                    sheets={() => [
                        { name: t("report.top.dishes"), columns: topColumns, rows: data?.dishes ?? [] },
                        { name: t("report.top.combos"), columns: topColumns, rows: data?.combos ?? [] },
                    ]}
                />
            </div>
            <TabsContent value="dishes" className="grid gap-4 lg:grid-cols-2">
                <ChartCard title={t("report.top.title")} description={t("report.top.by_quantity")} actions={filter}>
                    {chart(data?.dishes ?? [])}
                </ChartCard>
                <ChartCard title={t("report.top.table")}>{table(data?.dishes ?? [])}</ChartCard>
            </TabsContent>
            <TabsContent value="combos" className="grid gap-4 lg:grid-cols-2">
                <ChartCard title={t("report.top.combos")} description={t("report.top.by_quantity")}>
                    {chart(data?.combos ?? [])}
                </ChartCard>
                <ChartCard title={t("report.top.table")}>{table(data?.combos ?? [])}</ChartCard>
            </TabsContent>
        </Tabs>
    );
};

// ---------------------------------------------------------------------------
// Lấp đầy bàn
// ---------------------------------------------------------------------------

export const OccupancySection = ({ query, valid }: { query: IReportQuery; valid: boolean }) => {
    const { t } = useTranslation("admin");
    const { data, loading } = useReport(getOccupancyReport, query, valid);
    const branches = useAppSelector((s) => s.restaurant.branches);
    const restaurantName = (id: number) => branches.find((b) => b.id === id)?.name ?? `#${id}`;

    if (loading && !data) return <Loading />;
    if (!data) return null;
    const s = data.summary;
    const hours = data.by_hour.map((h) => ({ ...h, label: `${String(h.hour).padStart(2, "0")}h`, pct: (h.avg_occupancy ?? 0) * 100 }));

    return (
        <div className="grid gap-4">
            <div className="flex justify-end">
                <ExportExcelButton
                    title={t("report.tab.occupancy")}
                    fileKey="lap-day-ban"
                    query={query}
                    sheets={() => [
                        {
                            name: t("report.occupancy.by_room"),
                            columns: [
                                { header: t("report.restaurant"), value: (r: (typeof data.by_room)[number]) => restaurantName(r.restaurant_id), width: 26 },
                                { header: t("report.occupancy.room"), value: (r: (typeof data.by_room)[number]) => r.room_name, width: 20 },
                                { header: t("report.occupancy.table_count"), value: (r: (typeof data.by_room)[number]) => r.table_count, type: "number" },
                                { header: t("report.occupancy.sessions"), value: (r: (typeof data.by_room)[number]) => r.sessions, type: "number" },
                                { header: t("report.occupancy.occupied_hours"), value: (r: (typeof data.by_room)[number]) => r.occupied_hours, type: "quantity" },
                                { header: t("report.occupancy.available_hours"), value: (r: (typeof data.by_room)[number]) => r.available_hours, type: "quantity" },
                                { header: t("report.occupancy.outside_hours"), value: (r: (typeof data.by_room)[number]) => r.outside_hours, type: "quantity" },
                                { header: t("report.occupancy.rate"), value: (r: (typeof data.by_room)[number]) => r.occupancy_rate, type: "percent" },
                            ],
                            rows: data.by_room,
                        },
                        {
                            name: t("report.occupancy.by_hour"),
                            columns: [
                                { header: t("report.occupancy.hour"), value: (h: (typeof data.by_hour)[number]) => `${String(h.hour).padStart(2, "0")}:00` },
                                { header: t("report.occupancy.occupied_hours"), value: (h: (typeof data.by_hour)[number]) => h.occupied_hours, type: "quantity" },
                                { header: t("report.occupancy.avg"), value: (h: (typeof data.by_hour)[number]) => h.avg_occupancy, type: "percent" },
                            ],
                            rows: data.by_hour,
                        },
                    ]}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label={t("report.occupancy.rate")} value={formatPercent(s.occupancy_rate)} hint={t("report.occupancy.rate_hint")} />
                <StatTile
                    label={t("report.occupancy.occupied_hours")}
                    value={formatQty(s.occupied_hours)}
                    hint={t("report.occupancy.of_available", { hours: formatQty(s.available_hours) })}
                />
                <StatTile
                    label={t("report.occupancy.sessions")}
                    value={String(s.sessions)}
                    hint={
                        data.closed_days > 0
                            ? t("report.occupancy.days_closed", { count: data.days, closed: data.closed_days })
                            : t("report.occupancy.days", { count: data.days })
                    }
                />
                <StatTile label={t("report.occupancy.turnover")} value={s.turnover === null ? "—" : formatQty(s.turnover)} hint={t("report.occupancy.tables", { count: s.table_count })} />
            </div>

            <ChartCard title={t("report.occupancy.by_hour")} description={t("report.occupancy.by_hour_hint")}>
                {s.sessions === 0 ? (
                    <EmptyChart text={t("report.no_data")} height={CHART_HEIGHT} />
                ) : (
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                        <BarChart data={hours} barCategoryGap="15%">
                            <CartesianGrid {...GRID_PROPS} />
                            <XAxis dataKey="label" {...AXIS_PROPS} interval={1} />
                            <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v) => `${Number(v).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`} />
                            <Tooltip
                                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                                content={<ChartTooltip valueFormatter={(v) => `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`} />}
                            />
                            <Bar dataKey="pct" name={t("report.occupancy.avg")} fill={SERIES_COLORS[0]} radius={BAR_RADIUS} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            <ChartCard title={t("report.occupancy.by_room")}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {!query.restaurant_id && <TableHead>{t("report.restaurant")}</TableHead>}
                            <TableHead>{t("report.occupancy.room")}</TableHead>
                            <TableHead className="text-right">{t("report.occupancy.table_count")}</TableHead>
                            <TableHead className="text-right">{t("report.occupancy.sessions")}</TableHead>
                            <TableHead className="text-right">{t("report.occupancy.occupied_hours")}</TableHead>
                            <TableHead className="w-48">{t("report.occupancy.rate")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.by_room.map((room) => (
                            <TableRow key={room.room_id}>
                                {!query.restaurant_id && <TableCell>{restaurantName(room.restaurant_id)}</TableCell>}
                                <TableCell>{room.room_name}</TableCell>
                                <TableCell className="text-right tabular-nums">{room.table_count}</TableCell>
                                <TableCell className="text-right tabular-nums">{room.sessions}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatQty(room.occupied_hours)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${Math.min(100, (room.occupancy_rate ?? 0) * 100)}%`, background: SERIES_COLORS[0] }}
                                            />
                                        </div>
                                        <span className="w-14 text-right text-xs tabular-nums">{formatPercent(room.occupancy_rate)}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <p className="mt-3 text-xs text-muted-foreground">
                    {data.by_restaurant
                        .map((r) => t("report.occupancy.hours_of", { name: r.restaurant_name, open: r.open_time, close: r.close_time }))
                        .join(" · ")}
                </p>
                {s.outside_hours > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t("report.occupancy.outside_note", { hours: formatQty(s.outside_hours) })}
                    </p>
                )}
            </ChartCard>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Kho
// ---------------------------------------------------------------------------

export const InventorySection = ({ query, valid }: { query: IReportQuery; valid: boolean }) => {
    const { t, i18n } = useTranslation("admin");
    const { data, loading } = useReport(getInventoryReport, query, valid);
    const groupBy = (query.group_by ?? "day") as ReportGroupBy;

    if (loading && !data) return <Loading />;
    if (!data) return null;
    const hasData = data.series.some((p) => p.receipts > 0);
    const series = [
        { key: "import_value", label: t("report.inventory.import"), color: SERIES_COLORS[0] },
        { key: "export_value", label: t("report.inventory.export"), color: SERIES_COLORS[1] },
    ];

    return (
        <div className="grid gap-4">
            <div className="flex justify-end">
                <ExportExcelButton
                    title={t("report.tab.inventory")}
                    fileKey="nhap-kho"
                    query={query}
                    sheets={() => [
                        {
                            name: t("report.inventory.title"),
                            columns: [
                                { header: t("report.period"), value: (p: (typeof data.series)[number]) => p.period },
                                { header: t("report.inventory.import"), value: (p: (typeof data.series)[number]) => p.import_value, type: "money" },
                                { header: t("report.inventory.export"), value: (p: (typeof data.series)[number]) => p.export_value, type: "money" },
                                { header: t("report.inventory.adjust_value"), value: (p: (typeof data.series)[number]) => p.adjust_value, type: "money" },
                                { header: t("report.inventory.receipt_count"), value: (p: (typeof data.series)[number]) => p.receipts, type: "number" },
                            ],
                            rows: data.series,
                        },
                        {
                            name: t("report.inventory.top_ingredients"),
                            columns: [
                                { header: t("inventory.ingredient"), value: (i: (typeof data.top_ingredients)[number]) => i.name, width: 28 },
                                { header: t("inventory.unit"), value: (i: (typeof data.top_ingredients)[number]) => i.unit },
                                { header: t("inventory.quantity"), value: (i: (typeof data.top_ingredients)[number]) => i.quantity, type: "quantity" },
                                { header: t("report.inventory.value"), value: (i: (typeof data.top_ingredients)[number]) => i.value, type: "money" },
                            ],
                            rows: data.top_ingredients,
                        },
                        {
                            name: t("report.inventory.by_supplier"),
                            columns: [
                                { header: t("report.inventory.supplier"), value: (x: (typeof data.by_supplier)[number]) => x.supplier ?? "—", width: 28 },
                                { header: t("report.inventory.receipt_count"), value: (x: (typeof data.by_supplier)[number]) => x.receipts, type: "number" },
                                { header: t("report.inventory.value"), value: (x: (typeof data.by_supplier)[number]) => x.value, type: "money" },
                            ],
                            rows: data.by_supplier,
                        },
                    ]}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label={t("report.inventory.import_value")} value={formatMoney(data.totals.import_value)} hint={t("report.inventory.receipts", { count: data.totals.import_receipts })} />
                <StatTile label={t("report.inventory.export_value")} value={formatMoney(data.totals.export_value)} />
                <StatTile
                    label={t("report.inventory.adjust_value")}
                    value={formatMoney(data.totals.adjust_value)}
                    hint={t("report.inventory.adjust_hint")}
                />
                <StatTile label={t("report.inventory.suppliers")} value={String(data.by_supplier.filter((s) => s.supplier).length)} />
            </div>

            <ChartCard title={t("report.inventory.title")}>
                {!hasData ? (
                    <EmptyChart text={t("report.no_data")} height={CHART_HEIGHT} />
                ) : (
                    <>
                        <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart data={data.series} barCategoryGap="20%" barGap={2}>
                                <CartesianGrid {...GRID_PROPS} />
                                <XAxis dataKey="period" {...AXIS_PROPS} tickFormatter={(v) => formatPeriod(v, groupBy)} minTickGap={12} />
                                <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v) => formatCompact(v, i18n.language)} />
                                <Tooltip
                                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                                    content={<ChartTooltip labelFormatter={(l) => formatPeriod(l, groupBy)} valueFormatter={(v) => formatMoney(v)} />}
                                />
                                {series.map((s) => (
                                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={BAR_RADIUS} maxBarSize={24} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </>
                )}
            </ChartCard>

            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title={t("report.inventory.top_ingredients")}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("inventory.ingredient")}</TableHead>
                                <TableHead className="text-right">{t("inventory.quantity")}</TableHead>
                                <TableHead className="text-right">{t("report.inventory.value")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.top_ingredients.map((i) => (
                                <TableRow key={i.ingredient_id}>
                                    <TableCell>{i.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatQty(i.quantity)} <span className="text-xs text-muted-foreground">{i.unit}</span>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(i.value)}</TableCell>
                                </TableRow>
                            ))}
                            {!data.top_ingredients.length && <EmptyRow cols={3} />}
                        </TableBody>
                    </Table>
                </ChartCard>
                <ChartCard title={t("report.inventory.by_supplier")}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("report.inventory.supplier")}</TableHead>
                                <TableHead className="text-right">{t("report.inventory.receipt_count")}</TableHead>
                                <TableHead className="text-right">{t("report.inventory.value")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.by_supplier.map((s) => (
                                <TableRow key={s.supplier ?? "-"}>
                                    <TableCell className={cn(!s.supplier && "text-muted-foreground italic")}>{s.supplier ?? t("report.inventory.no_supplier")}</TableCell>
                                    <TableCell className="text-right tabular-nums">{s.receipts}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(s.value)}</TableCell>
                                </TableRow>
                            ))}
                            {!data.by_supplier.length && <EmptyRow cols={3} />}
                        </TableBody>
                    </Table>
                </ChartCard>
            </div>
        </div>
    );
};

/** Tiền tip theo kỳ và theo nhân viên nhận (ghi riêng, không tính vào doanh thu) */
export const TipsSection = ({ query, valid }: { query: IReportQuery; valid: boolean }) => {
    const { t, i18n } = useTranslation("admin");
    const { data, loading } = useReport(getTipsReport, query, valid);
    const groupBy = (query.group_by ?? "day") as ReportGroupBy;

    if (loading && !data) return <Loading />;
    if (!data) return null;
    const hasData = data.total > 0;
    const payments = data.by_staff.reduce((s, x) => s + x.payments, 0);

    return (
        <div className="grid gap-4">
            <div className="flex justify-end">
                <ExportExcelButton
                    title={t("report.tab.tips")}
                    fileKey="tien-tip"
                    query={query}
                    disabled={!hasData}
                    sheets={() => [
                        {
                            name: t("report.tips.by_staff"),
                            columns: [
                                { header: t("report.tips.staff"), value: (s: (typeof data.by_staff)[number]) => s.full_name ?? t("report.tips.unassigned"), width: 28 },
                                { header: t("report.tips.orders"), value: (s: (typeof data.by_staff)[number]) => s.orders, type: "number" },
                                { header: t("report.tips.payments"), value: (s: (typeof data.by_staff)[number]) => s.payments, type: "number" },
                                { header: t("report.tips.total"), value: (s: (typeof data.by_staff)[number]) => s.tip_total, type: "money" },
                            ],
                            rows: data.by_staff,
                        },
                        {
                            name: t("report.tips.title"),
                            columns: [
                                { header: t("report.period"), value: (p: (typeof data.series)[number]) => p.period },
                                { header: t("report.tips.total"), value: (p: (typeof data.series)[number]) => p.tip_total, type: "money" },
                            ],
                            rows: data.series,
                        },
                    ]}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile label={t("report.tips.total")} value={formatMoney(data.total)} hint={t("report.tips.not_revenue")} />
                <StatTile label={t("report.tips.payments")} value={String(payments)} />
                <StatTile label={t("report.tips.staff_count")} value={String(data.by_staff.filter((s) => s.staff_id).length)} />
            </div>

            <ChartCard title={t("report.tips.title")}>
                {!hasData ? (
                    <EmptyChart text={t("report.no_data")} height={CHART_HEIGHT} />
                ) : (
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                        <BarChart data={data.series} barCategoryGap="20%">
                            <CartesianGrid {...GRID_PROPS} />
                            <XAxis dataKey="period" {...AXIS_PROPS} tickFormatter={(v) => formatPeriod(v, groupBy)} minTickGap={12} />
                            <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v) => formatCompact(v, i18n.language)} />
                            <Tooltip
                                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                                content={<ChartTooltip labelFormatter={(l) => formatPeriod(l, groupBy)} valueFormatter={(v) => formatMoney(v)} />}
                            />
                            <Bar dataKey="tip_total" name={t("report.tips.total")} fill={SERIES_COLORS[0]} radius={BAR_RADIUS} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            <ChartCard title={t("report.tips.by_staff")}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("report.tips.staff")}</TableHead>
                            <TableHead className="text-right">{t("report.tips.orders")}</TableHead>
                            <TableHead className="text-right">{t("report.tips.payments")}</TableHead>
                            <TableHead className="text-right">{t("report.tips.total")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.by_staff.map((s) => (
                            <TableRow key={s.staff_id ?? "none"}>
                                <TableCell>{s.staff_id ? s.full_name || `#${s.staff_id}` : t("report.tips.unassigned")}</TableCell>
                                <TableCell className="text-right tabular-nums">{s.orders}</TableCell>
                                <TableCell className="text-right tabular-nums">{s.payments}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatMoney(s.tip_total)}</TableCell>
                            </TableRow>
                        ))}
                        {!data.by_staff.length && <EmptyRow cols={4} />}
                    </TableBody>
                </Table>
            </ChartCard>
        </div>
    );
};

const EmptyRow = ({ cols }: { cols: number }) => {
    const { t } = useTranslation("admin");
    return (
        <TableRow>
            <TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">
                {t("report.no_data")}
            </TableCell>
        </TableRow>
    );
};

/** Thông báo cho người không có quyền xem báo cáo */
export const NoReportAccess = ({ text }: { text: string }) => (
    <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{text}</CardContent>
    </Card>
);
