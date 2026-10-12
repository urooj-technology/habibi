import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary hover:bg-primary/15",
        secondary: "border-transparent bg-muted text-foreground hover:bg-muted/80",
        destructive: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15",
        success: "border-transparent bg-success/10 text-success hover:bg-success/15",
        warning: "border-transparent bg-warning/15 text-warning hover:bg-warning/20",
        info: "border-transparent bg-info/10 text-info hover:bg-info/15",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
