import * as React from "react"
import { cn } from "../../lib/utils"

interface SheetProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Sheet = React.forwardRef<HTMLDivElement, SheetProps>(
  ({ className, children, open, onOpenChange, ...props }, ref) => {
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          onOpenChange?.(false)
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [open, onOpenChange])

    if (!open) return null

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/80"
          onClick={() => onOpenChange?.(false)}
        />
        {/* Sheet Container */}
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </>
    )
  }
)
Sheet.displayName = "Sheet"

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button ref={ref} className={className} {...props}>
    {children}
  </button>
))
SheetTrigger.displayName = "SheetTrigger"

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right' | 'top' | 'bottom'
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = 'right', ...props }, ref) => {
    const sideClasses = {
      right: 'fixed right-0 top-0 z-50 h-full animate-in slide-in-from-right',
      left: 'fixed left-0 top-0 z-50 h-full animate-in slide-in-from-left',
      top: 'fixed top-0 left-0 z-50 w-full animate-in slide-in-from-top',
      bottom: 'fixed bottom-0 left-0 z-50 w-full animate-in slide-in-from-bottom'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white shadow-lg",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SheetContent.displayName = "SheetContent"

const SheetHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props}>
    {children}
  </div>
))
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold text-gray-900", className)} {...props}>
    {children}
  </h2>
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props}>
    {children}
  </p>
))
SheetDescription.displayName = "SheetDescription"

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription }
