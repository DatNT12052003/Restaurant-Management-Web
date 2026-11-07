import type { ImageEntityEnum } from "@/enum";
import type { IImage, IResponse } from "@/interfaces";
import api from "./axios";
import { MULTIPART, unwrap } from "./request";

export const getImages = (entityType: ImageEntityEnum, entityId: number): Promise<IResponse<IImage[]>> =>
    unwrap(api.get("/images", { params: { entity_type: entityType, entity_id: entityId } }));

/** Tải nhiều ảnh cùng lúc (tối đa 10, mỗi ảnh tối đa 5 MB) */
export const uploadImages = (
    entityType: ImageEntityEnum,
    entityId: number,
    files: File[],
): Promise<IResponse<IImage[]>> => {
    const form = new FormData();
    form.append("entity_type", entityType);
    form.append("entity_id", String(entityId));
    files.forEach((file) => form.append("images", file));
    return unwrap(api.post("/images", form, MULTIPART));
};

/** Trả về danh sách ảnh mới của đối tượng */
export const setPrimaryImage = (id: number): Promise<IResponse<IImage[]>> =>
    unwrap(api.patch(`/images/${id}/primary`));

/** Trả về danh sách ảnh còn lại của đối tượng */
export const deleteImage = (id: number): Promise<IResponse<IImage[]>> => unwrap(api.delete(`/images/${id}`));
