import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { createAllowance, createCompensation, deleteAllowance, getAllowances, getCompensations, getHrStaff, updateAllowance } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAsyncData, usePermission } from "@/hooks";
import type { IAllowance, IStaffMember, PayTypeEnum } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/format";
import { formatDay, todayStr } from "@/lib/hr";

/** Mức lương hiện hành của nhân viên chi nhánh; mở để xem lịch sử lương, thêm mức mới, quản lý phụ cấp cố định */
const StaffPayTab = ({ restaurantId }: { restaurantId?: number }) => {
    const { t } = useTranslation("admin");
    const [open, setOpen] = useState<IStaffMember | null>(null);
    const fetcher = useCallback(async () => {
        try {
            return (await getHrStaff(restaurantId)).data ?? [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId]);
    const { data: staff = [], loading, reload } = useAsyncData(fetcher);

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("hr.staff")}</TableHead>
                            <TableHead>{t("hr.pay.type_label")}</TableHead>
                            <TableHead className="text-right">{t("hr.pay.current")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!staff.length && (
                            <TableRow>
                                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                                    {loading ? t("common.loading") : t("common.no_data")}
                                </TableCell>
                            </TableRow>
                        )}
                        {staff.map((m) => (
                            <TableRow key={m.id} className="cursor-pointer" onClick={() => setOpen(m)}>
                                <TableCell>
                                    <p className="font-medium">{m.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{m.roles.map((r) => t(`roles.${r}`)).join(", ")}</p>
                                </TableCell>
                                <TableCell>{m.pay_type ? t(`hr.pay.type.${m.pay_type}`) : <span className="text-destructive">{t("hr.pay.not_set")}</span>}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {m.pay_amount !== null && m.pay_amount !== undefined ? formatMoney(m.pay_amount) : "—"}
                                    {m.pay_type === "hourly" && <span className="text-muted-foreground"> {t("hr.pay.per_hour")}</span>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <PayDialog member={open} onOpenChange={(v) => !v && setOpen(null)} onChanged={reload} />
        </Card>
    );
};

const PayDialog = ({ member, onOpenChange, onChanged }: { member: IStaffMember | null; onOpenChange: (open: boolean) => void; onChanged: () => void }) => (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">{member && <PayBody key={member.id} member={member} onChanged={onChanged} />}</DialogContent>
    </Dialog>
);

const PayBody = ({ member, onChanged }: { member: IStaffMember; onChanged: () => void }) => {
    const { t, i18n } = useTranslation("admin");
    const canManage = usePermission("payroll.manage");
    const compFetcher = useCallback(async () => (await getCompensations(member.id)).data ?? [], [member.id]);
    const { data: comps = [], reload: reloadComps } = useAsyncData(compFetcher);
    const allowFetcher = useCallback(async () => (await getAllowances(member.id)).data ?? [], [member.id]);
    const { data: allowances = [], reload: reloadAllowances } = useAsyncData(allowFetcher);

    const [payType, setPayType] = useState<PayTypeEnum>(member.pay_type ?? "monthly");
    const [amount, setAmount] = useState("");
    const [from, setFrom] = useState(todayStr());
    const [note, setNote] = useState("");
    const [allowanceName, setAllowanceName] = useState("");
    const [allowanceAmount, setAllowanceAmount] = useState("");
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState<IAllowance | null>(null);

    const run = async (action: () => Promise<{ message: string }>, after: () => void) => {
        setBusy(true);
        try {
            toast.success((await action()).message);
            after();
            onChanged();
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const addComp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await run(() => createCompensation(member.id, { pay_type: payType, amount: Number(amount), effective_from: from, note: note.trim() || null }), reloadComps)) {
            setAmount("");
            setNote("");
        }
    };
    const addAllowance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await run(() => createAllowance(member.id, { name: allowanceName.trim(), amount: Number(allowanceAmount) }), reloadAllowances)) {
            setAllowanceName("");
            setAllowanceAmount("");
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("hr.pay.dialog_title", { name: member.full_name })}</DialogTitle>
                <DialogDescription>{t("hr.pay.dialog_hint")}</DialogDescription>
            </DialogHeader>

            <section className="grid gap-2">
                <h3 className="text-sm font-semibold">{t("hr.pay.history")}</h3>
                <div className="divide-y rounded-md border text-sm">
                    {!comps.length && <p className="p-3 text-muted-foreground">{t("hr.pay.not_set")}</p>}
                    {comps.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <span>
                                {t("hr.pay.from_date", { date: formatDay(c.effective_from, i18n.language) })} · {t(`hr.pay.type.${c.pay_type}`)}
                                {c.note && <span className="block text-xs text-muted-foreground">{c.note}</span>}
                            </span>
                            <span className="font-medium tabular-nums">
                                {formatMoney(c.amount)}
                                {c.pay_type === "hourly" && ` ${t("hr.pay.per_hour")}`}
                            </span>
                        </div>
                    ))}
                </div>
                {canManage && (
                    <form onSubmit={addComp} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4 sm:items-end">
                        <div className="grid gap-1.5">
                            <Label>{t("hr.pay.type_label")}</Label>
                            <Select value={payType} onValueChange={(v) => setPayType(v as PayTypeEnum)}>
                                <SelectTrigger className="w-full" aria-label={t("hr.pay.type_label")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">{t("hr.pay.type.monthly")}</SelectItem>
                                    <SelectItem value="hourly">{t("hr.pay.type.hourly")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="comp-amount">{payType === "hourly" ? t("hr.pay.hourly_rate") : t("hr.pay.monthly_salary")}</Label>
                            <Input id="comp-amount" type="number" min={0} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="comp-from">{t("hr.pay.effective_from")}</Label>
                            <Input id="comp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
                        </div>
                        <Button type="submit" disabled={busy || amount === "" || Number(amount) < 0}>
                            {t("hr.pay.add_rate")}
                        </Button>
                        <Input className="sm:col-span-4" maxLength={500} placeholder={t("hr.pay.note_placeholder")} value={note} onChange={(e) => setNote(e.target.value)} aria-label={t("hr.note")} />
                    </form>
                )}
            </section>

            <section className="grid gap-2">
                <h3 className="text-sm font-semibold">{t("hr.pay.allowances")}</h3>
                <div className="divide-y rounded-md border text-sm">
                    {!allowances.length && <p className="p-3 text-muted-foreground">{t("common.no_data")}</p>}
                    {allowances.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <label className="flex items-center gap-2">
                                {canManage && (
                                    <Checkbox
                                        checked={a.status === "active"}
                                        aria-label={t("hr.pay.allowance_active")}
                                        onCheckedChange={(v) => run(() => updateAllowance(a.id, { status: v === true ? "active" : "inactive" }), reloadAllowances)}
                                    />
                                )}
                                <span className={a.status === "inactive" ? "text-muted-foreground line-through" : undefined}>{a.name}</span>
                            </label>
                            <span className="flex items-center gap-1">
                                <span className="tabular-nums">{t("hr.pay.per_month_amount", { amount: formatMoney(a.amount) })}</span>
                                {canManage && (
                                    <Button size="icon" variant="ghost" aria-label={t("common.delete")} onClick={() => setDeleting(a)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
                {canManage && (
                    <form onSubmit={addAllowance} className="flex flex-wrap items-end gap-2">
                        <div className="grid flex-1 gap-1.5">
                            <Label htmlFor="allow-name">{t("hr.pay.allowance_name")}</Label>
                            <Input id="allow-name" maxLength={100} placeholder={t("hr.pay.allowance_placeholder")} value={allowanceName} onChange={(e) => setAllowanceName(e.target.value)} required />
                        </div>
                        <div className="grid w-40 gap-1.5">
                            <Label htmlFor="allow-amount">{t("hr.pay.allowance_amount")}</Label>
                            <Input id="allow-amount" type="number" min={1} step={1000} value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} required />
                        </div>
                        <Button type="submit" disabled={busy || !allowanceName.trim() || !(Number(allowanceAmount) > 0)}>
                            {t("common.add")}
                        </Button>
                    </form>
                )}
                <p className="text-xs text-muted-foreground">{t("hr.pay.allowance_hint")}</p>
            </section>

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(v) => !v && setDeleting(null)}
                title={t("hr.pay.delete_allowance")}
                description={deleting?.name}
                onConfirm={async () => {
                    const ok = await run(() => deleteAllowance(deleting!.id), reloadAllowances);
                    if (!ok) throw new Error("failed");
                }}
            />
        </>
    );
};

export default StaffPayTab;
