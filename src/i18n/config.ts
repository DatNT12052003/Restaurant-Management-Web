import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

i18n.use(HttpApi) // Tải các file json từ public/locales (nếu cần)
    .use(LanguageDetector) // Tự động phát hiện ngôn ngữ trình duyệt
    .use(initReactI18next) // Kết nối với React
    .init({
        fallbackLng: "en", // Ngôn ngữ mặc định khi không tìm thấy bản dịch
        preload: ["en", "vi"], // Tải sẵn các ngôn ngữ này khi ứng dụng khởi động
        debug: true,
        interpolation: {
            escapeValue: false, // React đã tự bảo mật chống XSS
        },
        ns: ["common", "auth", "validation"], // Namespace mặc định
        defaultNS: "common",
        backend: {
            loadPath: "/src/i18n/locales/{{lng}}/{{ns}}.json", // Đường dẫn file dịch
        },
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
            // Quan trọng: Hàm này giúp chuẩn hóa vi-VN -> vi
            convertDetectedLanguage: (lng) => lng.replace(/-[a-zA-Z0-9]+$/, ""),
        },
    });

export default i18n;
