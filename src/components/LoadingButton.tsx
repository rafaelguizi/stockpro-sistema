// src/components/LoadingButton.tsx
'use client'
import React from 'react'

interface LoadingButtonProps {
  children: React.ReactNode
  isLoading?: boolean
  loadingText?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}

export default function LoadingButton({
  children,
  isLoading = false,
  loadingText = 'Carregando...',
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}: LoadingButtonProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 focus:ring-blue-500'
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-700 focus:ring-gray-500'
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 focus:ring-green-500'
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700 focus:ring-yellow-500'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 focus:ring-blue-500'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2 text-base'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2 text-base'
    }
  }

  const baseStyles = 'font-medium rounded-lg border-2 transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center'
  const disabledStyles = 'opacity-50 cursor-not-allowed'
  const activeStyles = 'active:scale-95'
  const hoverStyles = 'hover:scale-105'

  const finalClassName = `
    ${baseStyles} 
    ${getVariantStyles()} 
    ${getSizeStyles()} 
    ${(disabled || isLoading) ? disabledStyles : `${hoverStyles} ${activeStyles}`} 
    ${className}
  `.trim()

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={finalClassName}
      {...props}
    >
      <div className="flex items-center justify-center space-x-2">
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )}
        <span>
          {isLoading ? loadingText : children}
        </span>
      </div>
    </button>
  )
}