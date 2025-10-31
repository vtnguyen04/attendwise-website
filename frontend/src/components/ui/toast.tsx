"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center gap-4 overflow-hidden p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "bg-glass text-foreground",
        destructive: "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200",
        success: "border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200",
        info: "border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-900 dark:focus:ring-gray-100",
      "group-data-[variant=destructive]:bg-red-600 group-data-[variant=destructive]:text-white group-data-[variant=destructive]:border-red-600 group-data-[variant=destructive]:hover:bg-red-700 group-data-[variant=destructive]:focus:ring-red-500",
      "group-data-[variant=success]:bg-green-600 group-data-[variant=success]:text-white group-data-[variant=success]:border-green-600 group-data-[variant=success]:hover:bg-green-700 group-data-[variant=success]:focus:ring-green-500",
      "group-data-[variant=info]:bg-blue-600 group-data-[variant=info]:text-white group-data-[variant=info]:border-blue-600 group-data-[variant=info]:hover:bg-blue-700 group-data-[variant=info]:focus:ring-blue-500",
      "px-4",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "shrink-0 rounded-lg p-1 transition-all opacity-0 group-hover:opacity-100 group-focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
      "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:ring-gray-900 dark:focus:ring-gray-100",
      "group-data-[variant=destructive]:text-red-600 group-data-[variant=destructive]:hover:text-red-900 group-data-[variant=destructive]:focus:ring-red-500",
      "group-data-[variant=success]:text-green-600 group-data-[variant=success]:hover:text-green-900 group-data-[variant=success]:focus:ring-green-500",
      "group-data-[variant=info]:text-blue-600 group-data-[variant=info]:hover:text-blue-900 group-data-[variant=info]:focus:ring-blue-500",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: VariantProps<typeof toastVariants>["variant"] }
>(({ className, variant = "default", ...props }, ref) => {
  const iconMap = {
    default: null,
    destructive: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  }

  return (
    <div
      ref={ref}
      className={cn("shrink-0", className)}
      {...props}
    >
      {iconMap[variant as keyof typeof iconMap]}
    </div>
  )
})
ToastIcon.displayName = "ToastIcon"

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90 line-clamp-2", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
}