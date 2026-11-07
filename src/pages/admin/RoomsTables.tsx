import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Images, Lock, MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react";

import { createRoom, createTable, deleteRoom, deleteTable, getAllRooms, getAllTables, updateRoom, updateTable } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ImageManager from "@/components/common/ImageManager";
import PageHeader from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TABLES_PER_PRIVATE_ROOM, ROOM_TYPES, USAGE_STATUSES, USAGE_STATUS_STYLE } from "@/constants/roles";
import type { RoomTypeEnum, UsageStatusEnum } from "@/enum";
import { useAppSelector, useAsyncData, usePermission } from "@/hooks";
import type { IRoom, IRoomPayload, ITable, ITablePayload } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

const EMPTY_ROOM: IRoomPayload = { name: "", type: "public", description: "", is_active: true };
const EMPTY_TABLE: ITablePayload = { name: "", capacity: 4, status: "available" };

const RoomsTables = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);
    const isAdmin = roles.includes("admin");
    // Admin phải chọn chi nhánh; người khác luôn bị backend giới hạn trong nhà hàng của mình
    const restaurantId = isAdmin ? currentBranch?.id : undefined;
    const needBranch = isAdmin && !currentBranch;

    const [pickedRoomId, setSelectedRoomId] = useState<number | null>(null);

    const [roomForm, setRoomForm] = useState<IRoomPayload | null>(null);
    const [editingRoom, setEditingRoom] = useState<IRoom | null>(null);
    const [tableForm, setTableForm] = useState<ITablePayload | null>(null);
    const [editingTable, setEditingTable] = useState<ITable | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingRoom, setDeletingRoom] = useState<IRoom | null>(null);
    const [deletingTable, setDeletingTable] = useState<ITable | null>(null);
    const [imagesOf, setImagesOf] = useState<IRoom | null>(null);

    const fetcher = useCallback(async (): Promise<{ rooms: IRoom[]; tables: ITable[] }> => {
        if (needBranch) return { rooms: [], tables: [] };
        try {
            const [roomRes, tableRes] = await Promise.all([getAllRooms(restaurantId), getAllTables(restaurantId)]);
            return { rooms: roomRes.data || [], tables: tableRes.data || [] };
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        }
    }, [restaurantId, needBranch]);
    const { data, loading, reload } = useAsyncData(fetcher);
    const rooms = useMemo(() => data?.rooms || [], [data]);
    const tables = useMemo(() => data?.tables || [], [data]);

    // Phòng đang chọn đã bị xóa / đổi chi nhánh -> mặc định chọn phòng đầu tiên
    const selectedRoomId =
        pickedRoomId && rooms.some((r) => r.id === pickedRoomId) ? pickedRoomId : (rooms[0]?.id ?? null);
    const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
    const roomTables = useMemo(
        () =>
            tables
                .filter((tb) => tb.room_id === selectedRoomId)
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        [tables, selectedRoomId],
    );
    const summary = useMemo(
        () =>
            USAGE_STATUSES.map((st) => ({ status: st, count: tables.filter((tb) => tb.status === st).length })),
        [tables],
    );
    const roomIsFull =
        !!selectedRoom && selectedRoom.type !== "public" && roomTables.length >= MAX_TABLES_PER_PRIVATE_ROOM;

    const run = async (action: () => Promise<{ message: string }>, after?: () => void) => {
        setSaving(true);
        try {
            const res = await action();
            toast.success(res.message);
            after?.();
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        } finally {
            setSaving(false);
        }
    };

    // ---- Phòng ----
    const openCreateRoom = () => {
        setEditingRoom(null);
        setRoomForm(EMPTY_ROOM);
    };
    const openEditRoom = (room: IRoom) => {
        setEditingRoom(room);
        setRoomForm({ name: room.name, type: room.type, description: room.description || "", is_active: room.is_active });
    };
    const submitRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomForm) return;
        const payload = editingRoom ? roomForm : { ...roomForm, restaurant_id: restaurantId };
        run(
            () => (editingRoom ? updateRoom(editingRoom.id, payload) : createRoom(payload)),
            () => setRoomForm(null),
        ).catch(() => undefined);
    };

    // ---- Bàn ----
    const openCreateTable = () => {
        setEditingTable(null);
        setTableForm({ ...EMPTY_TABLE, room_id: selectedRoomId ?? undefined });
    };
    const openEditTable = (table: ITable) => {
        setEditingTable(table);
        setTableForm({ name: table.name, capacity: table.capacity, status: table.status, room_id: table.room_id });
    };
    const submitTable = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tableForm) return;
        const payload = { ...tableForm, capacity: Number(tableForm.capacity) || undefined };
        run(
            () => (editingTable ? updateTable(editingTable.id, payload) : createTable(payload)),
            () => setTableForm(null),
        ).catch(() => undefined);
    };
    const changeTableStatus = (table: ITable, status: UsageStatusEnum) =>
        run(() => updateTable(table.id, { status })).catch(() => undefined);

    if (needBranch) {
        return (
            <div>
                <PageHeader title={t("room.title")} description={t("room.description")} />
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {t("common.select_branch_first")}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={t("room.title")}
                description={t("room.description")}
                actions={
                    can("room.create") && (
                        <Button onClick={openCreateRoom}>
                            <Plus className="h-4 w-4" />
                            {t("room.add_room")}
                        </Button>
                    )
                }
            />

            <div className="mb-4 flex flex-wrap gap-2">
                {summary.map(({ status, count }) => (
                    <span key={status} className={cn("rounded-md border px-3 py-1 text-sm", USAGE_STATUS_STYLE[status])}>
                        {t(`status.usage.${status}`)}: <strong>{count}</strong>
                    </span>
                ))}
            </div>

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : rooms.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">{t("room.no_rooms")}</CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    {/* Danh sách phòng */}
                    <div className="flex flex-col gap-2">
                        {rooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => setSelectedRoomId(room.id)}
                                className={cn(
                                    "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                                    room.id === selectedRoomId && "border-primary bg-accent",
                                    !room.is_active && "opacity-60",
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{room.name}</span>
                                    {!room.is_active && <Lock className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline">{t(`status.room_type.${room.type}`)}</Badge>
                                    <span>{t("room.tables_count", { count: room.table_count ?? 0 })}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Bàn trong phòng đang chọn */}
                    {selectedRoom && (
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {selectedRoom.name}
                                        {!selectedRoom.is_active && (
                                            <Badge variant="secondary">{t("room.inactive_badge")}</Badge>
                                        )}
                                    </CardTitle>
                                    {selectedRoom.description && (
                                        <p className="mt-1 text-sm text-muted-foreground">{selectedRoom.description}</p>
                                    )}
                                    {selectedRoom.type !== "public" && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t("room.max_tables_hint", { max: MAX_TABLES_PER_PRIVATE_ROOM })}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {can("table.create") && (
                                        <Button size="sm" onClick={openCreateTable} disabled={roomIsFull}>
                                            <Plus className="h-4 w-4" />
                                            {t("table.add_table")}
                                        </Button>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setImagesOf(selectedRoom)}
                                        aria-label={t("image.title")}
                                        title={t("image.title")}
                                    >
                                        <Images className="h-4 w-4" />
                                    </Button>
                                    {can("room.update") && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => openEditRoom(selectedRoom)}
                                            aria-label={t("room.edit_room")}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {can("room.delete") && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setDeletingRoom(selectedRoom)}
                                            aria-label={t("common.delete")}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {roomTables.length === 0 ? (
                                    <p className="py-8 text-center text-muted-foreground">{t("table.no_tables")}</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                                        {roomTables.map((table) => (
                                            <div
                                                key={table.id}
                                                className={cn(
                                                    "relative rounded-lg border p-3",
                                                    USAGE_STATUS_STYLE[table.status],
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <span className="text-lg font-semibold">{table.name}</span>
                                                    {(can("table.update") || can("table.delete")) && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="-mr-2 -mt-1 h-7 w-7"
                                                                    aria-label={t("common.actions")}
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {can("table.update") && (
                                                                    <>
                                                                        <DropdownMenuLabel>
                                                                            {t("table.change_status")}
                                                                        </DropdownMenuLabel>
                                                                        {USAGE_STATUSES.filter(
                                                                            (st) => st !== table.status,
                                                                        ).map((st) => (
                                                                            <DropdownMenuItem
                                                                                key={st}
                                                                                onClick={() => changeTableStatus(table, st)}
                                                                            >
                                                                                {t(`status.usage.${st}`)}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={() => openEditTable(table)}>
                                                                            <Pencil className="h-4 w-4" />
                                                                            {t("common.edit")}
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                                {can("table.delete") && (
                                                                    <DropdownMenuItem
                                                                        className="text-destructive"
                                                                        onClick={() => setDeletingTable(table)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        {t("common.delete")}
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center gap-1 text-xs">
                                                    <Users className="h-3.5 w-3.5" />
                                                    {t("table.seats", { count: table.capacity })}
                                                </div>
                                                <div className="mt-1 text-xs font-medium">
                                                    {t(`status.usage.${table.status}`)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Form phòng */}
            <Dialog open={!!roomForm} onOpenChange={(v) => !saving && !v && setRoomForm(null)}>
                <DialogContent className="sm:max-w-lg">
                    {roomForm && (
                        <form onSubmit={submitRoom}>
                            <DialogHeader>
                                <DialogTitle>{editingRoom ? t("room.edit_room") : t("room.create_room")}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="room-name">{t("room.name")} *</Label>
                                    <Input
                                        id="room-name"
                                        required
                                        value={roomForm.name}
                                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t("room.type")}</Label>
                                    <Select
                                        value={roomForm.type}
                                        onValueChange={(v) => setRoomForm({ ...roomForm, type: v as RoomTypeEnum })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROOM_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {t(`status.room_type.${type}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="room-desc">{t("room.description_field")}</Label>
                                    <Textarea
                                        id="room-desc"
                                        value={roomForm.description || ""}
                                        onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={roomForm.is_active}
                                        onCheckedChange={(v) => setRoomForm({ ...roomForm, is_active: v === true })}
                                    />
                                    {t("room.active")}
                                </label>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setRoomForm(null)} disabled={saving}>
                                    {t("common.cancel")}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? t("common.processing") : t("common.save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Form bàn */}
            <Dialog open={!!tableForm} onOpenChange={(v) => !saving && !v && setTableForm(null)}>
                <DialogContent className="sm:max-w-md">
                    {tableForm && (
                        <form onSubmit={submitTable}>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingTable ? t("table.edit_table") : t("table.create_table")}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="table-name">{t("table.name")} *</Label>
                                    <Input
                                        id="table-name"
                                        required
                                        value={tableForm.name}
                                        onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="table-capacity">{t("table.capacity")}</Label>
                                    <Input
                                        id="table-capacity"
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={tableForm.capacity ?? ""}
                                        onChange={(e) =>
                                            setTableForm({ ...tableForm, capacity: Number(e.target.value) })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t("table.room")}</Label>
                                    <Select
                                        value={tableForm.room_id ? String(tableForm.room_id) : undefined}
                                        onValueChange={(v) => setTableForm({ ...tableForm, room_id: Number(v) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rooms.map((room) => (
                                                <SelectItem key={room.id} value={String(room.id)}>
                                                    {room.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t("table.status")}</Label>
                                    <Select
                                        value={tableForm.status}
                                        onValueChange={(v) =>
                                            setTableForm({ ...tableForm, status: v as UsageStatusEnum })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {USAGE_STATUSES.map((st) => (
                                                <SelectItem key={st} value={st}>
                                                    {t(`status.usage.${st}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setTableForm(null)} disabled={saving}>
                                    {t("common.cancel")}
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? t("common.processing") : t("common.save")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!imagesOf} onOpenChange={(v) => !v && setImagesOf(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("image.of", { name: imagesOf?.name })}</DialogTitle>
                    </DialogHeader>
                    {imagesOf && (
                        <ImageManager
                            key={`room-${imagesOf.id}`}
                            entityType="room"
                            entityId={imagesOf.id}
                            canEdit={can("room.update")}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deletingRoom}
                onOpenChange={(v) => !v && setDeletingRoom(null)}
                title={t("room.delete_title")}
                description={t("room.delete_desc", { name: deletingRoom?.name })}
                confirmLabel={t("common.delete")}
                onConfirm={() => run(() => deleteRoom(deletingRoom!.id))}
            />
            <ConfirmDialog
                open={!!deletingTable}
                onOpenChange={(v) => !v && setDeletingTable(null)}
                title={t("table.delete_title")}
                description={t("table.delete_desc", { name: deletingTable?.name })}
                confirmLabel={t("common.delete")}
                onConfirm={() => run(() => deleteTable(deletingTable!.id))}
            />
        </div>
    );
};

export default RoomsTables;
