import React from "react";
import { cn } from "@/lib/utils";

/** Compact POS document workspace */
export function PosShell({ children, className }) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-3 pb-4", className)}>
      {children}
    </div>
  );
}

export function PosHeader({ title, subtitle, icon, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-emerald">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
      ) : null}
    </div>
  );
}

/** Main + sticky summary — flex so panes never overlap */
export function PosBody({ children, className }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PosMain({ children, className }) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Document fields — equal columns. Footer (notes) is full width below.
 */
export function PosDocBar({ title, children, footer, className }) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-soft",
        className
      )}
    >
      {title ? (
        <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-3 py-2">
          <span className="h-4 w-1 rounded-full bg-gradient-primary" />
          <h2 className="eyebrow">{title}</h2>
        </div>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0">
        {children}
      </div>
      {footer ? (
        <div className="min-w-0 border-t border-border bg-muted/30 p-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function PosItems({ title, count, actions, children, className }) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent px-3 py-2">
        <h2 className="eyebrow flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-gradient-primary" />
          {title}
          {typeof count === "number" ? (
            <span className="ms-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {count}
            </span>
          ) : null}
        </h2>
        {actions}
      </div>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </section>
  );
}

export function PosSummary({ title, children, className }) {
  return (
    <aside
      className={cn(
        "w-full shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-elevated ring-1 ring-primary/10 lg:sticky lg:top-2 lg:w-72 xl:w-80",
        className
      )}
    >
      {title ? (
        <div className="border-b border-border bg-gradient-primary px-3 py-2 text-primary-foreground">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-90">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="space-y-2.5 p-3">{children}</div>
    </aside>
  );
}

export function PosField({
  label,
  required,
  error,
  hint,
  hideLabel,
  children,
  className,
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label ? (
        <label
          className={cn(
            "truncate text-[10px] font-medium leading-none text-muted-foreground",
            hideLabel && "sr-only"
          )}
          title={typeof label === "string" ? label : undefined}
        >
          {label}
          {required ? <span className="ms-0.5 text-destructive">*</span> : null}
        </label>
      ) : null}
      <div className="min-w-0">{children}</div>
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
      {!error && hint ? (
        <p
          className="truncate text-[10px] leading-tight text-muted-foreground/80"
          title={hint}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Shared grid template for item head + rows (inline style — no Tailwind conflict) */
function itemGridStyle(fieldCount) {
  // fieldCount = data fields only (excludes delete)
  const n = Math.max(fieldCount, 1);
  // Product slightly wider; qty/price/total share equally; delete fixed
  return {
    gridTemplateColumns: `minmax(9rem, 1.35fr) repeat(${n - 1}, minmax(4.5rem, 1fr)) 2rem`,
  };
}

/**
 * Column headers aligned with PosItemRow.
 * `labels` length must match data field count (not including delete).
 */
export function PosItemHead({ labels = [], className }) {
  return (
    <div
      className={cn(
        "grid w-full min-w-[36rem] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 lg:min-w-0",
        className
      )}
      style={itemGridStyle(labels.length)}
    >
      {labels.map((label, idx) => (
        <div
          key={idx}
          className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          title={typeof label === "string" ? label : undefined}
        >
          {label}
        </div>
      ))}
      <div aria-hidden className="w-8" />
    </div>
  );
}

export function PosTotalRow({
  label,
  value,
  emphasize,
  muted,
  className,
  valueClassName,
  tone,
}) {
  const toneValueClass =
    tone === "debit"
      ? "text-debit"
      : tone === "credit"
        ? "text-credit"
        : tone === "balance"
          ? "text-foreground"
          : null;

  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <span
        className={cn(
          "text-xs text-muted-foreground",
          emphasize && "font-semibold text-foreground",
          muted && "text-[10px]",
          tone === "debit" && "text-debit/80",
          tone === "credit" && "text-credit/80"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums text-xs font-semibold text-foreground",
          emphasize && "text-base font-bold text-primary",
          muted && "text-[10px] font-medium text-muted-foreground",
          toneValueClass,
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function PosCartLine({ complete, children, className, ...rest }) {
  return (
    <div
      {...rest}
      data-item-line
      className={cn(
        "min-w-0 border-b border-border px-3 py-2 transition-colors last:border-b-0 hover:bg-primary/[0.03]",
        complete ? "bg-success/[0.05]" : "bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * One item = one grid row. `columns` = data fields + delete.
 * Uses inline gridTemplateColumns so Tailwind breakpoints cannot override it.
 */
export function PosItemRow({ columns = 4, children, className }) {
  const fieldCount = Math.max(columns - 1, 1);
  return (
    <div
      className={cn(
        "grid w-full min-w-[36rem] items-start gap-2 lg:min-w-0",
        className
      )}
      style={itemGridStyle(fieldCount)}
    >
      {children}
    </div>
  );
}

export function PosItemCell({ children, className }) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

export const posControlClass =
  "box-border h-8 min-h-8 max-h-8 min-w-0 w-full max-w-full px-2 py-0 text-xs leading-none shadow-none";
