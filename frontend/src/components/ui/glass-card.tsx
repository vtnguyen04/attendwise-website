import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  // Base classes: apply rounded corners, a 1px border, and transitions.
  "rounded-lg border transition-all duration-300 ease-smooth",
  {
    variants: {
      variant: {
        // Default variant now uses the theme-aware utility classes from tailwind.config.ts.
        default: "border-glass-border bg-glass-bg shadow-lg backdrop-blur-lg",
      },
      effect: {
        none: "hover:shadow-xl hover:border-glass-border-hover",
        magnify: "cursor-pointer hover:scale-[1.03] hover:shadow-2xl hover:border-glass-border-hover",
      },
    },
    defaultVariants: {
      variant: "default",
      effect: "none",
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, effect, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ variant, effect, className }))}
        {...props}
      />
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard, glassCardVariants };