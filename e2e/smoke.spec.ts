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
        "purchasing",
        "workforce",
        "attendance-kiosk",
        "reports",
        "audit-logs",
        "profile",
    ],
    manager: ["dashboard", "employees", "tables", "reservations", "accounts", "orders", "cashier", "inventory", "purchasing", "workforce", "my-work", "reports", "audit-logs"],
    cashier: ["dashboard", "orders", "cashier", "reservations", "my-work", "attendance-kiosk"],
    receptionist: ["dashboard", "reservations", "orders", "guests", "my-work"],
    waiter: ["dashboard", "orders", "reservations", "menu", "my-work"],
    chef: ["dashboard", "kitchen", "inventory", "menu", "purchasing", "workforce", "my-work"],
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

test("giai đoạn 10: bếp trưởng sửa định lượng ở tab Giá vốn", async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, fixture().users.chef);
    await page.goto("/admin/menu");
    await page.getByRole("tab", { name: "Giá vốn" }).click();
    await page.getByRole("row", { name: /Phở bò/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Định lượng: Phở bò")).toBeVisible();
    await dialog.getByRole("combobox", { name: "Thêm nguyên liệu..." }).click();
    await page.getByRole("option", { name: /Thịt bò/ }).click();
    await dialog.getByRole("button", { name: "Thêm" }).click();
    await dialog.getByLabel("Định lượng Thịt bò").fill("0.15");
    const response = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/recipes/dishes/"));
    await dialog.getByRole("button", { name: "Lưu" }).click();
    expect((await response).status()).toBe(200);
    expect(errors).toEqual([]);
});

test("giai đoạn 10: quản lý xem tab Lợi nhuận, Hao hụt và xuất Excel", async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, fixture().users.manager);
    await page.goto("/admin/reports");
    await page.getByRole("tab", { name: "Lợi nhuận" }).click();
    await expect(page.getByText("Giá vốn và lãi gộp theo thời gian")).toBeVisible();
    await page.getByRole("tab", { name: "Hao hụt" }).click();
    await expect(page.getByText("Tiêu hao lý thuyết và kiểm kê")).toBeVisible();
    await page.getByRole("tab", { name: "Doanh thu" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất Excel" }).click();
    expect((await download).suggestedFilename()).toMatch(/^doanh-thu_.*\.xlsx$/);
    expect(errors).toEqual([]);
});

test("giai đoạn 11: quản lý thêm nhà cung cấp, đặt hàng, nhận hàng và trả công nợ", async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, fixture().users.manager);
    await page.goto("/admin/purchasing");

    // Nhà cung cấp
    await page.getByRole("tab", { name: "Nhà cung cấp" }).click();
    await page.getByRole("button", { name: "Thêm nhà cung cấp" }).click();
    await page.locator("#sp-name").fill("NCC Thịt Sạch E2E");
    await page.locator("#sp-terms").fill("10");
    await page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("cell", { name: /NCC Thịt Sạch E2E/ })).toBeVisible();

    // Lập đơn và gửi
    await page.getByRole("tab", { name: "Đơn đặt hàng" }).click();
    await page.getByRole("button", { name: "Lập đơn" }).click();
    const form = page.getByRole("dialog");
    await form.getByRole("combobox", { name: "Nhà cung cấp" }).click();
    await page.getByRole("option", { name: "NCC Thịt Sạch E2E" }).click();
    await form.getByRole("combobox").filter({ hasText: "Chọn nguyên liệu" }).click();
    await page.getByRole("option", { name: /Thịt bò/ }).click();
    await form.locator('input[type="number"]').nth(1).fill("5");
    await form.locator('input[type="number"]').nth(2).fill("200000");
    await form.getByRole("button", { name: "Lưu và gửi" }).click();

    // Chi tiết đơn mở sau khi lưu: nhận đủ hàng
    const detail = page.getByRole("dialog");
    await expect(detail.getByText("Đã gửi")).toBeVisible();
    await detail.getByRole("button", { name: "Nhận hàng" }).click();
    const received = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/receive"));
    await detail.getByRole("button", { name: "Xác nhận nhận hàng" }).click();
    expect((await received).status()).toBe(200);
    await expect(detail.getByText("Đã nhận đủ")).toBeVisible();
    await page.keyboard.press("Escape");

    // Công nợ: trả hết khoản vừa phát sinh
    await page.getByRole("tab", { name: "Công nợ" }).click();
    await page.getByRole("row", { name: /NCC Thịt Sạch E2E/ }).click();
    const paid = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/payments"));
    await page.getByRole("dialog").getByRole("button", { name: /Ghi nhận trả/ }).click();
    expect((await paid).status()).toBe(200);
    await expect(page.getByRole("dialog").getByText("1.000.000 ₫").first()).toBeVisible();
    expect(errors).toEqual([]);
});

test("giai đoạn 11: bếp trưởng mở tab lô hàng, chuyển kho và phiếu hủy hàng", async ({ page }) => {
    const errors = watchErrors(page);
    await login(page, fixture().users.chef);
    await page.goto("/admin/inventory");
    await page.getByRole("tab", { name: "Lô & hạn dùng" }).click();
    await expect(page.getByText("Lô còn hàng")).toBeVisible();
    await page.getByRole("tab", { name: "Chuyển kho" }).click();
    await page.getByRole("button", { name: "Chuyển kho" }).click();
    await expect(page.getByRole("dialog").getByText("Chi nhánh nhận *")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Tồn kho" }).click();
    await page.getByRole("button", { name: "Hủy hàng" }).click();
    await expect(page.getByRole("dialog").getByText("Phiếu hủy hàng")).toBeVisible();
    expect(errors).toEqual([]);
});

test("giai đoạn 12: quản lý tạo ca mẫu và xếp ca; thu ngân mở màn hình chấm công; phục vụ quét mã vào ca", async ({ browser, playwright }) => {
    const f = fixture();
    const session = async (role: string) => {
        const context = await browser.newContext({ locale: "vi-VN" });
        const page = await context.newPage();
        const errors = watchErrors(page);
        await login(page, f.users[role]);
        return { page, errors, context };
    };

    // Quản lý: ca mẫu, rồi xếp một ca cho phục vụ vào thứ Hai của tuần đang xem
    const manager = await session("manager");
    await manager.page.goto("/admin/workforce");
    await manager.page.getByRole("button", { name: "Ca mẫu" }).click();
    await manager.page.getByRole("button", { name: "Thêm ca mẫu" }).click();
    await manager.page.locator("#tpl-name").fill("Ca sáng E2E");
    await manager.page.locator("#tpl-start").fill("08:00");
    await manager.page.locator("#tpl-end").fill("16:00");
    await manager.page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    await expect(manager.page.getByRole("dialog").getByText("Ca sáng E2E")).toBeVisible();
    await manager.page.keyboard.press("Escape");

    await manager.page.getByRole("button", { name: "Xếp ca" }).click();
    const form = manager.page.getByRole("dialog");
    await form.getByRole("combobox").filter({ hasText: "Chọn nhân viên" }).click();
    await manager.page.getByRole("option", { name: `User ${f.users.waiter}` }).click();
    await form.getByRole("heading", { name: "Xếp ca" }).click();
    await form.getByRole("checkbox").first().click();
    const created = manager.page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/hr/shifts"));
    await form.getByRole("button", { name: "Tạo 1 ca" }).click();
    expect((await created).status()).toBe(201);
    await expect(manager.page.getByRole("button", { name: /08:00–16:00/ }).first()).toBeVisible();

    // Thu ngân mở màn hình chấm công: mã QR hiện ra
    const cashier = await session("cashier");
    await cashier.page.goto("/admin/attendance-kiosk");
    await expect(cashier.page.getByTestId("attendance-qr")).toBeVisible();

    // Mã trong QR (lấy qua API như màn hình chấm công) -> phục vụ mở đường dẫn chấm công
    const apiContext = await playwright.request.newContext({ baseURL: "http://localhost:3100/api/" });
    const auth = await apiContext.post("auth/login", { data: { username: f.users.cashier, password: f.password } });
    const accessToken = (await auth.json()).data.access_token;
    const qr = await apiContext.get("hr/attendance/qr", { headers: { Authorization: `Bearer ${accessToken}` } });
    const token = (await qr.json()).data.token as string;
    await apiContext.dispose();

    const waiter = await session("waiter");
    await waiter.page.goto(`/admin/clock?t=${encodeURIComponent(token)}`);
    await expect(waiter.page.getByText(/Đã vào ca lúc/)).toBeVisible();
    await waiter.page.goto("/admin/my-work");
    await expect(waiter.page.getByText(/Đang trong ca từ/)).toBeVisible();

    // Quản lý thấy lượt chấm công đang mở
    await manager.page.getByRole("tab", { name: "Chấm công" }).click();
    await expect(manager.page.getByRole("row", { name: new RegExp(`User ${f.users.waiter}.*đang trong ca`) })).toBeVisible();

    for (const s of [manager, cashier, waiter]) {
        expect(s.errors).toEqual([]);
        await s.context.close();
    }
});
