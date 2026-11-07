import useAppSelector from "./useAppSelector";

/**
 * Kiểm tra quyền của người dùng hiện tại để ẩn/hiện giao diện.
 * Chỉ hỗ trợ UI — backend vẫn kiểm tra quyền ở từng API.
 *
 * - `usePermission("room.update")` -> boolean
 * - `usePermission(["room.update", "room.delete"])` -> true nếu có ít nhất một quyền
 * - Không truyền tham số -> trả về hàm `can(permission)`
 */
export function usePermission(required: string | string[]): boolean;
export function usePermission(): (required: string | string[]) => boolean;
export function usePermission(required?: string | string[]) {
    const permissions = useAppSelector((state) => state.auth.permissions);
    const can = (perm: string | string[]) =>
        (Array.isArray(perm) ? perm : [perm]).some((p) => permissions.includes(p));
    return required === undefined ? can : can(required);
}

export default usePermission;
