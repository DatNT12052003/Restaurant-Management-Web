import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IPayrollItem } from "@/interfaces";
import { formatMoney } from "@/lib/format";
import { formatDay, formatMinutes, shiftDay } from "@/lib/hr";
import { cn } from "@/lib/utils";

/** Huy hiệu trạng thái với màu theo bảng `tones` */
export const StatusBadge = ({ tone, label }: { tone?: string; label: string }) => (
    <Badge variant="outline" className={cn("whitespace-nowrap", tone)}>
        {label}
    </Badge>
);

/** Điều hướng theo tuần: ‹ 10/11/2026 – 16/11/2026 › */
export const WeekNav = ({ monday, onChange }: { monday: string; onChange: (monday: string) => void }) => {
    const { t, i18n } = useTranslation("admin");
    return (
        <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label={t("hr.prev_week")} onClick={() => onChange(shiftDay(monday, -7))}>
                <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-52 text-center text-sm font-medium tabular-nums">
                {formatDay(monday, i18n.language)} – {formatDay(shiftDay(monday, 6), i18n.language)}
            </span>
            <Button variant="outline" size="icon" aria-label={t("hr.next_week")} onClick={() => onChange(shiftDay(monday, 7))}>
                <ChevronRight className="size-4" />
            </Button>
        </div>
    );
};

export const MonthInput = ({ value, onChange, id }: { value: string; onChange: (month: string) => void; id?: string }) => {
    const { t } = useTranslation("admin");
    return (
        <Input
            id={id}
            type="month"
            className="w-44"
            aria-label={t("hr.month")}
            value={value}
            onChange={(e) => e.target.value && onChange(e.target.value)}
        />
    );
};

const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) => (
    <div className={cn("flex justify-between gap-4", strong && "text-base font-semibold", tone)}>
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
    </div>
);

/** Chi tiết một dòng bảng lương / phiếu lương */
export const PayslipDetail = ({ item }: { item: IPayrollItem }) => {
    const { t, i18n } = useTranslation("admin");
    const d = item.details;
    return (
        <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4">
                <Stat label={t("hr.payroll.work_days")} value={String(item.work_days)} />
                <Stat label={t("hr.payroll.paid_leave")} value={String(item.paid_leave_days)} />
                <Stat label={t("hr.payroll.worked_hours")} value={formatMinutes(item.worked_minutes)} />
                <Stat label={t("hr.payroll.overtime_hours")} value={formatMinutes(item.overtime_minutes)} />
            </div>
            <div className="grid gap-1">
                {d.rates.map((r) => (
                    <Row
                        key={`${r.pay_type}-${r.amount}`}
                        label={
                            r.pay_type === "monthly"
                                ? t("hr.payroll.rate_monthly", { amount: formatMoney(r.amount), days: r.days })
                                : t("hr.payroll.rate_hourly", { amount: formatMoney(r.amount), hours: formatMinutes(r.minutes) })
                        }
                        value={formatMoney(r.base_pay)}
                    />
                ))}
                {!d.rates.length && <Row label={t("hr.payroll.base_pay")} value={formatMoney(item.base_pay)} />}
                <Row label={t("hr.payroll.overtime_pay")} value={formatMoney(item.overtime_pay)} />
                {d.allowances.map((a) => (
                    <Row key={a.name} label={t("hr.payroll.allowance_named", { name: a.name })} value={formatMoney(a.amount)} />
                ))}
                {d.adjustments.map((a) => (
                    <Row
                        key={a.id}
                        label={`${t(`hr.adjustment.type.${a.type}`)}: ${a.reason} (${formatDay(a.effective_date, i18n.language)})`}
                        value={`${a.type === "penalty" ? "−" : "+"}${formatMoney(a.amount)}`}
                        tone={a.type === "penalty" ? "text-destructive" : undefined}
                    />
                ))}
                <Row label={t("hr.payroll.tips")} value={formatMoney(item.tip_total)} />
                <div className="my-1 border-t" />
                <Row label={t("hr.payroll.net_pay")} value={formatMoney(item.net_pay)} strong />
            </div>
            {(d.missing_rate_days > 0 || d.pending_overtime_minutes > 0 || item.unpaid_leave_days > 0) && (
                <ul className="grid gap-1 text-xs text-muted-foreground">
                    {d.missing_rate_days > 0 && <li className="text-destructive">{t("hr.payroll.missing_rate", { count: d.missing_rate_days })}</li>}
                    {d.pending_overtime_minutes > 0 && <li>{t("hr.payroll.pending_overtime", { hours: formatMinutes(d.pending_overtime_minutes) })}</li>}
                    {item.unpaid_leave_days > 0 && <li>{t("hr.payroll.unpaid_leave", { count: item.unpaid_leave_days })}</li>}
                </ul>
            )}
        </div>
    );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold tabular-nums">{value}</p>
    </div>
);
