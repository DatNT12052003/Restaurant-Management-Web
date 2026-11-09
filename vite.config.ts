import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

/**
 * Giai đoạn 14: i18next tải bản dịch qua HTTP từ `/src/i18n/locales/...` (dev server phục vụ thẳng thư mục src).
 * Bản build không có thư mục này, nên chép các file JSON vào `dist/src/i18n/locales` để bản production dùng cùng đường dẫn.
 */
const copyLocales = (): Plugin => {
    let outDir = "dist";
    return {
        name: "copy-i18n-locales",
        apply: "build",
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
        },
        closeBundle() {
            const from = path.resolve(__dirname, "src/i18n/locales");
            fs.cpSync(from, path.join(outDir, "src/i18n/locales"), { recursive: true });
        },
    };
};

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), copyLocales()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
