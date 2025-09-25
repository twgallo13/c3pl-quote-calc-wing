// parse tolerant number from a string ('' -> 0)
export const parsePct = (s: string): number => {
    const n = parseFloat((s ?? '').toString().trim());
    return Number.isFinite(n) ? n : 0;
};

export const clamp0to100 = (n: number) => Math.max(0, Math.min(100, n));

// Convert counts to integer percentages that sum to 100 using Largest Remainder
// counts = [small, medium, large]
export function countsToPercents(counts: number[]): [number, number, number] {
    const total = counts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    if (total <= 0) return [0, 0, 0];
    const raw = counts.map(c => (c / total) * 100);
    const floors = raw.map(Math.floor);
    let sum = floors.reduce((a, b) => a + b, 0);
    // distribute the remaining points to the largest fractional parts
    const remainders = raw.map((r, i) => ({ i, frac: r - floors[i] }));
    remainders.sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < 100 - sum; k++) floors[remainders[k % 3].i] += 1;
    return floors as [number, number, number];
}

// Normalize 3 arbitrary numbers to 0..100 integers summing to 100
export function normalizePercentsTo100(vals: number[]): [number, number, number] {
    const clipped = vals.map(v => clamp0to100(Number.isFinite(v) ? v : 0));
    const sum = clipped.reduce((a, b) => a + b, 0);
    if (sum <= 0) return [0, 0, 0];
    const raw = clipped.map(v => (v / sum) * 100);
    const floors = raw.map(Math.floor);
    let base = floors.reduce((a, b) => a + b, 0);
    const remainders = raw.map((r, i) => ({ i, frac: r - floors[i] }));
    remainders.sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < 100 - base; k++) floors[remainders[k % 3].i] += 1;
    return floors as [number, number, number];
}
