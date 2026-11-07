import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { createTag, deleteTag, getTags, updateTag } from "@/apis";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAsyncData, usePermission } from "@/hooks";
import type { ITag } from "@/interfaces";
import { getErrorMessage } from "@/lib/api-error";

/** Thẻ phân loại món (gà, bò, hải sản, cay, chay...) */
const TagsTab = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();

    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [busy, setBusy] = useState(false);
    const [deleting, setDeleting] = useState<ITag | null>(null);

    const fetcher = useCallback(
        () =>
            getTags().catch((error) => {
                toast.error(getErrorMessage(error));
                throw error;
            }),
        [],
    );
    const { data, loading, reload } = useAsyncData(fetcher);
    const tags = data?.data || [];

    const run = async (action: () => Promise<{ message: string }>, after?: () => void) => {
        setBusy(true);
        try {
            const res = await action();
            toast.success(res.message);
            after?.();
            reload();
        } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
        } finally {
            setBusy(false);
        }
    };

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        run(() => createTag(newName.trim()), () => setNewName("")).catch(() => undefined);
    };

    const saveEdit = (tag: ITag) => {
        if (!editName.trim() || editName.trim() === tag.name) {
            setEditingId(null);
            return;
        }
        run(() => updateTag(tag.id, editName.trim()), () => setEditingId(null)).catch(() => undefined);
    };

    return (
        <Card>
            <CardContent>
                {can("dish.create") && (
                    <form onSubmit={add} className="mb-4 flex gap-2">
                        <Input
                            placeholder={t("menu.new_tag_placeholder")}
                            value={newName}
                            maxLength={100}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <Button type="submit" disabled={busy || !newName.trim()}>
                            <Plus className="h-4 w-4" />
                            {t("menu.add_tag")}
                        </Button>
                    </form>
                )}

                {loading ? (
                    <p className="text-muted-foreground">{t("common.loading")}</p>
                ) : tags.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">{t("common.no_data")}</p>
                ) : (
                    <div className="divide-y">
                        {tags.map((tag) => (
                            <div key={tag.id} className="flex items-center gap-2 py-2">
                                {editingId === tag.id ? (
                                    <>
                                        <Input
                                            autoFocus
                                            value={editName}
                                            maxLength={100}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") saveEdit(tag);
                                                if (e.key === "Escape") setEditingId(null);
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            disabled={busy}
                                            onClick={() => saveEdit(tag)}
                                            aria-label={t("common.save")}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setEditingId(null)}
                                            aria-label={t("common.cancel")}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 font-medium">{tag.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {t("menu.dish_count", { count: tag.dish_count ?? 0 })}
                                        </span>
                                        {can("dish.update") && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingId(tag.id);
                                                    setEditName(tag.name);
                                                }}
                                                aria-label={t("common.edit")}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {can("dish.delete") && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setDeleting(tag)}
                                                aria-label={t("common.delete")}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <ConfirmDialog
                    open={!!deleting}
                    onOpenChange={(v) => !v && setDeleting(null)}
                    title={t("menu.delete_tag_title")}
                    description={t("menu.delete_tag_desc", { name: deleting?.name, count: deleting?.dish_count ?? 0 })}
                    confirmLabel={t("common.delete")}
                    onConfirm={() => run(() => deleteTag(deleting!.id))}
                />
            </CardContent>
        </Card>
    );
};

export default TagsTab;
