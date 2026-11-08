/** Kiểu định dạng của một cột khi xuất Excel */
export type ExcelColumnType = "text" | "number" | "money" | "percent" | "quantity";

export interface IExcelColumn<T> {
    header: string;
    /** Giá trị của ô; null / undefined để trống */
    value: (row: T) => string | number | null | undefined;
    type?: ExcelColumnType;
    width?: number;
}

export interface IExcelSheet<T = unknown> {
    name: string;
    columns: IExcelColumn<T>[];
    rows: T[];
}

const NUM_FMT: Record<ExcelColumnType, string | undefined> = {
    text: undefined,
    number: "#,##0",
    money: '#,##0 "₫"',
    percent: "0.0%",
    quantity: "#,##0.###",
};

/** Tên sheet Excel: tối đa 31 ký tự, không chứa : \ / ? * [ ] */
const sheetName = (name: string, used: Set<string>) => {
    let base = name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31).trim() || "Sheet";
    let n = 2;
    while (used.has(base)) base = `${base.slice(0, 28)} ${n++}`;
    used.add(base);
    return base;
};

/**
 * Tạo và tải file .xlsx ngay trên trình duyệt từ dữ liệu báo cáo đang xem (giai đoạn 10).
 * `exceljs` được tải động khi người dùng bấm xuất, không nằm trong bundle chính.
 * `meta`: các dòng thông tin đặt đầu mỗi sheet (tiêu đề, khoảng ngày, chi nhánh).
 */
// Mỗi sheet có kiểu dòng riêng
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const downloadExcel = async (fileName: string, sheets: IExcelSheet<any>[], meta: string[] = []) => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    const used = new Set<string>();

    for (const sheet of sheets) {
        const ws = workbook.addWorksheet(sheetName(sheet.name, used));
        meta.forEach((line, i) => {
            ws.getCell(i + 1, 1).value = line;
            if (i === 0) ws.getCell(i + 1, 1).font = { bold: true, size: 13 };
        });
        const headerRow = meta.length ? meta.length + 2 : 1;
        sheet.columns.forEach((col, c) => {
            const cell = ws.getCell(headerRow, c + 1);
            cell.value = col.header;
            cell.font = { bold: true };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
            cell.border = { bottom: { style: "thin" } };
            ws.getColumn(c + 1).width = col.width ?? Math.max(12, Math.min(40, col.header.length + 4));
        });
        sheet.rows.forEach((row, r) => {
            sheet.columns.forEach((col, c) => {
                const cell = ws.getCell(headerRow + 1 + r, c + 1);
                const v = col.value(row);
                cell.value = v === undefined ? null : v;
                const fmt = NUM_FMT[col.type ?? "text"];
                if (fmt && typeof v === "number") cell.numFmt = fmt;
            });
        });
        ws.views = [{ state: "frozen", ySplit: headerRow }];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
