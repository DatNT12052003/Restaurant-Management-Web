import { ROUTES } from "@/constants/routes";

export const getDashboardByRole = (role: string) => {
    switch (role) {
        case "admin":
            return ROUTES.ADMIN;

        case "manager":
            return ROUTES.MANAGER;

        case "cashier":
            return ROUTES.CASHIER;

        case "receptionist":
            return ROUTES.RECEPTIONIST;

        case "waitstaff":
            return ROUTES.WAITSTAFF;

        case "head_chef":
        case "sous_chef":
        case "commis_chef":
            return ROUTES.KITCHEN;

        default:
            return ROUTES.HOME;
    }
};
