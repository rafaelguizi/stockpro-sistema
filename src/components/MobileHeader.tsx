// src/components/MobileHeader.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingButton from './LoadingButton'

interface MobileHeaderProps {
  title: string
  currentPage: string
  userEmail?: string
}

export default function MobileHeader({ title, currentPage, userEmail }: MobileHeaderProps) {
  const router = useRouter()
  const { logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  const menuItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: '📊',
      description: 'Visão geral do negócio'
    },
    { 
      name: 'Produtos', 
      href: '/produtos', 
      icon: '📦',
      description: 'Gestão de produtos'
    },
    { 
      name: 'Categorias', 
      href: '/categorias', 
      icon: '📂',
      description: 'Organizar produtos'
    },
    { 
      name: 'Clientes', 
      href: '/clientes', 
      icon: '👥',
      description: 'Gestão de clientes'
    },
    { 
      name: 'Fornecedores', 
      href: '/fornecedores', 
      icon: '🏪',
      description: 'Gestão de fornecedores'
    },
    { 
      name: 'PDV', 
      href: '/pdv', 
      icon: '🛒',
      description: 'Ponto de venda'
    },
    { 
      name: 'Movimentações', 
      href: '/movimentacoes', 
      icon: '📋',
      description: 'Histórico de estoque'
    },
    { 
      name: 'Relatórios', 
      href: '/relatorios', 
      icon: '📈',
      description: 'Análises e relatórios'
    }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const isCurrentPage = (href: string) => currentPage === href

  return (
    <>
      {/* Header Mobile */}
      <div className="lg:hidden bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
              {userEmail && (
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Mobile Overlay */}
      {menuAberto && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMenuAberto(false)}>
          <div className="bg-white w-80 h-full shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header do Menu */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">StockPro</h2>
                  <p className="text-blue-100 text-sm">Sistema de Gestão</p>
                </div>
                <button
                  onClick={() => setMenuAberto(false)}
                  className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {userEmail?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userEmail || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500">Administrador</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4">
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href)
                      setMenuAberto(false)
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isCurrentPage(item.href)
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                    {isCurrentPage(item.href) && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </nav>

            {/* Footer do Menu */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
              <LoadingButton
                onClick={handleLogout}
                variant="danger"
                size="md"
                className="w-full"
              >
                🚪 Sair do Sistema
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        {/* Header da Sidebar */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <span className="text-xl font-bold">📦</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">StockPro</h1>
              <p className="text-blue-100 text-sm">Sistema de Gestão</p>
            </div>
          </div>
        </div>

        {/* User Info Desktop */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userEmail || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
          </div>
        </div>

        {/* Navigation Desktop */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isCurrentPage(item.href)
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
              {isCurrentPage(item.href) && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer Desktop */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <LoadingButton
            onClick={handleLogout}
            variant="danger"
            size="md"
            className="w-full"
          >
            🚪 Sair do Sistema
          </LoadingButton>
        </div>
      </div>
    </>
  )
}