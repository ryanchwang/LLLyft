import React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", disabled, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background"
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
  }
  
  const sizes = {
    default: "h-10 py-2 px-4",
    lg: "h-11 px-8",
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      ref={ref}
      disabled={disabled}
      {...props}
    />
  )
})

Button.displayName = "Button"

export { Button }
