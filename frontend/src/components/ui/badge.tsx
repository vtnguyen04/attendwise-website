import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border-0 px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-glass-interactive text-foreground",
        secondary: "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-white dark:focus:ring-offset-gray-900",
        destructive: "border-red-200 dark:border-red-800 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-white dark:focus:ring-offset-gray-900",
        success: "border-green-200 dark:border-green-800 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-white dark:focus:ring-offset-gray-900",
        warning: "border-yellow-200 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:ring-offset-white dark:focus:ring-offset-gray-900",
        outline: "border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-white dark:focus:ring-offset-gray-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }