import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportGroupBy } from "@/interfaces";
import { PRESETS, type RangePreset, type ReportFiltersState } from "./useReportFilters";

/** Một hàng bộ lọc phía trên các biểu đồ */
const ReportFilters = ({ state, showGroupBy = true }: { state: ReportFiltersState; showGroupBy?: boolean }) => {
    const { t } = useTranslation("admin");
    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={state.preset} onValueChange={(v) => state.setPreset(v as RangePreset)}>
                <SelectTrigger className="w-44" aria-label={t("report.range")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PRESETS.map((p) => (
                        <SelectItem key={p} value={p}>
                            {t(`report.preset.${p}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {state.preset === "custom" && (
                <>
                    <Input
                        type="date"
                        className="w-40"
                        aria-label={t("report.from")}
                        value={state.custom.from}
                        max={state.custom.to}
                        onChange={(e) => state.setCustom({ ...state.custom, from: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                        type="date"
                        className="w-40"
                        aria-label={t("report.to")}
                        value={state.custom.to}
                        min={state.custom.from}
                        onChange={(e) => state.setCustom({ ...state.custom, to: e.target.value })}
                    />
                </>
            )}
            {showGroupBy && (
                <Select value={state.groupBy} onValueChange={(v) => state.setGroupBy(v as ReportGroupBy | "auto")}>
                    <SelectTrigger className="w-36" aria-label={t("report.group_by")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(["auto", "day", "week", "month"] as const).map((g) => (
                            <SelectItem key={g} value={g}>
                                {t(`report.group.${g}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <span className="text-sm text-muted-foreground">
                {state.isChain ? t("report.scope_chain") : state.branchName ? t("report.scope_branch", { name: state.branchName }) : ""}
            </span>
            {!state.valid && <span className="text-sm text-destructive">{t("report.invalid_range")}</span>}
        </div>
    );
};

export default ReportFilters;
