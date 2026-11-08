import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getProfitReport, getVarianceReport } from "@/apis";
import { ChartCard, ChartLegend, ChartTooltip, EmptyChart, StatTile } from "@/components/charts/ChartKit";
import { AXIS_PROPS, BAR_RADIUS, GRID_PROPS, SERIES_COLORS, formatCompact, formatPercent, formatPeriod } from "@/components/charts/chart-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData } from "@/hooks";
import type { ILaborCost, IProfitTotals, IReportQuery, ReportGroupBy } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import type { IExcelColumn } from "@/lib/excel";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import ExportExcelButton from "./ExportExcelButton";

const CHART_HEIGHT = 280;

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

const Loading = () => {
    const { t } = useTranslation("admin");
    return <p className="py-10 text-center text-muted-foreground">{t("common.loading")}</p>;
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

/** Các cột số liệu lãi gộp dùng chung cho bảng và file Excel */
const useProfitColumns = <T extends IProfitTotals>(): IExcelColumn<T>[] => {
    const { t } = useTranslation("admin");
    return [
        { header: t("report.profit.quantity"), value: (r) => r.quantity, type: "number" },
        { header: t("report.profit.sales"), value: (r) => r.sales, type: "money" },
        { header: t("report.profit.cost"), value: (r) => r.cost, type: "money" },
        { header: t("report.profit.gross_profit"), value: (r) => r.gross_profit, type: "money" },
        { header: t("report.profit.food_cost_rate"), value: (r) => r.food_cost_rate, type: "percent" },
        { header: t("report.profit.uncosted_sales"), value: (r) => r.uncosted_sales, type: "money" },
    ];
};

/** Giá vốn, lãi gộp, tỷ lệ food cost (giai đoạn 10) */
export const ProfitSection = ({ query, valid }: { query: IReportQuery; valid: boolean }) => {
    const { t, i18n } = useTranslation("admin");
    const profitQuery = useMemo(() => ({ ...query, limit: 50 }), [query]);
    const { data, loading } = useReport(getProfitReport, profitQuery, valid);
    const groupBy = (query.group_by ?? "day") as ReportGroupBy;
    const columns = useProfitColumns();

    if (loading && !data) return <Loading />;
    if (!data) return null;
    const totals = data.totals;
    const hasData = totals.sales > 0 || totals.labor_cost > 0;
    const laborColumns: IExcelColumn<ILaborCost>[] = [
        { header: t("report.profit.labor_cost"), value: (r) => r.labor_cost, type: "money" },
        { header: t("report.profit.net_profit"), value: (r) => r.net_profit, type: "money" },
    ];
    const draftPayrolls = data.payrolls.filter((p) => p.status === "draft").length;
    const series = [
        { key: "cost", label: t("report.profit.cost"), color: SERIES_COLORS[1] },
        { key: "gross_profit", label: t("report.profit.gross_profit"), color: SERIES_COLORS[0] },
    ];
    const categoryName = (c: string) => (c === "combo" ? t("menu.tab_combos") : t(`menu.category.${c}`));

    return (
        <div className="grid gap-4">
            <div className="flex justify-end">
                <ExportExcelButton
                    title={t("report.tab.profit")}
                    fileKey="lai-gop"
                    query={query}
                    disabled={!hasData}
                    sheets={() => [
                        {
                            name: t("report.profit.by_period"),
                            columns: [{ header: t("report.period"), value: (r: { period: string }) => r.period }, ...columns, ...laborColumns],
                            rows: data.series,
                        },
                        {
                            name: t("report.profit.by_item"),
                            columns: [
                                { header: t("report.profit.item"), value: (r: { name: string }) => r.name, width: 30 },
                                { header: t("recipe.category"), value: (r: { category: string }) => categoryName(r.category) },
                                ...columns,
                            ],
                            rows: data.by_item,
                        },
                        {
                            name: t("report.profit.by_category"),
                            columns: [{ header: t("recipe.category"), value: (r: { category: string }) => categoryName(r.category) }, ...columns],
                            rows: data.by_category,
                        },
                        {
                            name: t("report.profit.by_restaurant"),
                            columns: [
                                { header: t("report.restaurant"), value: (r: { restaurant_name: string }) => r.restaurant_name, width: 30 },
                                ...columns,
                                ...laborColumns,
                            ],
                            rows: data.by_restaurant,
                        },
                    ]}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label={t("report.profit.sales")} value={formatMoney(totals.sales)} hint={t("report.profit.sales_hint")} />
                <StatTile label={t("report.profit.cost")} value={formatMoney(totals.cost)} />
                <StatTile label={t("report.profit.gross_profit")} value={formatMoney(totals.gross_profit)} />
                <StatTile
                    label={t("report.profit.food_cost_rate")}
                    value={formatPercent(totals.food_cost_rate)}
                    hint={totals.uncosted_sales > 0 ? t("report.profit.uncosted_hint", { amount: formatMoney(totals.uncosted_sales) }) : undefined}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label={t("report.profit.labor_cost")}
                    value={formatMoney(totals.labor_cost)}
                    hint={
                        !data.payrolls.length
                            ? t("report.profit.labor_none")
                            : draftPayrolls
                              ? t("report.profit.labor_draft", { count: draftPayrolls })
                              : t("report.profit.labor_hint")
                    }
                />
                <StatTile label={t("report.profit.net_profit")} value={formatMoney(totals.net_profit)} hint={t("report.profit.net_profit_hint")} />
            </div>

            <ChartCard title={t("report.profit.title")} description={t("report.profit.chart_hint")}>
                {!hasData ? (
                    <EmptyChart text={t("report.no_data")} height={CHART_HEIGHT} />
                ) : (
                    <>
                        <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart data={data.series} barCategoryGap="20%">
                                <CartesianGrid {...GRID_PROPS} />
                                <XAxis dataKey="period" {...AXIS_PROPS} tickFormatter={(v) => formatPeriod(v, groupBy)} minTickGap={12} />
                                <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v) => formatCompact(v, i18n.language)} />
                                <Tooltip
                                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                                    content={<ChartTooltip labelFormatter={(l) => formatPeriod(l, groupBy)} valueFormatter={(v) => formatMoney(v)} />}
                                />
                                {/* Cột chồng: giá vốn + lãi gộp = doanh số */}
                                {series.map((s, i) => (
                                    <Bar
                                        key={s.key}
                                        dataKey={s.key}
                                        name={s.label}
                                        stackId="sales"
                                        fill={s.color}
                                        radius={i === series.length - 1 ? BAR_RADIUS : undefined}
                                        maxBarSize={28}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </>
                )}
            </ChartCard>

            <ChartCard title={t("report.profit.by_item")} description={t("report.profit.by_item_hint")}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("report.profit.item")}</TableHead>
                            <TableHead className="text-right">{t("report.profit.quantity")}</TableHead>
                            <TableHead className="text-right">{t("report.profit.sales")}</TableHead>
                            <TableHead className="text-right">{t("report.profit.cost")}</TableHead>
                            <TableHead className="text-right">{t("report.profit.gross_profit")}</TableHead>
                            <TableHead className="text-right">{t("report.profit.food_cost_rate")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.by_item.map((r) => (
                            <TableRow key={`${r.kind}-${r.item_id}`}>
                                <TableCell>
                                    {r.name}
                                    <span className="ml-1 text-xs text-muted-foreground">· {categoryName(r.category)}</span>
                                    {r.missing_cost && (
                                        <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-600" aria-label={t("recipe.no_recipe")} />
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatMoney(r.sales)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatMoney(r.cost)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatMoney(r.gross_profit)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatPercent(r.food_cost_rate)}</TableCell>
                            </TableRow>
                        ))}
                        {!data.by_item.length && <EmptyRow cols={6} />}
                    </TableBody>
                </Table>
            </ChartCard>

            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title={t("report.profit.by_category")}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("recipe.category")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.sales")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.gross_profit")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.food_cost_rate")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.by_category.map((r) => (
                                <TableRow key={r.category}>
                                    <TableCell>{categoryName(r.category)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.sales)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.gross_profit)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatPercent(r.food_cost_rate)}</TableCell>
                                </TableRow>
                            ))}
                            {!data.by_category.length && <EmptyRow cols={4} />}
                        </TableBody>
                    </Table>
                </ChartCard>
                <ChartCard title={t("report.profit.by_restaurant")}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("report.restaurant")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.sales")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.gross_profit")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.labor_cost")}</TableHead>
                                <TableHead className="text-right">{t("report.profit.net_profit")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.by_restaurant.map((r) => (
                                <TableRow key={r.restaurant_id}>
                                    <TableCell>{r.restaurant_name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.sales)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.gross_profit)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.labor_cost)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatMoney(r.net_profit)}</TableCell>
                                </TableRow>
                            ))}
                            {!data.by_restaurant.length && <EmptyRow cols={5} />}
                        </TableBody>
                    </Table>
                </ChartCard>
            </div>
            <p className="text-xs text-muted-foreground">{t("report.profit.footer")}</p>
        </div>
    );
};

/** Tiêu hao lý thuyết theo định lượng so với kiểm kê thực tế (hao hụt) */
export const VarianceSection = ({ query, valid }: { query: IReportQuery; valid: boolean }) => {
    const { t } = useTranslation("admin");
    const { data, loading } = useReport(getVarianceReport, query, valid);

    if (loading && !data) return <Loading />;
    if (!data) return null;
    const qty = (v: number, unit: string) => `${formatQty(v)} ${unit}`;

    return (
        <div className="grid gap-4">
            <div className="flex justify-end">
                <ExportExcelButton
                    title={t("report.tab.variance")}
                    fileKey="hao-hut"
                    query={query}
                    disabled={!data.items.length}
                    sheets={() => [
                        {
                            name: t("report.tab.variance"),
                            columns: [
                                { header: t("inventory.ingredient"), value: (r: (typeof data.items)[number]) => r.name, width: 28 },
                                { header: t("inventory.unit"), value: (r: (typeof data.items)[number]) => r.unit },
                                { header: t("report.variance.consumed"), value: (r: (typeof data.items)[number]) => r.consumed, type: "quantity" },
                                { header: t("report.variance.consumed_value"), value: (r: (typeof data.items)[number]) => r.consumed_value, type: "money" },
                                { header: t("report.variance.exported"), value: (r: (typeof data.items)[number]) => r.exported, type: "quantity" },
                                { header: t("report.variance.adjusted"), value: (r: (typeof data.items)[number]) => r.adjusted, type: "quantity" },
                                { header: t("report.variance.adjusted_value"), value: (r: (typeof data.items)[number]) => r.adjusted_value, type: "money" },
                                { header: t("report.variance.loss_rate"), value: (r: (typeof data.items)[number]) => r.loss_rate, type: "percent" },
                            ],
                            rows: data.items,
                        },
                    ]}
                />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label={t("report.variance.consumed_value")} value={formatMoney(data.totals.consumed_value)} hint={t("report.variance.consumed_hint")} />
                <StatTile label={t("report.variance.exported_value")} value={formatMoney(data.totals.exported_value)} />
                <StatTile label={t("report.variance.adjusted_value")} value={formatMoney(data.totals.adjusted_value)} />
                <StatTile label={t("report.variance.loss_value")} value={formatMoney(data.totals.loss_value)} hint={t("report.variance.loss_hint")} />
            </div>
            <ChartCard title={t("report.variance.title")} description={t("report.variance.description")}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("inventory.ingredient")}</TableHead>
                            <TableHead className="text-right">{t("report.variance.consumed")}</TableHead>
                            <TableHead className="text-right">{t("report.variance.exported")}</TableHead>
                            <TableHead className="text-right">{t("report.variance.adjusted")}</TableHead>
                            <TableHead className="text-right">{t("report.variance.adjusted_value")}</TableHead>
                            <TableHead className="text-right">{t("report.variance.loss_rate")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.items.map((r) => (
                            <TableRow key={r.ingredient_id}>
                                <TableCell>{r.name}</TableCell>
                                <TableCell className="text-right tabular-nums">{qty(r.consumed, r.unit)}</TableCell>
                                <TableCell className="text-right tabular-nums">{qty(r.exported, r.unit)}</TableCell>
                                <TableCell className={cn("text-right tabular-nums", r.adjusted < 0 && "text-destructive")}>
                                    {qty(r.adjusted, r.unit)}
                                </TableCell>
                                <TableCell className={cn("text-right tabular-nums", r.adjusted_value < 0 && "text-destructive")}>
                                    {formatMoney(r.adjusted_value)}
                                </TableCell>
                                <TableCell className={cn("text-right tabular-nums", (r.loss_rate ?? 0) >= 0.05 && "font-semibold text-amber-600")}>
                                    {formatPercent(r.loss_rate)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!data.items.length && <EmptyRow cols={6} />}
                    </TableBody>
                </Table>
            </ChartCard>
        </div>
    );
};
