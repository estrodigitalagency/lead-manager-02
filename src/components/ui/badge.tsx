
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.05em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive",
        outline: "border-border text-muted-foreground bg-transparent",
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
