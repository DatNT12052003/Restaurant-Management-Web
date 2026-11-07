/** Trạng thái order (đặc tả 4.7) */
export type OrderStatusEnum = "pending" | "confirmed" | "serving" | "completed" | "cancelled";

/** Trạng thái món / combo trong order */
export type OrderItemStatusEnum = "pending" | "confirmed" | "cooking" | "ready" | "served" | "cancelled";

/** Nơi chế biến: bếp hoặc quầy pha chế */
export type KitchenStationEnum = "kitchen" | "bar";
