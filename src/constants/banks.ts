/** Giai đoạn 14: ngân hàng phổ biến theo mã BIN của NAPAS (dùng cho VietQR). Ngân hàng khác: nhập BIN trực tiếp. */
export const BANKS: { bin: string; name: string }[] = [
    { bin: "970436", name: "Vietcombank" },
    { bin: "970415", name: "VietinBank" },
    { bin: "970418", name: "BIDV" },
    { bin: "970405", name: "Agribank" },
    { bin: "970407", name: "Techcombank" },
    { bin: "970422", name: "MB Bank" },
    { bin: "970416", name: "ACB" },
    { bin: "970432", name: "VPBank" },
    { bin: "970423", name: "TPBank" },
    { bin: "970403", name: "Sacombank" },
    { bin: "970441", name: "VIB" },
    { bin: "970443", name: "SHB" },
    { bin: "970437", name: "HDBank" },
    { bin: "970426", name: "MSB" },
    { bin: "970448", name: "OCB" },
    { bin: "970431", name: "Eximbank" },
    { bin: "970440", name: "SeABank" },
    { bin: "970449", name: "LPBank" },
    { bin: "970428", name: "Nam A Bank" },
    { bin: "970409", name: "Bac A Bank" },
    { bin: "970425", name: "ABBANK" },
    { bin: "970454", name: "BVBank" },
    { bin: "970412", name: "PVcomBank" },
    { bin: "970452", name: "KienlongBank" },
];

export const bankName = (bin: string | null | undefined) => BANKS.find((b) => b.bin === bin)?.name ?? bin ?? "";
