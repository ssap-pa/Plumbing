export function won(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return "-";
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

export function pct(r: number | undefined | null, digits = 1): string {
  if (r === undefined || r === null || !Number.isFinite(r)) return "-";
  return `${(r * 100).toFixed(digits)}%`;
}

export function hours(h: number | undefined | null): string {
  if (h === undefined || h === null || !Number.isFinite(h)) return "-";
  return `${Number(h.toFixed(1))}시간`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
