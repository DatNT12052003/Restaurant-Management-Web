import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Clock, MapPin, Phone } from "lucide-react";

import { getPublicMenu } from "@/apis";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks";
import { getErrorMessage } from "@/lib/api-error";
import MenuList from "./MenuList";

/** Thực đơn công khai của một chi nhánh (giá và món đang bán của chi nhánh) */
const MenuPage = () => {
    const { t } = useTranslation("public");
    const restaurantId = Number(useParams().restaurantId);
    const fetcher = useCallback(async () => {
        try {
            return { menu: (await getPublicMenu(restaurantId)).data!, error: null };
        } catch (error) {
            return { menu: null, error: getErrorMessage(error) };
        }
    }, [restaurantId]);
    const { data, loading } = useAsyncData(fetcher);

    if (loading || !data) return <p className="text-muted-foreground">{t("common.loading")}</p>;
    if (!data.menu) return <p className="text-destructive">{data.error}</p>;
    const { restaurant, images } = data.menu;

    return (
        <div className="grid gap-4">
            {images.length > 0 && (
                <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4">
                    {images.map((src) => (
                        <img key={src} src={src} alt={restaurant.name} className="h-44 w-72 shrink-0 snap-start rounded-lg object-cover" />
                    ))}
                </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-bold">{restaurant.name}</h1>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-4" /> {restaurant.address}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Clock className="size-4" /> {restaurant.open_time} – {restaurant.close_time}
                        </span>
                        {restaurant.phone && (
                            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:underline">
                                <Phone className="size-4" /> {restaurant.phone}
                            </a>
                        )}
                    </p>
                </div>
                {restaurant.online_booking_enabled && (
                    <Button asChild>
                        <Link to={`/booking?restaurant=${restaurant.id}`}>
                            <CalendarCheck className="size-4" />
                            {t("home.book_here")}
                        </Link>
                    </Button>
                )}
            </div>
            <MenuList menu={data.menu} />
        </div>
    );
};

export default MenuPage;
