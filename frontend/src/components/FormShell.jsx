import React from "react";
import { cn } from "@/lib/utils";

/**
 * FormShell — outer container for every create/edit/view form page.
 *
 * Provides consistent responsive behavior:
 * - Prevents horizontal overflow on narrow viewports.
 * - Reserves bottom padding so fixed mobile action bars never occlude the last field.
 * - Establishes vertical rhythm between PageHeader, alerts, and section cards.
 *
 * Usage:
 *   <FormShell>
 *     <PageHeader ... />
 *     <FormBody>
 *       <FormGrid>
 *         <FormSection title="..." icon={...} span="half">...</FormSection>
 *         <FormSection title="..." icon={...} span="full">...</FormSection>
 *       </FormGrid>
 *     </FormBody>
 *   </FormShell>
 */
export function FormShell({ children, className }) {
  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-x-hidden pb-24 md:pb-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * FormBody — inner content area under the PageHeader.
 * Adds consistent top spacing and stacks children with a uniform gap.
 */
export function FormBody({ children, className }) {
  return (
    <div className={cn("mt-4 flex flex-col gap-4 md:mt-6 md:gap-6", className)}>
      {children}
    </div>
  );
}

/**
 * FormGrid — responsive 12-column grid for form sections.
 * Use `span` on FormSection to control width per breakpoint.
 */
export function FormGrid({ children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6",
        className
      )}
    >
      {children}
    </div>
  );
}

const spanMap = {
  full: "md:col-span-12",
  half: "md:col-span-6",
  third: "md:col-span-4",
  twoThirds: "md:col-span-8",
  quarter: "md:col-span-3",
  threeQuarters: "md:col-span-9",
};

/**
 * FormSection — grouped card containing a titled group of form fields.
 *
 * Props:
 * - title: section heading
 * - description: optional subtitle
 * - icon: optional lucide/compat icon element rendered in an emerald-tinted badge
 * - span: "full" | "half" | "third" | "twoThirds" | "quarter" | "threeQuarters"
 * - actions: optional top-right actions
 * - contentClassName: override inner content classes (default vertical stack)
 * - noPadding: render children edge-to-edge (e.g. for embedded tables)
 */
export function FormSection({
  title,
  description,
  icon,
  span = "full",
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card shadow-soft",
        spanMap[span] ?? spanMap.full,
        className
      )}
    >
      {(title || description || icon || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-3 md:px-5 md:py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-emerald">
                <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate font-display text-sm font-semibold text-foreground md:text-base">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-xs text-muted-foreground md:text-[13px]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex flex-none items-center gap-2">{actions}</div>
          ) : null}
        </header>
      )}
      <div
        className={cn(
          !noPadding && "px-4 py-4 md:px-5 md:py-5",
          !contentClassName && "flex flex-col gap-4",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * FormRow — responsive row for aligning inputs inside a FormSection.
 * Defaults to 2 columns on md+, stacked on mobile.
 */
export function FormRow({ children, cols = 2, className }) {
  const template = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[cols] ?? "md:grid-cols-2";
  return (
    <div className={cn("grid grid-cols-1 gap-4", template, className)}>
      {children}
    </div>
  );
}

export default FormShell;
