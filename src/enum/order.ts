/** Trạng thái order (đặc tả 4.7) */
/** `merged`: đã gộp vào order khác (giai đoạn 9) */
export type OrderStatusEnum = "pending" | "confirmed" | "serving" | "completed" | "cancelled" | "merged";

/** Trạng thái món / combo trong order */
export type OrderItemStatusEnum = "pending" | "confirmed" | "cooking" | "ready" | "served" | "cancelled";

/** Nơi chế biến: bếp hoặc quầy pha chế */
export type KitchenStationEnum = "kitchen" | "bar";
