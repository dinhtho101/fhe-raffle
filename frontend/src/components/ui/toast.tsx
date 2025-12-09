'use client'

import * as React from "react"
import { cn } from "../../lib/utils"

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  onClose?: () => void
  duration?: number
}

export function Toast({ 
  title, 
  description, 
  variant = 'default', 
  onClose,
  duration = 5000 
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for animation
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const variantStyles = {
    default: "bg-gray-800 border-gray-600 text-white",
    success: "bg-green-900/20 border-green-600 text-green-300",
    error: "bg-red-900/20 border-red-600 text-red-300", 
    warning: "bg-yellow-900/20 border-yellow-600 text-yellow-300"
  }

  const iconStyles = {
    default: "🟢",
    success: "✅",
    error: "❌",
    warning: "⚠️"
  }

  if (!isVisible) return null

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-50 max-w-sm w-full bg-gray-800 border rounded-lg p-4 shadow-lg transition-all duration-300 transform",
        variantStyles[variant],
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg">{iconStyles[variant]}</div>
        <div className="flex-1">
          {title && <div className="font-semibold text-sm">{title}</div>}
          {description && <div className="text-xs mt-1 opacity-90">{description}</div>}
        </div>
        {onClose && (
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 300)
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
