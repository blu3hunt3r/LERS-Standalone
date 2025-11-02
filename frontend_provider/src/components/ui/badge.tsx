import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-700 text-white",
        secondary: "bg-slate-100 text-slate-900",
        destructive: "bg-red-600 text-white",
        outline: "border border-slate-300 bg-white text-slate-700",
        success: "bg-green-600 text-white",
        warning: "bg-yellow-500 text-slate-900",
        info: "bg-slate-600 text-white",
        // Status badges - GREY TONES
        critical: "bg-red-600 text-white",
        high: "bg-orange-600 text-white",
        medium: "bg-yellow-500 text-slate-900",
        low: "bg-green-600 text-white",
        // Case status badges - GREY
        open: "bg-slate-600 text-white",
        investigation: "bg-slate-700 text-white",
        pending: "bg-amber-600 text-white",
        closed: "bg-slate-500 text-white",
        // LERS status badges - SEMANTIC COLORS
        sent: "bg-blue-600 text-white",
        received: "bg-green-600 text-white",
        processing: "bg-yellow-600 text-white",
        rejected: "bg-red-600 text-white",
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

