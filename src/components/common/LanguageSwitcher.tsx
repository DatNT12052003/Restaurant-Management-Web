// components/LanguageSwitcher.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Languages, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import vnFlag from "@/assets/images/vn-flag.png";
import ukFlag from "@/assets/images/uk-flag.png";

const languages = [
    { code: "vi", label: "Tiếng Việt", flag: vnFlag },
    { code: "en", label: "English", flag: ukFlag },
];

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();
    const currentLang = languages.find((lang) => lang.code === i18n.language) || languages[0];

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-amber-200 bg-white/80 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-800/80 dark:hover:bg-slate-700 px-3 py-5 min-w-[140px]"
                >
                    {currentLang.flag && <img src={currentLang.flag} alt={currentLang.label} className="h-5 w-7" />}
                    <span className="hidden sm:inline">{currentLang.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`gap-2 cursor-pointer px-3 py-2 ${
                            i18n.language === lang.code
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : ""
                        }`}
                    >
                        <img src={lang.flag} alt={lang.label} className="h-5 w-7" />
                        <span>{lang.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
