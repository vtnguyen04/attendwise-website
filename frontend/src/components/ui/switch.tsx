"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-[background,border,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary/60 data-[state=checked]:shadow-[0_8px_20px_rgba(59,130,246,0.35)]",
      "data-[state=unchecked]:bg-muted/40 data-[state=unchecked]:border-border/60 data-[state=unchecked]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full ring-0 transition-transform duration-200",
        "data-[state=checked]:translate-x-5 data-[state=checked]:bg-background data-[state=checked]:shadow-[0_4px_14px_rgba(59,130,246,0.45)]",
        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-muted/80 data-[state=unchecked]:shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
