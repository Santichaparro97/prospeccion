"use client";

import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-bg-elev ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "var(--fg)",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </div>
      <div
        className="mt-2 text-3xl font-semibold tabular"
        style={{ color: accent }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-fg-dim tabular">{sub}</div>}
    </Card>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "subtle" | "green";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  const variants = {
    primary: "bg-accent text-white hover:bg-blue-500",
    green: "bg-green text-white hover:brightness-110",
    ghost:
      "border border-border-soft text-fg hover:bg-bg-elev-2 hover:border-fg-dim",
    subtle: "text-fg-muted hover:text-fg hover:bg-bg-elev-2",
    danger: "border border-red/40 text-red hover:bg-red/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-fg-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-fg-dim">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-soft border-t-accent" />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-fg-dim">{children}</div>;
}

export function Toast({ msg }: { msg: string | null }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-lg bg-green px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all ${
        msg ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      {msg}
    </div>
  );
}
