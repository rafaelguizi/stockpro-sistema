'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar automaticamente para login
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-blue-600 mb-2">📦 StockPro</h1>
          <p className="text-gray-600 text-lg">Sistema de Gestão de Estoque</p>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    </div>
  )
}