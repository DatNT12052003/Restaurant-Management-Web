import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Users } from "lucide-react";

import { ACTIVE_RESERVATION_STATUSES, RESERVATION_STATUS_STYLE } from "@/constants/reservation";
import type { IReservation, IRoom, ITable } from "@/interfaces";
import { addDays, formatTime, startOfDay, toDateInput, toTimeInput } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks";

/** Giờ hiển thị mặc định (mở rộng nếu có reservation sớm hơn) */
const DEFAULT_FROM_HOUR = 8;
const HOUR_MS = 60 * 60 * 1000;

interface ReservationTimelineProps {
    date: string;
    rooms: IRoom[];
    tables: ITable[];
    reservations: IReservation[];
    onSelect: (reservation: IReservation) => void;
    /** Bấm vào ô trống: tạo đặt bàn cho bàn này từ giờ đã bấm (làm tròn 30 phút). Không truyền = không cho tạo. */
    onCreateAt?: (tableId: number, time: string) => void;
}

/** Lịch theo ngày: mỗi dòng là một bàn, mỗi thanh là một lần đặt */
export const ReservationTimeline = ({ date, rooms, tables, reservations, onSelect, onCreateAt }: ReservationTimelineProps) => {
    const { t, i18n } = useTranslation("admin");

    const dayStart = useMemo(() => startOfDay(date), [date]);
    const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);

    const fromHour = useMemo(() => {
        const earliest = reservations.reduce((min, r) => {
            const s = new Date(r.start_time);
            return s < dayStart ? 0 : Math.min(min, s.getHours());
        }, DEFAULT_FROM_HOUR);
        return Math.max(0, earliest);
    }, [reservations, dayStart]);
    const viewStart = dayStart.getTime() + fromHour * HOUR_MS;
    const viewEnd = dayEnd.getTime();
    const total = viewEnd - viewStart;
    const hours = Array.from({ length: 24 - fromHour }, (_, i) => fromHour + i);

    const pct = (ms: number) => ((Math.min(Math.max(ms, viewStart), viewEnd) - viewStart) / total) * 100;

    // Bàn gom theo phòng, theo thứ tự tên
    const groups = useMemo(() => {
        const sortByName = <T extends { name: string }>(list: T[]) =>
            [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        return sortByName(rooms)
            .map((room) => ({ room, tables: sortByName(tables.filter((tb) => tb.room_id === room.id)) }))
            .filter((g) => g.tables.length > 0);
    }, [rooms, tables]);

    const byTable = useMemo(() => {
        const map = new Map<number, IReservation[]>();
        reservations.forEach((r) => r.tables.forEach((tb) => map.set(tb.id, [...(map.get(tb.id) || []), r])));
        return map;
    }, [reservations]);

    const now = useNow();
    const showNow = date === toDateInput(new Date()) && now >= viewStart && now <= viewEnd;

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>, tableId: number) => {
        if (!onCreateAt || e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const ms = viewStart + ratio * total;
        const rounded = new Date(Math.floor(ms / (30 * 60 * 1000)) * 30 * 60 * 1000);
        onCreateAt(tableId, toTimeInput(rounded));
    };

    if (groups.length === 0) {
        return <p className="py-10 text-center text-muted-foreground">{t("room.no_rooms")}</p>;
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[960px]">
                {/* Thang giờ */}
                <div className="sticky top-0 z-20 flex border-b bg-background">
                    <div className="w-36 shrink-0 border-r px-3 py-2 text-xs font-medium text-muted-foreground">
                        {t("reservation.timeline.table")}
                    </div>
                    <div className="relative h-8 flex-1">
                        {hours.map((h) => (
                            <span
                                key={h}
                                className="absolute top-2 -translate-x-1/2 text-xs text-muted-foreground first:translate-x-0"
                                style={{ left: `${pct(dayStart.getTime() + h * HOUR_MS)}%` }}
                            >
                                {String(h).padStart(2, "0")}
                            </span>
                        ))}
                    </div>
                </div>

                {groups.map(({ room, tables: roomTables }) => (
                    <div key={room.id}>
                        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-semibold">
                            {room.name}
                            <span className="font-normal text-muted-foreground">· {t(`status.room_type.${room.type}`)}</span>
                            {!room.is_active && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        {roomTables.map((table) => (
                            <div key={table.id} className="flex border-b last:border-b-0">
                                <div className="flex w-36 shrink-0 items-center justify-between gap-1 border-r px-3 py-2 text-sm">
                                    <span className="truncate font-medium">{table.name}</span>
                                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        {table.capacity}
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "relative h-11 flex-1",
                                        onCreateAt && room.is_active && "cursor-copy hover:bg-accent/40",
                                    )}
                                    onClick={(e) => room.is_active && handleTrackClick(e, table.id)}
                                    title={onCreateAt && room.is_active ? t("reservation.timeline.click_to_create") : undefined}
                                >
                                    {/* Vạch giờ */}
                                    {hours.map((h) => (
                                        <span
                                            key={h}
                                            className="pointer-events-none absolute inset-y-0 border-l border-dashed border-border/60"
                                            style={{ left: `${pct(dayStart.getTime() + h * HOUR_MS)}%` }}
                                        />
                                    ))}
                                    {showNow && (
                                        <span
                                            className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-red-500"
                                            style={{ left: `${pct(now)}%` }}
                                        />
                                    )}
                                    {(byTable.get(table.id) || []).map((r) => {
                                        const s = new Date(r.start_time).getTime();
                                        const e = new Date(r.end_time).getTime();
                                        if (e <= viewStart || s >= viewEnd) return null;
                                        const left = pct(s);
                                        const width = Math.max(pct(e) - left, 0.8);
                                        const active = ACTIVE_RESERVATION_STATUSES.includes(r.status);
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                onClick={() => onSelect(r)}
                                                className={cn(
                                                    "absolute inset-y-1 overflow-hidden rounded-md border px-1.5 text-left text-xs leading-tight shadow-sm transition hover:brightness-95",
                                                    RESERVATION_STATUS_STYLE[r.status],
                                                    active ? "z-10" : "z-0 opacity-60",
                                                )}
                                                style={{ left: `${left}%`, width: `${width}%` }}
                                                title={`${formatTime(r.start_time, i18n.language)}–${formatTime(r.end_time, i18n.language)} · ${r.contact_name} · ${t("reservation.guests", { count: r.guest_count })}`}
                                            >
                                                <span className="block truncate font-medium">{r.contact_name}</span>
                                                <span className="block truncate opacity-80">
                                                    {formatTime(r.start_time, i18n.language)} · {r.guest_count}
                                                    <Users className="ml-0.5 inline h-3 w-3" />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReservationTimeline;
