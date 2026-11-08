import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent } from "./chart-utils";

/** Khung biểu đồ dùng chung; hằng số và hàm định dạng ở `chart-utils.ts`. */

interface ChartCardProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const ChartCard = ({ title, description, actions, children, className }: ChartCardProps) => (
    <Card className={cn("gap-3", className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
                <CardTitle className="text-base">{title}</CardTitle>
                {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
            {actions}
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

/** Chú thích dạng HTML (luôn có khi >= 2 series) */
export const ChartLegend = ({ items }: { items: { label: string; color: string }[] }) => (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {items.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                {item.label}
            </span>
        ))}
    </div>
);

interface TooltipRow {
    name?: string | number;
    value?: unknown;
    color?: string;
    dataKey?: unknown;
    payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
    active?: boolean;
    label?: string | number;
    payload?: TooltipRow[];
    labelFormatter?: (label: string) => string;
    valueFormatter?: (value: number, row: TooltipRow) => string;
}

/** Tooltip khi rê chuột: tiêu đề kỳ, mỗi series một dòng (ô màu + tên + giá trị) */
export const ChartTooltip = ({ active, label, payload, labelFormatter, valueFormatter }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
            {label !== undefined && label !== "" && (
                <p className="mb-1 font-medium">{labelFormatter ? labelFormatter(String(label)) : label}</p>
            )}
            {payload.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: row.color }} />
                    <span className="text-muted-foreground">{row.name}</span>
                    <span className="ml-auto pl-3 font-medium tabular-nums">
                        {valueFormatter ? valueFormatter(Number(row.value), row) : String(row.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

/** Ô số liệu chính, kèm so sánh với kỳ trước */
export const StatTile = ({
    label,
    value,
    current,
    previous,
    hint,
    invert,
    icon,
}: {
    label: string;
    value: string;
    current?: number;
    previous?: number;
    hint?: string;
    /** Tăng là xấu (ví dụ số order hủy) */
    invert?: boolean;
    icon?: ReactNode;
}) => {
    let delta: ReactNode = null;
    if (current !== undefined && previous !== undefined) {
        if (previous === 0) {
            delta = current === 0 ? null : <span className="text-muted-foreground">—</span>;
        } else {
            const change = (current - previous) / Math.abs(previous);
            const good = invert ? change < 0 : change > 0;
            const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "";
            delta = (
                <span className={cn(change === 0 ? "text-muted-foreground" : good ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                    {arrow} {formatPercent(Math.abs(change))}
                </span>
            );
        }
    }
    return (
        <Card className="gap-0 py-4">
            <CardContent className="px-4">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {icon}
                    {label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
                {(delta || hint) && (
                    <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
                        {delta}
                        {hint && <span>{hint}</span>}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export const EmptyChart = ({ text, height = 260 }: { text: string; height?: number }) => (
    <div className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground" style={{ height }}>
        {text}
    </div>
);
