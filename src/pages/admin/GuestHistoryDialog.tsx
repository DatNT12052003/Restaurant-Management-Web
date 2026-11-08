import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getOrders, getReservations } from "@/apis";
import DataPagination from "@/components/common/DataPagination";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDER_STATUS_STYLE } from "@/constants/order";
import { RESERVATION_STATUS_STYLE } from "@/constants/reservation";
import { useAppSelector, useAsyncData, usePermission } from "@/hooks";
import type { IUserWithAccount } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

const PAGE_SIZE = 10;

/** Lịch sử đặt bàn và order của một khách (mọi chi nhánh người xem được phép xem) */
const GuestHistoryDialog = ({ guest, onOpenChange }: { guest: IUserWithAccount | null; onOpenChange: (open: boolean) => void }) => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const canReservations = can("reservation.view");
    const canOrders = can("order.view");
    return (
        <Dialog open={!!guest} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t("guest.history_title", { name: guest?.full_name })}</DialogTitle>
                    <DialogDescription>{guest?.phone_number || guest?.email || ""}</DialogDescription>
                </DialogHeader>
                {guest && (
                    <Tabs defaultValue={canReservations ? "reservations" : "orders"}>
                        <TabsList>
                            {canReservations && <TabsTrigger value="reservations">{t("guest.history_reservations")}</TabsTrigger>}
                            {canOrders && <TabsTrigger value="orders">{t("guest.history_orders")}</TabsTrigger>}
                        </TabsList>
                        {canReservations && (
                            <TabsContent value="reservations">
                                <ReservationHistory guestId={guest.id} />
                            </TabsContent>
                        )}
                        {canOrders && (
                            <TabsContent value="orders">
                                <OrderHistory guestId={guest.id} />
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
};

/** Tên chi nhánh theo id (từ bộ chọn chi nhánh đã tải) */
const useBranchName = () => {
    const branches = useAppSelector((s) => s.restaurant.branches);
    return (id: number) => branches.find((b) => b.id === id)?.name ?? `#${id}`;
};

const EmptyRow = ({ cols, text }: { cols: number; text: string }) => (
    <TableRow>
        <TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">
            {text}
        </TableCell>
    </TableRow>
);

const ReservationHistory = ({ guestId }: { guestId: number }) => {
    const { t, i18n } = useTranslation("admin");
    const branchName = useBranchName();
    const [page, setPage] = useState(1);
    const fetcher = useCallback(async () => {
        try {
            return (
                await getReservations({
                    currentPage: page,
                    limit: PAGE_SIZE,
                    filters: [{ field: "guest_user_id", value: guestId }],
                    orderBy: [{ field: "start_time", direction: "desc" }],
                })
            ).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [guestId, page]);
    const { data, loading } = useAsyncData(fetcher);
    const rows = data?.reservations ?? [];
    return (
        <div className="grid gap-3">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("reservation.time")}</TableHead>
                        <TableHead>{t("guest.history_branch")}</TableHead>
                        <TableHead>{t("reservation.form.tables")}</TableHead>
                        <TableHead className="text-center">{t("reservation.guest_count")}</TableHead>
                        <TableHead>{t("reservation.status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading && !data ? (
                        <EmptyRow cols={5} text={t("common.loading")} />
                    ) : rows.length === 0 ? (
                        <EmptyRow cols={5} text={t("common.no_data")} />
                    ) : (
                        rows.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="whitespace-nowrap">{formatDateTime(r.start_time, i18n.language)}</TableCell>
                                <TableCell>{branchName(r.restaurant_id)}</TableCell>
                                <TableCell>{r.tables.map((tb) => tb.name).join(", ") || "—"}</TableCell>
                                <TableCell className="text-center">{r.guest_count}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={RESERVATION_STATUS_STYLE[r.status]}>
                                        {t(`status.reservation.${r.status}`)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}
        </div>
    );
};

const OrderHistory = ({ guestId }: { guestId: number }) => {
    const { t, i18n } = useTranslation("admin");
    const branchName = useBranchName();
    const [page, setPage] = useState(1);
    const fetcher = useCallback(async () => {
        try {
            return (await getOrders({ currentPage: page, limit: PAGE_SIZE, filters: [{ field: "guest_user_id", value: guestId }] })).data;
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [guestId, page]);
    const { data, loading } = useAsyncData(fetcher);
    const rows = data?.orders ?? [];
    const spent = rows.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);
    return (
        <div className="grid gap-3">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("order.code")}</TableHead>
                        <TableHead>{t("order.opened_at")}</TableHead>
                        <TableHead>{t("guest.history_branch")}</TableHead>
                        <TableHead className="text-right">{t("order.total")}</TableHead>
                        <TableHead>{t("reservation.status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading && !data ? (
                        <EmptyRow cols={5} text={t("common.loading")} />
                    ) : rows.length === 0 ? (
                        <EmptyRow cols={5} text={t("common.no_data")} />
                    ) : (
                        rows.map((o) => (
                            <TableRow key={o.id}>
                                <TableCell className="font-medium">{o.code}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatDateTime(o.created_at, i18n.language)}</TableCell>
                                <TableCell>{branchName(o.restaurant_id)}</TableCell>
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
            {rows.length > 0 && (
                <p className="text-right text-sm text-muted-foreground">{t("guest.history_spent_page", { amount: formatMoney(spent) })}</p>
            )}
            {data && data.pagination.totalPages > 1 && <DataPagination pagination={data.pagination} onPageChange={setPage} />}
        </div>
    );
};

export default GuestHistoryDialog;
