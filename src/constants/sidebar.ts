export const sidebarByRole = {
    admin: [
        { label: "Dashboard", path: "/admin" },
        { label: "Users", path: "/admin/users" },
        { label: "Reports", path: "/admin/reports" },
    ],

    cashier: [
        { label: "Billing", path: "/cashier" },
        { label: "Transactions", path: "/cashier/history" },
    ],

    receptionist: [
        { label: "Bookings", path: "/receptionist" },
        { label: "Tables", path: "/receptionist/tables" },
    ],
};
