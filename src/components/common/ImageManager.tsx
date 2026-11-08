import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";

import { deleteImage, getImages, reorderImages, setPrimaryImage, uploadImages } from "@/apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImageEntityEnum } from "@/enum";
import { useAsyncData } from "@/hooks";
import type { IImage } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;
const MAX_SIZE_MB = 5;

interface ImageManagerProps {
    entityType: ImageEntityEnum;
    entityId: number;
    canEdit: boolean;
    /** Gọi sau khi danh sách ảnh thay đổi (để trang cha cập nhật ảnh đại diện) */
    onChange?: (images: IImage[]) => void;
}

/** Xem, tải lên (nhiều ảnh), đặt ảnh đại diện và xóa ảnh của một đối tượng */
export const ImageManager = ({ entityType, entityId, canEdit, onChange }: ImageManagerProps) => {
    const { t } = useTranslation("admin");
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    // Kết quả mới nhất từ thao tác upload / xóa / đặt đại diện (ưu tiên hơn dữ liệu tải lần đầu)
    const [latest, setLatest] = useState<IImage[] | null>(null);

    const fetcher = useCallback(
        () =>
            getImages(entityType, entityId).then(
                (res) => res.data || [],
                (error) => {
                    toast.error(getErrorMessage(error));
                    throw error;
                },
            ),
        [entityType, entityId],
    );
    const { data, loading } = useAsyncData(fetcher);
    const images = latest ?? data ?? [];

    const run = async (action: () => Promise<{ message: string; data?: IImage[] }>) => {
        setBusy(true);
        try {
            const res = await action();
            const next = res.data || [];
            setLatest(next);
            onChange?.(next);
            toast.success(res.message);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    // ---- Sắp xếp: kéo thả (chuột) hoặc nút trái / phải (bàn phím, màn hình cảm ứng) ----
    const [dragId, setDragId] = useState<number | null>(null);
    const [overId, setOverId] = useState<number | null>(null);
    const canSort = canEdit && images.length > 1;

    /** Đưa ảnh `fromId` tới vị trí `toIndex`; hiển thị ngay, lỗi thì quay lại thứ tự cũ */
    const moveTo = async (fromId: number, toIndex: number) => {
        const from = images.findIndex((i) => i.id === fromId);
        if (from < 0 || toIndex < 0 || toIndex >= images.length || from === toIndex) return;
        const previous = images;
        const next = [...images];
        const [moved] = next.splice(from, 1);
        next.splice(toIndex, 0, moved);
        setLatest(next);
        setBusy(true);
        try {
            const res = await reorderImages(entityType, entityId, next.map((i) => i.id));
            setLatest(res.data || next);
            onChange?.(res.data || next);
        } catch (error) {
            setLatest(previous);
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const endDrag = () => {
        setDragId(null);
        setOverId(null);
    };

    const handleFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (inputRef.current) inputRef.current.value = "";
        if (files.length === 0) return;
        if (files.length > MAX_FILES) {
            toast.error(t("image.too_many", { max: MAX_FILES }));
            return;
        }
        if (files.some((f) => f.size > MAX_SIZE_MB * 1024 * 1024)) {
            toast.error(t("image.too_large", { size: MAX_SIZE_MB }));
            return;
        }
        // Backend trả ảnh vừa tải; tải lại toàn bộ danh sách để có thứ tự / ảnh đại diện mới nhất
        await run(async () => {
            const res = await uploadImages(entityType, entityId, files);
            const all = await getImages(entityType, entityId);
            return { message: res.message, data: all.data };
        });
    };

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("image.title")}</span>
                {canEdit && (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => inputRef.current?.click()}
                        >
                            <ImagePlus className="h-4 w-4" />
                            {busy ? t("common.processing") : t("image.upload")}
                        </Button>
                    </>
                )}
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : images.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    {t("image.empty")}
                </p>
            ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            draggable={canSort && !busy}
                            onDragStart={(e) => {
                                setDragId(img.id);
                                e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                                if (dragId === null) return;
                                e.preventDefault();
                                if (overId !== img.id) setOverId(img.id);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (dragId !== null) void moveTo(dragId, index);
                                endDrag();
                            }}
                            onDragEnd={endDrag}
                            className={cn(
                                "group relative aspect-square overflow-hidden rounded-md border",
                                img.is_primary && "ring-2 ring-primary",
                                canSort && "cursor-grab active:cursor-grabbing",
                                dragId === img.id && "opacity-40",
                                overId === img.id && dragId !== img.id && "ring-2 ring-sky-500",
                            )}
                        >
                            <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            {img.is_primary && (
                                <Badge className="absolute left-1 top-1 text-[10px]">{t("image.primary")}</Badge>
                            )}
                            {canSort && (
                                <GripVertical className="absolute right-1 top-1 h-4 w-4 text-white drop-shadow" aria-hidden />
                            )}
                            {canEdit && (
                                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                    {canSort && (
                                        <>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="secondary"
                                                className="mr-auto h-7 w-7"
                                                disabled={busy || index === 0}
                                                onClick={() => moveTo(img.id, index - 1)}
                                                aria-label={t("image.move_left")}
                                                title={t("image.move_left")}
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="secondary"
                                                className="h-7 w-7"
                                                disabled={busy || index === images.length - 1}
                                                onClick={() => moveTo(img.id, index + 1)}
                                                aria-label={t("image.move_right")}
                                                title={t("image.move_right")}
                                            >
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                    {!img.is_primary && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-7 w-7"
                                            disabled={busy}
                                            onClick={() => run(() => setPrimaryImage(img.id))}
                                            aria-label={t("image.set_primary")}
                                            title={t("image.set_primary")}
                                        >
                                            <Star className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="h-7 w-7"
                                        disabled={busy}
                                        onClick={() => run(() => deleteImage(img.id))}
                                        aria-label={t("common.delete")}
                                        title={t("common.delete")}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {canEdit && (
                <p className="text-xs text-muted-foreground">
                    {t("image.hint", { max: MAX_FILES, size: MAX_SIZE_MB })}
                    {canSort && ` ${t("image.sort_hint")}`}
                </p>
            )}
        </div>
    );
};

export default ImageManager;
