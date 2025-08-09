// src/components/MobileHeader.tsx
'use client'
import { useState, useEffect } from 'react'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Carregar preferência de collapse do localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('stockpro_sidebar_collapsed')
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed))
    }
  }, [])

  // Salvar preferência no localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('stockpro_sidebar_collapsed', JSON.stringify(newState))
  }

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
      icon: '🏭',
      description: 'Gestão de fornecedores'
    },
    {
      name: 'PDV',
      href: '/pdv',
      icon: '💰',
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
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200 lg:shadow-lg transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>

        {/* Header da Sidebar */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white relative">
          <div className={`flex items-center transition-all duration-300 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {/* Logo dinâmico - esconde completamente quando colapsado */}
            {!sidebarCollapsed ? (
              <>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold">📦</span>
                </div>
                <div className="ml-3 transition-all duration-300">
                  <h1 className="text-xl font-bold">StockPro</h1>
                  <p className="text-blue-100 text-sm">Sistema de Gestão</p>
                </div>
              </>
            ) : (
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold">S</span>
              </div>
            )}
          </div>

          {/* 🆕 Botão de Toggle MELHORADO COM EMOJI */}
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-200 group border border-white border-opacity-20 hover:border-opacity-40"
            title={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          >
            {/* Emoji dinâmico */}
            <span className={`text-sm transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}>
              ◀️
            </span>
          </button>
        </div>

        {/* User Info Desktop */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 transition-all duration-300">
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
        )}

        {/* User Info Collapsed */}
        {sidebarCollapsed && (
          <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-center">
            <div
              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
              title={userEmail || 'Usuário'}
            >
              <span className="text-white font-bold text-sm">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Desktop */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.href} className="relative group">
              <button
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isCurrentPage(item.href)
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.name : ''}
              >
                <span className={`text-xl ${sidebarCollapsed ? '' : 'flex-shrink-0'}`}>
                  {item.icon}
                </span>

                {!sidebarCollapsed && (
                  <div className="flex-1 text-left transition-all duration-300">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                )}

                {!sidebarCollapsed && isCurrentPage(item.href) && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>

              {/* Tooltip melhorado para sidebar colapsada */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-300">{item.description}</div>
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Desktop */}
        <div className={`p-2 border-t border-gray-200 bg-gray-50 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          {sidebarCollapsed ? (
            <div className="relative group">
              <button
                onClick={handleLogout}
                className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Sair do Sistema"
              >
                🚪
              </button>
              <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl">
                <div className="font-medium">Sair do Sistema</div>
                <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
          ) : (
            <LoadingButton
              onClick={handleLogout}
              variant="danger"
              size="md"
              className="w-full"
            >
              🚪 Sair do Sistema
            </LoadingButton>
          )}
        </div>
      </div>
    </>
  )
}