import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
        secondary: "border-transparent bg-gray-100 text-[var(--text-primary)] hover:bg-gray-200",
        destructive: "border-transparent bg-[var(--status-error)] text-white hover:bg-red-600",
        outline: "text-[var(--text-primary)] border-[var(--border-medium)]",
        success: "border-transparent bg-[var(--status-success)] text-white hover:bg-green-600",
        warning: "border-transparent bg-[var(--status-warning)] text-white hover:bg-yellow-600",
        info: "border-transparent bg-[var(--status-info)] text-white hover:bg-blue-600",
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

