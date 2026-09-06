import type { ReactNode } from "react";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "positive" | "negative" | "accent" }) {
  const color =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num mt-1 text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "positive" | "negative" | "accent" | "warn" }) {
  const cls = {
    neutral: "bg-background text-muted border-border",
    positive: "bg-positive-soft text-positive border-transparent",
    negative: "bg-negative-soft text-negative border-transparent",
    accent: "bg-accent-soft text-accent border-transparent",
    warn: "bg-warn-soft text-warn border-transparent",
  }[tone];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const cls = {
    primary: "bg-accent text-white hover:opacity-90",
    secondary: "border border-border bg-card hover:bg-background",
    danger: "border border-border bg-card text-negative hover:bg-negative-soft",
    ghost: "text-muted hover:bg-background",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${cls} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft";

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

export function DiffText({ value }: { value: number }) {
  const cls = value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-muted";
  const sign = value > 0 ? "+" : "";
  return <span className={`num font-medium ${cls}`}>{sign}{Math.round(value).toLocaleString("ko-KR")}원</span>;
}

// 견적 vs 실제 가로 막대 비교
export function CompareBars({ rows, max }: { rows: Array<{ label: string; quote: number; actual: number }>; max?: number }) {
  const m = max ?? Math.max(1, ...rows.flatMap((r) => [r.quote, r.actual]));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{r.label}</span>
            <span className="num text-muted">
              견적 {Math.round(r.quote).toLocaleString("ko-KR")} / 실제 {Math.round(r.actual).toLocaleString("ko-KR")}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-2 rounded bg-background"><div className="h-2 rounded bg-accent" style={{ width: `${(r.quote / m) * 100}%` }} /></div>
            <div className="h-2 rounded bg-background"><div className="h-2 rounded bg-warn" style={{ width: `${(r.actual / m) * 100}%` }} /></div>
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded bg-accent" />견적</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded bg-warn" />실제</span>
      </div>
    </div>
  );
}
