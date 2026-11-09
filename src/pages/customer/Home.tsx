import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Clock, MapPin, Phone, UtensilsCrossed } from "lucide-react";

import { getPublicRestaurants } from "@/apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncData } from "@/hooks";

/** Trang chủ cho khách: các chi nhánh, xem thực đơn, đặt bàn */
const Home = () => {
    const { t } = useTranslation("public");
    const fetcher = useCallback(async () => (await getPublicRestaurants()).data ?? [], []);
    const { data: restaurants = [], loading } = useAsyncData(fetcher);

    return (
        <div className="grid gap-6">
            <section className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-10 text-white shadow">
                <h1 className="text-3xl font-bold">{t("home.title")}</h1>
                <p className="mt-2 max-w-xl text-white/90">{t("home.subtitle")}</p>
                <Button asChild size="lg" variant="secondary" className="mt-4">
                    <Link to="/booking">
                        <CalendarCheck className="size-4" />
                        {t("home.cta")}
                    </Link>
                </Button>
            </section>

            <section className="grid gap-3">
                <h2 className="text-xl font-semibold">{t("home.branches")}</h2>
                {loading && <p className="text-muted-foreground">{t("common.loading")}</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                    {restaurants.map((r) => (
                        <Card key={r.id} className="overflow-hidden">
                            {r.image_url ? (
                                <img src={r.image_url} alt={r.name} className="h-40 w-full object-cover" />
                            ) : (
                                <div className="flex h-40 items-center justify-center bg-muted">
                                    <UtensilsCrossed className="size-10 text-muted-foreground" />
                                </div>
                            )}
                            <CardContent className="grid gap-2 py-4">
                                <h3 className="text-lg font-semibold">{r.name}</h3>
                                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <MapPin className="mt-0.5 size-4 shrink-0" />
                                    {r.address}
                                </p>
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="size-4" />
                                    {r.open_time} – {r.close_time}
                                </p>
                                {r.phone && (
                                    <a href={`tel:${r.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:underline">
                                        <Phone className="size-4" />
                                        {r.phone}
                                    </a>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button asChild variant="outline">
                                        <Link to={`/menu/${r.id}`}>{t("home.view_menu")}</Link>
                                    </Button>
                                    {r.online_booking_enabled && (
                                        <Button asChild>
                                            <Link to={`/booking?restaurant=${r.id}`}>{t("home.book_here")}</Link>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
