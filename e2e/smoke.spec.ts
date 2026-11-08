import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
import { expect, test, type Page } from "@playwright/test";

interface Fixture {
    password: string;
    users: Record<string, string>;
}
const fixture = (): Fixture => JSON.parse(fs.readFileSync(path.join(HERE, ".fixture.json"), "utf8"));

/** Ghi lại lỗi console / lỗi JS của trang để kiểm tra sau mỗi lần mở trang */
const watchErrors = (page: Page) => {
    const errors: string[] = [];
    page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    return errors;
};

const login = async (page: Page, username: string, password = fixture().password) => {
    await page.goto("/login");
    await page.evaluate(() => localStorage.setItem("i18nextLng", "vi"));
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/\/admin/);
};

/** Trang mỗi vai trò được vào (theo quyền mặc định của seed) */
const PAGES: Record<string, string[]> = {
    admin: [
        "dashboard",
        "restaurants",
        "employees",
        "guests",
        "tables",
        "reservations",
        "permissions",
        "accounts",
        "menu",
        "orders",
        "kitchen",
        "cashier",
        "discounts",
        "inventory",
        "reports",
        "audit-logs",
        "profile",
    ],
    manager: ["dashboard", "employees", "tables", "reservations", "accounts", "orders", "cashier", "inventory", "reports", "audit-logs"],
    cashier: ["dashboard", "orders", "cashier", "reservations"],
    receptionist: ["dashboard", "reservations", "orders", "guests"],
    waiter: ["dashboard", "orders", "reservations", "menu"],
    chef: ["dashboard", "kitchen", "inventory", "menu"],
};

for (const [role, pages] of Object.entries(PAGES)) {
    test(`${role}: mở mọi trang được phép, không có lỗi`, async ({ page }) => {
        // Admin cần chọn chi nhánh ở một số trang; dùng chi nhánh đầu tiên như người dùng thật
        const errors = watchErrors(page);
        await login(page, fixture().users[role]);
        for (const p of pages) {
            await page.goto(`/admin/${p}`);
            await page.waitForLoadState("networkidle");
            await expect(page, `${role} -> ${p}`).toHaveURL(new RegExp(`/admin/${p}`));
            await expect(page.locator("main h2, h2").first(), `${role} -> ${p}`).toBeVisible();
        }
        expect(errors, `${role}: lỗi console`).toEqual([]);
    });
}

test("phục vụ không vào được trang Tài khoản", async ({ page }) => {
    await login(page, fixture().users.waiter);
    await page.goto("/admin/accounts");
    await expect(page).toHaveURL(/unauthorized/);
});

test("admin sửa giờ mở cửa của nhà hàng (PATCH qua CORS)", async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, fixture().users.admin);
    await page.goto("/admin/restaurants");
    await page.getByRole("button", { name: "Sửa" }).first().click();
    await page.locator("#r-open").fill("09:30");
    const response = page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().includes("/restaurants/"));
    await page.getByRole("dialog").locator("button[type=submit]").click();
    expect((await response).status()).toBe(200);
    expect(errors).toEqual([]);
});

test("luồng phục vụ: mở order, gọi món, bếp làm, phục vụ, thu tiền", async ({ browser }) => {
    const f = fixture();
    const session = async (role: string) => {
        const context = await browser.newContext({ locale: "vi-VN" });
        const page = await context.newPage();
        const errors = watchErrors(page);
        await login(page, f.users[role]);
        return { page, errors, context };
    };

    // Phục vụ mở order trên bàn B2 và gửi một phần phở
    const waiter = await session("waiter");
    await waiter.page.goto("/admin/orders");
    await waiter.page.getByRole("button", { name: /^B2/ }).click();
    await waiter.page.getByRole("dialog").getByRole("button", { name: "Mở order" }).click();
    await waiter.page.getByRole("button", { name: "Gọi món" }).click();
    // Hộp thoại gọi món mở chồng lên panel order (cả hai đều là dialog): lấy cái trên cùng
    const round = waiter.page.getByRole("dialog").last();
    await round.getByText("Phở bò").first().click();
    await round.getByRole("button", { name: "Gửi bếp" }).click();
    await expect(waiter.page.getByText("Đợt 1")).toBeVisible();

    // Bếp nhận món ngay (cập nhật qua socket hoặc tải trang), làm luôn rồi xong
    const chef = await session("chef");
    await chef.page.goto("/admin/kitchen");
    await expect(chef.page.getByText("Phở bò").first()).toBeVisible();
    await chef.page.getByRole("button", { name: "Làm luôn" }).first().click();
    await chef.page.getByRole("button", { name: "Xong" }).first().click();
    await expect(chef.page.getByRole("button", { name: "Xong" })).toHaveCount(0);

    // Phục vụ mang món ra (màn hình phục vụ tự cập nhật qua socket)
    await waiter.page.getByRole("button", { name: /Phục vụ 1 món đã xong/ }).click();
    await expect(waiter.page.getByText(/Đã phục vụ 1 món/)).toBeVisible();

    // Thu ngân thu đủ bằng tiền mặt; order tự hoàn tất
    const cashier = await session("cashier");
    await cashier.page.goto("/admin/cashier");
    await cashier.page.getByRole("button", { name: /B2/ }).first().click();
    const collect = cashier.page.getByRole("button", { name: /^Thu 60\.000/ });
    await collect.click();
    await expect(cashier.page.getByText("Chọn một order để thanh toán.").or(cashier.page.getByText(/Đã thu đủ|hoàn tất/i)).first()).toBeVisible();

    for (const s of [waiter, chef, cashier]) {
        expect(s.errors).toEqual([]);
        await s.context.close();
    }
});

test("tài khoản bị khóa thấy thông báo khóa; quản lý mở khóa xong đăng nhập được", async ({ page }) => {
    const f = fixture();
    await page.goto("/login");
    await page.evaluate(() => localStorage.setItem("i18nextLng", "vi"));
    await page.locator("#username").fill(f.users.locked);
    await page.locator("#password").fill(f.password);
    await page.locator("button[type=submit]").click();
    await expect(page.getByText(/tạm khóa/i)).toBeVisible();

    await login(page, f.users.manager);
    await page.goto("/admin/accounts");
    await page.getByRole("button", { name: "Mở khóa" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Mở khóa" }).click();
    await expect(page.getByText(/Đã mở khóa/)).toBeVisible();

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await login(page, f.users.locked);
});
