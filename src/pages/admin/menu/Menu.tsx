import { useTranslation } from "react-i18next";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, usePermission } from "@/hooks";
import BranchMenuTab from "./BranchMenuTab";
import CombosTab from "./CombosTab";
import CostsTab from "./CostsTab";
import DishesTab from "./DishesTab";
import TagsTab from "./TagsTab";

/** Thực đơn chung của chuỗi (món, combo, thẻ) và thực đơn từng chi nhánh */
const Menu = () => {
    const { t } = useTranslation("admin");
    const can = usePermission();
    const roles = useAppSelector((s) => s.auth.roles);
    const currentBranch = useAppSelector((s) => s.restaurant.currentBranch);

    const tabs = [
        can("dish.view") && { value: "dishes", label: t("menu.tab_dishes"), content: <DishesTab /> },
        can("combo.view") && { value: "combos", label: t("menu.tab_combos"), content: <CombosTab /> },
        can("dish.view") && { value: "tags", label: t("menu.tab_tags"), content: <TagsTab /> },
        can("dish.view") && {
            value: "branch",
            label:
                roles.includes("admin") && currentBranch
                    ? t("menu.tab_branch_named", { name: currentBranch.name })
                    : t("menu.tab_branch"),
            content: <BranchMenuTab />,
        },
        can("recipe.view") && { value: "costs", label: t("recipe.tab"), content: <CostsTab /> },
    ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[];

    return (
        <div>
            <PageHeader title={t("menu.title")} description={t("menu.description")} />
            <Tabs defaultValue={tabs[0]?.value}>
                <TabsList className="mb-4 flex-wrap">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default Menu;
