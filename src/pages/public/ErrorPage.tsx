import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
    code: "403" | "404";
}

const ErrorPage = ({ code }: ErrorPageProps) => {
    const { t } = useTranslation("common");
    const key = code === "403" ? "unauthorized" : "not_found";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
            <p className="text-6xl font-bold text-emerald-600">{code}</p>
            <h1 className="text-2xl font-semibold">{t(`${key}.title`)}</h1>
            <p className="max-w-md text-muted-foreground">{t(`${key}.description`)}</p>
            <Button asChild>
                <Link to="/" replace>
                    {t("back_home")}
                </Link>
            </Button>
        </div>
    );
};

export const UnauthorizedPage = () => <ErrorPage code="403" />;
export const NotFoundPage = () => <ErrorPage code="404" />;

export default ErrorPage;
