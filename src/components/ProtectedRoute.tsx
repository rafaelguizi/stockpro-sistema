// src/components/ProtectedRoute.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log('🔐 Usuário não autenticado, redirecionando para login...')
        router.push(redirectTo)
      } else {
        console.log('✅ Usuário autenticado:', user.email)
        setIsChecking(false)
      }
    }
  }, [user, loading, router, redirectTo])

  // Mostrar loading enquanto verifica autenticação
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-600 text-2xl">🔐</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">StockPro</h2>
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
          <p className="text-gray-400 text-sm mt-2">Aguarde um momento</p>
          
          <div className="mt-6 bg-white rounded-lg shadow-lg p-4 max-w-sm mx-auto">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="ml-2">Carregando dados...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Não renderizar nada se não estiver autenticado (redirecionamento em andamento)
  if (!user) {
    return null
  }

  // Renderizar children se estiver autenticado
  return <>{children}</>
}