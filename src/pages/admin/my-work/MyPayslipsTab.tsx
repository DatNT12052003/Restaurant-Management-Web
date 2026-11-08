import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";

import { getMyPayslips } from "@/apis";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncData } from "@/hooks";
import { formatMoney } from "@/lib/format";
import { formatMonth } from "@/lib/hr";
import { PayslipDetail } from "../workforce/shared";

/** Phiếu lương của tôi (chỉ các bảng lương đã chốt) */
const MyPayslipsTab = () => {
    const { t, i18n } = useTranslation("admin");
    const fetcher = useCallback(async () => (await getMyPayslips()).data ?? [], []);
    const { data: slips = [], loading } = useAsyncData(fetcher);
    const [openId, setOpenId] = useState<number | null>(null);

    if (!slips.length) {
        return <p className="py-8 text-center text-sm text-muted-foreground">{loading ? t("common.loading") : t("hr.payslip.none")}</p>;
    }
    return (
        <div className="grid gap-2">
            {slips.map((s) => (
                <Card key={s.id}>
                    <CardContent className="py-3">
                        <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                            <span className="flex items-center gap-2 font-medium">
                                {openId === s.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                {t("hr.payslip.title", { month: formatMonth(s.period_month, i18n.language) })}
                                <span className="text-sm font-normal text-muted-foreground">{s.restaurant_name}</span>
                            </span>
                            <span className="font-semibold tabular-nums">{formatMoney(s.net_pay)}</span>
                        </button>
                        {openId === s.id && (
                            <div className="mt-3 border-t pt-3">
                                <PayslipDetail item={s} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default MyPayslipsTab;
