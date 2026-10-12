import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Responsive filter strip for list pages.
 * Children should be filter fields (search, selects, etc.).
 */
export function ListToolbar({
  children,
  actions,
  className,
}) {
  return (
    <div
      className={cn(
        "toolbar-surface flex flex-col gap-3 border-b border-border p-3 sm:p-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pb-0.5">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Responsive grid for advanced / secondary filters */
export function FilterGrid({ children, className }) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Labeled control cell — always shrinkable so fields never overlap */
export function FilterField({ label, className, children }) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden",
        "[&_input]:min-w-0 [&_input]:max-w-full [&_button]:max-w-full [&_[role=combobox]]:max-w-full",
        className
      )}
    >
      {label ? (
        <Label className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </Label>
      ) : null}
      {children}
    </div>
  );
}

/** Search input sized for filter rows */
export function FilterSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}) {
  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-9 w-full min-w-0 ps-8"
      />
    </div>
  );
}

export function FilterClearButton({ onClick, disabled, label = "Clear" }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-9 gap-1.5"
    >
      <X className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

/**
 * Single card shell for list content (toolbar + table).
 * Avoid wrapping ReusableTable in Paper — use this once.
 */
export function ListCard({ children, className }) {
  return (
    <div
      className={cn(
        "mb-4 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-elevated",
        "ring-1 ring-primary/5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Page root — prevents horizontal page scroll */
export function PageShell({ children, className }) {
  return (
    <div className={cn("w-full min-w-0 max-w-full overflow-x-hidden pb-6", className)}>
      {children}
    </div>
  );
}
