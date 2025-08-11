import { cn } from "../../lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-[var(--primary)]",
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingStateProps {
  children?: React.ReactNode
  className?: string
}

export function LoadingState({ children, className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        {children && (
          <p className="text-sm text-[var(--text-secondary)]">{children}</p>
        )}
      </div>
    </div>
  )
}

