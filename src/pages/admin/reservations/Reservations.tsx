import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus, Search } from "lucide-react";

import { getAllRooms, getAllTables, getReservationSchedule } from "@/apis";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACTIVE_RESERVATION_STATUSES, RESERVATION_STATUSES } from "@/constants/reservation";
import type { ReservationStatusEnum } from "@/enum";
import { useAppSelector, useAsyncData, usePermission } from "@/hooks";
import type { IReservation, IRoom, ITable } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { addDays, formatTime, startOfDay, toDateInput } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import ReservationDetailDialog, { ReservationStatusBadge } from "./ReservationDetailDialog";
import ReservationFormDialog, { type IReservationFormDefaults } from "./ReservationFormDialog";
import ReservationTimeline from "./ReservationTimeline";

type StatusFilter = "all" | "active" | ReservationStatusEnum;

/** Đặt bàn theo ngày (đặc tả 4.6): timeline theo bàn, danh sách, tạo / sửa / đổi trạng thái */
const Reservations = () => {
    const { t, i18n } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    // Admin phải chọn chi nhánh; người khác luôn bị backend giới hạn trong nhà hàng của mình
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const needBranch = isAdmin && !currentBranch;
    const canSeeFloor = can("room.view") && can("table.view");

    const [date, setDate] = useState(() => toDateInput(new Date()));
    const [view, setView] = useState<"timeline" | "list">(canSeeFloor ? "timeline" : "list");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [search, setSearch] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<IReservation | null>(null);
    const [formDefaults, setFormDefaults] = useState<IReservationFormDefaults>({ date });
    const [detail, setDetail] = useState<IReservation | null>(null);

    // ---- Sơ đồ phòng / bàn (ít thay đổi, tải theo chi nhánh) ----
    const floorFetcher = useCallback(async (): Promise<{ rooms: IRoom[]; tables: ITable[] }> => {
        if (needBranch || !canSeeFloor) return { rooms: [], tables: [] };
        try {
            const [roomRes, tableRes] = await Promise.all([getAllRooms(restaurantId), getAllTables(restaurantId)]);
            return { rooms: roomRes.data || [], tables: tableRes.data || [] };
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId, needBranch, canSeeFloor]);
    const { data: floor } = useAsyncData(floorFetcher);

    // ---- Đặt bàn trong ngày ----
    const scheduleFetcher = useCallback(async (): Promise<IReservation[]> => {
        if (needBranch) return [];
        const from = startOfDay(date);
        try {
            const res = await getReservationSchedule(from.toISOString(), addDays(from, 1).toISOString(), restaurantId);
            return res.data || [];
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [date, restaurantId, needBranch]);
    const { data: schedule, loading, reload } = useAsyncData(scheduleFetcher);
    const all = useMemo(() => schedule || [], [schedule]);

    const counts = useMemo(() => {
        const map = Object.fromEntries(RESERVATION_STATUSES.map((s) => [s, 0])) as Record<ReservationStatusEnum, number>;
        all.forEach((r) => map[r.status]++);
        return map;
    }, [all]);
    const guestsExpected = useMemo(
        () => all.filter((r) => ACTIVE_RESERVATION_STATUSES.includes(r.status)).reduce((sum, r) => sum + r.guest_count, 0),
        [all],
    );

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all.filter((r) => {
            if (statusFilter === "active" && !ACTIVE_RESERVATION_STATUSES.includes(r.status)) return false;
            if (statusFilter !== "all" && statusFilter !== "active" && r.status !== statusFilter) return false;
            if (q && !r.contact_name.toLowerCase().includes(q) && !r.contact_phone.includes(q)) return false;
            return true;
        });
    }, [all, statusFilter, search]);

    const openCreate = (defaults: Partial<IReservationFormDefaults> = {}) => {
        setEditing(null);
        setFormDefaults({ date, ...defaults });
        setFormOpen(true);
    };
    const openEdit = (reservation: IReservation) => {
        setDetail(null);
        setEditing(reservation);
        setFormOpen(true);
    };

    const shiftDate = (days: number) => setDate((d) => toDateInput(addDays(startOfDay(d), days)));
    const isToday = date === toDateInput(new Date());
    const dateLabel = startOfDay(date).toLocaleDateString(i18n.language, {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    if (needBranch) {
        return (
            <div>
                <PageHeader title={t("reservation.title")} description={t("reservation.description")} />
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {t("reservation.select_branch_first")}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("reservation.title")}
                description={t("reservation.description")}
                actions={
                    can("reservation.create") && (
                        <Button onClick={() => openCreate()}>
                            <Plus className="h-4 w-4" />
                            {t("reservation.add")}
                        </Button>
                    )
                }
            />

            {/* Chọn ngày */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => shiftDate(-1)} aria-label={t("reservation.prev_day")}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                    type="date"
                    className="w-auto"
                    value={date}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                    aria-label={t("reservation.form.date")}
                />
                <Button variant="outline" size="icon" onClick={() => shiftDate(1)} aria-label={t("reservation.next_day")}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setDate(toDateInput(new Date()))} disabled={isToday}>
                    {t("reservation.today")}
                </Button>
                <span className="text-sm capitalize text-muted-foreground">{dateLabel}</span>
                {canSeeFloor && (
                    <Tabs value={view} onValueChange={(v) => setView(v as "timeline" | "list")} className="ml-auto">
                        <TabsList>
                            <TabsTrigger value="timeline">
                                <CalendarDays className="h-4 w-4" />
                                {t("reservation.view_timeline")}
                            </TabsTrigger>
                            <TabsTrigger value="list">
                                <List className="h-4 w-4" />
                                {t("reservation.view_list")}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
            </div>

            {/* Bộ lọc trạng thái + tìm kiếm */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {(["active", "all"] as const).map((key) => (
                    <Button
                        key={key}
                        size="sm"
                        variant={statusFilter === key ? "default" : "outline"}
                        onClick={() => setStatusFilter(key)}
                    >
                        {t(`reservation.filter.${key}`)}
                    </Button>
                ))}
                {RESERVATION_STATUSES.map((status) => (
                    <Button
                        key={status}
                        size="sm"
                        variant={statusFilter === status ? "default" : "outline"}
                        onClick={() => setStatusFilter(status)}
                    >
                        {t(`status.reservation.${status}`)}: <strong>{counts[status]}</strong>
                    </Button>
                ))}
                <span className="text-sm text-muted-foreground">{t("reservation.guests_expected", { count: guestsExpected })}</span>
                <div className="relative ml-auto w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder={t("reservation.search_placeholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : view === "timeline" && canSeeFloor ? (
                <ReservationTimeline
                    date={date}
                    rooms={floor?.rooms || []}
                    tables={floor?.tables || []}
                    reservations={visible}
                    onSelect={setDetail}
                    onCreateAt={
                        can("reservation.create") ? (tableId, start) => openCreate({ tableId, start }) : undefined
                    }
                />
            ) : visible.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("reservation.empty")}</CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("reservation.time")}</TableHead>
                                    <TableHead>{t("reservation.contact")}</TableHead>
                                    <TableHead className="text-center">{t("reservation.guest_count")}</TableHead>
                                    <TableHead>{t("reservation.form.tables")}</TableHead>
                                    <TableHead>{t("reservation.status")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((r) => (
                                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {formatTime(r.start_time, i18n.language)} – {formatTime(r.end_time, i18n.language)}
                                        </TableCell>
                                        <TableCell>
                                            <div>{r.contact_name}</div>
                                            <div className="text-xs text-muted-foreground">{r.contact_phone}</div>
                                        </TableCell>
                                        <TableCell className="text-center">{r.guest_count}</TableCell>
                                        <TableCell className="max-w-64">
                                            <span className="line-clamp-2 text-sm">
                                                {r.tables.map((tb) => `${tb.name} (${tb.room_name})`).join(", ")}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <ReservationStatusBadge status={r.status} />
                                            {r.note && (
                                                <p className={cn("mt-1 line-clamp-1 max-w-48 text-xs text-muted-foreground")}>
                                                    {r.note}
                                                </p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <ReservationFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                reservation={editing}
                defaults={formDefaults}
                restaurantId={restaurantId}
                onSaved={(saved) => {
                    // Chuyển tới ngày của đặt bàn vừa lưu để thấy ngay
                    setDate(toDateInput(new Date(saved.start_time)));
                    reload();
                }}
            />

            <ReservationDetailDialog
                reservation={detail}
                onOpenChange={(v) => !v && setDetail(null)}
                onEdit={openEdit}
                onChanged={(updated) => {
                    setDetail(updated);
                    reload();
                }}
            />
        </div>
    );
};

export default Reservations;
