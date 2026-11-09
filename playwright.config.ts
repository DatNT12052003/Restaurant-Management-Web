import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test giao diện: chạy backend thật trên DB test (`restaurant_management_test`) và Vite ở cổng riêng,
 * để không đụng tới dev server đang chạy ở 3000 / 5173.
 *
 *   npm run test:e2e        (cần repo backend ở ../Restaurant-Management-BackEnd, hoặc đặt BACKEND_DIR)
 */
const BACKEND_DIR = process.env.BACKEND_DIR ?? path.resolve(HERE, "../Restaurant-Management-BackEnd");
const API_PORT = 3100;
const WEB_PORT = 5180;

export default defineConfig({
    testDir: "e2e",
    // Các test dùng chung một DB: chạy tuần tự
    workers: 1,
    fullyParallel: false,
    retries: 0,
    reporter: [["list"]],
    timeout: 60_000,
    globalSetup: "./e2e/global-setup.ts",
    use: {
        baseURL: `http://localhost:${WEB_PORT}`,
        locale: "vi-VN",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            command: "npx tsx src/server.ts",
            cwd: BACKEND_DIR,
            url: `http://localhost:${API_PORT}/api/auth/me`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                PORT: String(API_PORT),
                DB_NAME: "restaurant_management_test",
                NODE_ENV: "test",
                RATE_LIMIT_DISABLED: "true",
                CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
                DOTENV_CONFIG_QUIET: "true",
                // Giai đoạn 14: test gửi webhook SePay giả lập
                SEPAY_WEBHOOK_API_KEY: "e2e-sepay-key",
            },
        },
        {
            command: `npx vite --port ${WEB_PORT} --strictPort`,
            url: `http://localhost:${WEB_PORT}`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                VITE_API_URL: `http://localhost:${API_PORT}/api`,
                VITE_SOCKET_URL: `http://localhost:${API_PORT}`,
            },
        },
    ],
});
