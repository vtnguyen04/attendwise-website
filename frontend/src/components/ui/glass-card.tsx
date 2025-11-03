import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  "glass-card transition-all duration-300 ease-smooth",
  {
    variants: {
      variant: {
        default: "",
      },
      effect: {
        none: "",
        lift: "hover:-translate-y-1",
        magnify: "cursor-pointer hover:scale-[1.03]",
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
