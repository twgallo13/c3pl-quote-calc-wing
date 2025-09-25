// utils/num.ts
export const toNumber = (s: string | number | null | undefined): number => {
    if (s === '' || s == null) return 0;
    const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
};
