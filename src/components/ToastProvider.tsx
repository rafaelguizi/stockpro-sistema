// src/components/ToastProvider.tsx
'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'

interface ToastContextType {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext deve ser usado dentro de ToastProvider')
  }
  return context
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, title, message }
    
    setToasts(prev => [...prev, toast])
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => removeToast(id), 5000)
  }, [removeToast])

  const contextValue: ToastContextType = {
    success: useCallback((title: string, message?: string) => addToast('success', title, message), [addToast]),
    error: useCallback((title: string, message?: string) => addToast('error', title, message), [addToast]),
    warning: useCallback((title: string, message?: string) => addToast('warning', title, message), [addToast]),
    info: useCallback((title: string, message?: string) => addToast('info', title, message), [addToast]),
  }

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = "fixed top-4 right-4 z-50 max-w-sm w-full bg-white border-l-4 rounded-lg shadow-lg p-4 mb-2 animate-fade-in"
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-green-500`
      case 'error':
        return `${baseStyles} border-red-500`
      case 'warning':
        return `${baseStyles} border-yellow-500`
      case 'info':
        return `${baseStyles} border-blue-500`
      default:
        return baseStyles
    }
  }

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return 'ℹ️'
    }
  }

  const getToastTitleColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
        return 'text-blue-800'
      default:
        return 'text-gray-800'
    }
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Container de Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={getToastStyles(toast.type)}
            style={{ 
              transform: `translateY(${index * 80}px)`,
              transition: 'all 0.3s ease-out'
            }}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-xl mr-3">{getToastIcon(toast.type)}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${getToastTitleColor(toast.type)}`}>
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-sm text-gray-600 mt-1">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-4 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}