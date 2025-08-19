// src/app/dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFirestore } from '@/hooks/useFirestore'
import { useToastContext } from '@/components/ToastProvider'
import MobileHeader from '@/components/MobileHeader'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Produto {
  id: string
  codigo: string
  nome: string
  categoria: string
  estoqueMinimo: number
  valorCompra: number
  valorVenda: number
  estoque: number
  ativo: boolean
  dataCadastro: string
  userId: string
  companyId?: string
  // Campos para validade
  temValidade?: boolean
  dataValidade?: string
  diasAlerta?: number
}

interface Movimentacao {
  id: string
  produtoId: string
  produto: string
  codigo: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  valorUnitario: number
  valorTotal: number
  data: string
  hora: string
  observacao: string
  userId: string
  companyId?: string
}

// 🆕 TIPO PARA FILTRO ATIVO
type FiltroAtivo = 'todos' | 'estoque_baixo' | 'estoque_zerado' | 'proximo_vencimento'

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()
  
  // 🆕 Hooks Multi-tenant
  const { data: produtos, loading: loadingProdutos } = useFirestore<Produto>('produtos')
  const { data: movimentacoes, loading: loadingMovimentacoes } = useFirestore<Movimentacao>('movimentacoes')

  const [loading, setLoading] = useState(true)

  // 🆕 ESTADO PARA CONTROLAR FILTRO ATIVO
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAtivo>('todos')

  useEffect(() => {
    // Simular um pequeno delay para melhor UX
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Aguardar dados do Firebase
  const isDataLoading = loading || loadingProdutos || loadingMovimentacoes

  // 🛠️ FUNÇÃO VERIFICAR VALIDADE CORRIGIDA - IGUAL AOS PRODUTOS
  const verificarValidade = (produto: Produto) => {
    if (!produto.temValidade || !produto.dataValidade) {
      return { status: 'sem_validade', diasRestantes: null, textoVencimento: 'Sem validade' }
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const [ano, mes, dia] = produto.dataValidade.split('-').map(Number)
    const dataValidade = new Date(ano, mes - 1, dia)
    dataValidade.setHours(0, 0, 0, 0)
    
    const diasRestantes = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    const diasAlerta = produto.diasAlerta || 30

    let textoVencimento: string
    if (diasRestantes < 0) {
      textoVencimento = `Vencido há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? 's' : ''}`
    } else if (diasRestantes === 0) {
      textoVencimento = 'Vence hoje'
    } else if (diasRestantes === 1) {
      textoVencimento = 'Vence amanhã'
    } else {
      textoVencimento = `Vence em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`
    }

    let status: string
    if (diasRestantes < 0) {
      status = 'vencido'
    } else if (diasRestantes === 0) {
      status = 'vence_hoje'
    } else if (diasRestantes <= 7) {
      status = 'vence_em_7_dias'
    } else if (diasRestantes <= diasAlerta) {
      status = 'proximo_vencimento'
    } else {
      status = 'valido'
    }
    
    return { status, diasRestantes, textoVencimento }
  }

  // 🛠️ FUNÇÃO PARA VERIFICAR PRODUTOS PRÓXIMOS DO VENCIMENTO CORRIGIDA
  const verificarProdutosVencimento = () => {
    if (!produtos) return { vencendoHoje: [], vencendoEm7Dias: [], vencendoEm30Dias: [], vencidos: [] }

    const produtosComValidade = produtos.filter(p => p.ativo && p.temValidade && p.dataValidade)

    const vencidos: Produto[] = []
    const vencendoHoje: Produto[] = []
    const vencendoEm7Dias: Produto[] = []
    const vencendoEm30Dias: Produto[] = []

    produtosComValidade.forEach(produto => {
      const validadeInfo = verificarValidade(produto) // 🛠️ USAR A FUNÇÃO CORRIGIDA

      switch (validadeInfo.status) {
        case 'vencido':
          vencidos.push(produto)
          break
        case 'vence_hoje':
          vencendoHoje.push(produto)
          break
        case 'vence_em_7_dias':
          vencendoEm7Dias.push(produto)
          break
        case 'proximo_vencimento':
          vencendoEm30Dias.push(produto)
          break
      }
    })

    return { vencendoHoje, vencendoEm7Dias, vencendoEm30Dias, vencidos }
  }

  // Calcular faturamento mensal
  const calcularFaturamentoMensal = () => {
    if (!movimentacoes) return { totalFaturamento: 0, quantidadeVendas: 0, mesAno: '' }

    const agora = new Date()
    const anoAtual = agora.getFullYear()
    const mesAtual = agora.getMonth()

    const vendasMesAtual = movimentacoes.filter(mov => {
      if (mov.tipo !== 'saida') return false

      const [dia, mes, ano] = mov.data.split('/')
      const dataMovimentacao = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))

      return dataMovimentacao.getFullYear() === anoAtual &&
             dataMovimentacao.getMonth() === mesAtual
    })

    const totalFaturamento = vendasMesAtual.reduce((total, mov) => total + mov.valorTotal, 0)
    const quantidadeVendas = vendasMesAtual.length

    return {
      totalFaturamento,
      quantidadeVendas,
      mesAno: agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
  }

  // Calcular estatísticas
  const produtosAtivos = produtos ? produtos.filter(p => p.ativo) : []
  const produtosEstoqueBaixo = produtosAtivos.filter(p => p.estoque <= p.estoqueMinimo)
  const produtosEstoqueZerado = produtosAtivos.filter(p => p.estoque === 0)

  // Alertas de validade
  const alertasValidade = verificarProdutosVencimento()
  
  // 🛠️ CORREÇÃO 1: INCLUIR vencendoEm30Dias na contagem
  const totalProdutosComProblemaValidade = alertasValidade.vencidos.length + 
                                          alertasValidade.vencendoHoje.length + 
                                          alertasValidade.vencendoEm7Dias.length +
                                          alertasValidade.vencendoEm30Dias.length

  // Faturamento mensal
  const faturamentoMensal = calcularFaturamentoMensal()

  // Valor total do estoque
  const valorTotalEstoque = produtosAtivos.reduce((total, produto) => {
    return total + (produto.estoque * produto.valorCompra)
  }, 0)

  // 🆕 Margem dinâmica baseada no estado da sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Escutar mudanças no localStorage para sincronizar
    const handleStorageChange = () => {
      const collapsed = localStorage.getItem('stockpro_sidebar_collapsed')
      if (collapsed !== null) {
        setSidebarCollapsed(JSON.parse(collapsed))
      }
    }

    // Verificar estado inicial
    handleStorageChange()

    // Escutar mudanças
    window.addEventListener('storage', handleStorageChange)
    
    // Polling para mudanças na mesma aba (workaround)
    const interval = setInterval(handleStorageChange, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // 🆕 FUNÇÃO PARA LIDAR COM CLIQUE NOS CARDS FILTRÁVEIS
  const handleCardClick = (filtro: FiltroAtivo) => {
    setFiltroAtivo(filtro)
    
    // Feedback visual e sonoro
    const filtroTextos = {
      'estoque_baixo': 'Produtos com estoque baixo',
      'estoque_zerado': 'Produtos sem estoque', 
      'proximo_vencimento': 'Produtos próximos ao vencimento',
      'todos': 'Todos os alertas'
    }
    
    toast.info('Filtro aplicado!', filtroTextos[filtro])
  }

  // 🆕 FUNÇÃO PARA OBTER ESTILOS DOS CARDS BASEADO NO FILTRO ATIVO
  const getCardStyles = (tipo: FiltroAtivo) => {
    const isActive = filtroAtivo === tipo
    const isOtherActive = filtroAtivo !== 'todos' && filtroAtivo !== tipo
    
    const baseStyles = "p-6 rounded-xl shadow-lg text-white transition-all duration-300 transform cursor-pointer"
    
    if (isActive) {
      // Card ativo - mais destacado
      return `${baseStyles} scale-105 shadow-2xl ring-4 ring-white ring-opacity-50 hover:scale-110`
    } else if (isOtherActive) {
      // Outros cards quando um está ativo - mais claros
      return `${baseStyles} opacity-60 hover:opacity-80 hover:scale-102`
    } else {
      // Estado normal
      return `${baseStyles} hover:scale-105 hover:shadow-xl`
    }
  }

  // 🆕 FUNÇÃO PARA OBTER TAMANHO DO ÍCONE BASEADO NO ESTADO
  const getIconSize = (tipo: FiltroAtivo) => {
    const isActive = filtroAtivo === tipo
    return isActive ? "text-5xl" : "text-4xl"
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <MobileHeader 
          title="Dashboard Principal" 
          currentPage="/dashboard" 
          userEmail={user?.email || undefined}
        />

        {/* 🆕 Margem dinâmica baseada no estado da sidebar */}
        <main className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed
           ? 'lg:ml-16 lg:mr-4' 
           : 'max-w-7xl mx-auto lg:ml-64'
        }`}>

          {/* Loading State */}
          {isDataLoading && (
            <div className="bg-white rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in">
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-purple-600 text-2xl">📊</span>
                  </div>
                </div>
                <p className="text-gray-700 font-bold text-lg">Carregando dashboard...</p>
                <p className="text-gray-500 text-sm mt-2">
                  {user?.isMultiTenant ? 
                    `Sincronizando dados da empresa (${user.companyName})` : 
                    'Sincronizando dados do Firebase'
                  }
                </p>
                
                <div className="mt-6 flex space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {!isDataLoading && (
            <div className="animate-fade-in">
              {/* Boas-vindas */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-xl p-6 mb-8 text-white">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                      Bem-vindo ao StockPro! 🚀
                    </h1>
                    <p className="text-purple-100 mt-2 text-base sm:text-lg">
                      Gerencie seu estoque de forma inteligente e eficiente
                    </p>
                    {user && (
                      <div className="text-purple-200 text-sm mt-1 space-y-1">
                        <p>Logado como: <span className="font-semibold">{user.email}</span></p>
                        {user.isMultiTenant && user.companyName && (
                          <p>Empresa: <span className="font-semibold">{user.companyName}</span></p>
                        )}
                        {user.isMultiTenant && (
                          <p className="text-purple-300 text-xs">🏢 Dados isolados por empresa</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <button
                      onClick={() => router.push('/produtos')}
                      className="px-6 py-3 bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-2 border-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <span className="text-xl">➕</span>
                      <span>Novo Produto</span>
                    </button>
                    <button
                      onClick={() => router.push('/movimentacoes')}
                      className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-2 border-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <span className="text-xl">��</span>
                      <span>Nova Movimentação</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 🆕 BOTÃO VER TODOS - Aparece quando há filtro ativo */}
              {filtroAtivo !== 'todos' && (
                <div className="mb-6 flex justify-center">
                  <button
                    onClick={() => handleCardClick('todos')}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-lg"
                  >
                    <span className="text-xl">👁️</span>
                    <span>Ver Todos os Alertas</span>
                  </button>
                </div>
              )}

              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">

                {/* Total de Produtos - Não clicável */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-blue-100 text-sm">Total de Produtos</p>
                      <p className="text-3xl font-bold">{produtosAtivos.length}</p>
                      <p className="text-blue-100 text-xs">Produtos ativos</p>
                    </div>
                    <div className="text-4xl ml-3">📦</div>
                  </div>
                </div>

                {/* 🆕 ESTOQUE BAIXO - Agora é um botão filtrável */}
                <div 
                  className={`bg-gradient-to-r from-yellow-500 to-orange-500 ${getCardStyles('estoque_baixo')}`}
                  onClick={() => handleCardClick(filtroAtivo === 'estoque_baixo' ? 'todos' : 'estoque_baixo')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-yellow-100 text-sm">Estoque Baixo</p>
                      <p className="text-3xl font-bold">{produtosEstoqueBaixo.length}</p>
                      <p className="text-yellow-100 text-xs">
                        {filtroAtivo === 'estoque_baixo' ? '👁️ Visualizando' : 'Clique para filtrar'}
                      </p>
                    </div>
                    <div className={`ml-3 transition-all duration-300 ${getIconSize('estoque_baixo')}`}>⚠️</div>
                  </div>
                </div>

                {/* 🆕 ESTOQUE ZERADO - Agora é um botão filtrável */}
                <div 
                  className={`bg-gradient-to-r from-red-500 to-red-600 ${getCardStyles('estoque_zerado')}`}
                  onClick={() => handleCardClick(filtroAtivo === 'estoque_zerado' ? 'todos' : 'estoque_zerado')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-red-100 text-sm">Estoque Zerado</p>
                      <p className="text-3xl font-bold">{produtosEstoqueZerado.length}</p>
                      <p className="text-red-100 text-xs">
                        {filtroAtivo === 'estoque_zerado' ? '👁️ Visualizando' : 'Clique para filtrar'}
                      </p>
                    </div>
                    <div className={`ml-3 transition-all duration-300 ${getIconSize('estoque_zerado')}`}>🚫</div>
                  </div>
                </div>

                {/* 🆕 PRÓXIMO VENCIMENTO - Agora é um botão filtrável */}
                <div 
                  className={`bg-gradient-to-r from-purple-500 to-purple-600 ${getCardStyles('proximo_vencimento')}`}
                  onClick={() => handleCardClick(filtroAtivo === 'proximo_vencimento' ? 'todos' : 'proximo_vencimento')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-purple-100 text-sm">Próx. Vencimento</p>
                      <p className="text-3xl font-bold">{totalProdutosComProblemaValidade}</p>
                      <p className="text-purple-100 text-xs">
                        {filtroAtivo === 'proximo_vencimento' ? '👁️ Visualizando' : 'Clique para filtrar'}
                      </p>
                    </div>
                    <div className={`ml-3 transition-all duration-300 ${getIconSize('proximo_vencimento')}`}>📅</div>
                  </div>
                </div>

                {/* Faturamento Mensal - Não clicável */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-green-100 text-sm">Faturamento</p>
                      <p className="text-xl font-bold">R$ {faturamentoMensal.totalFaturamento.toFixed(2)}</p>
                      <p className="text-green-100 text-xs">{faturamentoMensal.quantidadeVendas} vendas</p>
                    </div>
                    <div className="text-4xl ml-3">💰</div>
                  </div>
                </div>
              </div>

              {/* 🆕 ALERTAS FILTRÁVEIS - Baseado no filtro ativo */}
              {(produtosEstoqueBaixo.length > 0 || produtosEstoqueZerado.length > 0 || totalProdutosComProblemaValidade > 0) && (
                <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      🚨 Alertas Importantes
                    </h3>
                    {filtroAtivo !== 'todos' && (
                      <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {filtroAtivo === 'estoque_baixo' && '⚠️ Filtrando: Estoque Baixo'}
                        {filtroAtivo === 'estoque_zerado' && '🚫 Filtrando: Estoque Zerado'}
                        {filtroAtivo === 'proximo_vencimento' && '📅 Filtrando: Próx. Vencimento'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* 🆕 PRODUTOS COM ESTOQUE BAIXO - Renderiza apenas se filtro for 'todos' ou 'estoque_baixo' */}
                    {produtosEstoqueBaixo.length > 0 && (filtroAtivo === 'todos' || filtroAtivo === 'estoque_baixo') && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                        <h4 className="font-bold text-yellow-800 mb-3 flex items-center">
                          ⚠️ Produtos com estoque baixo ({produtosEstoqueBaixo.length})
                          {filtroAtivo === 'estoque_baixo' && (
                            <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                              Filtro ativo
                            </span>
                          )}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {produtosEstoqueBaixo.slice(0, filtroAtivo === 'estoque_baixo' ? 12 : 6).map(produto => (
                            <div key={produto.id} className="bg-white p-4 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                              <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                              <p className="text-xs text-gray-500">#{produto.codigo}</p>
                              <p className="text-xs text-yellow-600 font-bold">
                                Estoque: {produto.estoque} (Mín: {produto.estoqueMinimo})
                              </p>
                            </div>
                          ))}
                        </div>
                        {produtosEstoqueBaixo.length > (filtroAtivo === 'estoque_baixo' ? 12 : 6) && (
                          <p className="text-yellow-600 text-sm mt-3 font-medium">
                            +{produtosEstoqueBaixo.length - (filtroAtivo === 'estoque_baixo' ? 12 : 6)} produtos também estão com estoque baixo
                            {filtroAtivo !== 'estoque_baixo' && (
                              <button 
                                onClick={() => handleCardClick('estoque_baixo')}
                                className="ml-2 underline hover:no-underline"
                              >
                                (clique para ver todos)
                              </button>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 🆕 PRODUTOS COM ESTOQUE ZERADO - Renderiza apenas se filtro for 'todos' ou 'estoque_zerado' */}
                    {produtosEstoqueZerado.length > 0 && (filtroAtivo === 'todos' || filtroAtivo === 'estoque_zerado') && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                        <h4 className="font-bold text-red-800 mb-3 flex items-center">
                          🚫 Produtos sem estoque ({produtosEstoqueZerado.length})
                          {filtroAtivo === 'estoque_zerado' && (
                            <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                              Filtro ativo
                            </span>
                          )}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {produtosEstoqueZerado.slice(0, filtroAtivo === 'estoque_zerado' ? 12 : 6).map(produto => (
                            <div key={produto.id} className="bg-white p-4 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                              <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                              <p className="text-xs text-gray-500">#{produto.codigo}</p>
                              <p className="text-xs text-red-600 font-bold">Estoque: 0</p>
                            </div>
                          ))}
                        </div>
                        {produtosEstoqueZerado.length > (filtroAtivo === 'estoque_zerado' ? 12 : 6) && (
                          <p className="text-red-600 text-sm mt-3 font-medium">
                            +{produtosEstoqueZerado.length - (filtroAtivo === 'estoque_zerado' ? 12 : 6)} produtos também estão sem estoque
                            {filtroAtivo !== 'estoque_zerado' && (
                              <button 
                                onClick={() => handleCardClick('estoque_zerado')}
                                className="ml-2 underline hover:no-underline"
                              >
                                (clique para ver todos)
                              </button>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 🆕 ALERTAS DE VALIDADE - Renderiza apenas se filtro for 'todos' ou 'proximo_vencimento' */}
                    {(alertasValidade.vencidos.length > 0 || alertasValidade.vencendoHoje.length > 0 || 
                      alertasValidade.vencendoEm7Dias.length > 0 || alertasValidade.vencendoEm30Dias.length > 0) && 
                      (filtroAtivo === 'todos' || filtroAtivo === 'proximo_vencimento') && (
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                        <h4 className="font-bold text-orange-800 mb-3 flex items-center">
                          📅 Alertas de Validade ({totalProdutosComProblemaValidade})
                          {filtroAtivo === 'proximo_vencimento' && (
                            <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                              Filtro ativo
                            </span>
                          )}
                        </h4>
                        
                        {/* Produtos vencidos */}
                        {alertasValidade.vencidos.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-red-700 mb-2">🚨 Vencidos ({alertasValidade.vencidos.length})</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {alertasValidade.vencidos.slice(0, filtroAtivo === 'proximo_vencimento' ? 6 : 3).map(produto => {
                                const validadeInfo = verificarValidade(produto)
                                return (
                                  <div key={produto.id} className="bg-white p-3 rounded-lg border border-red-200">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                                    <p className="text-xs text-red-600">🚨 {validadeInfo.textoVencimento}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Produtos vencendo hoje */}
                        {alertasValidade.vencendoHoje.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-orange-700 mb-2">⏰ Vencem hoje ({alertasValidade.vencendoHoje.length})</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {alertasValidade.vencendoHoje.slice(0, filtroAtivo === 'proximo_vencimento' ? 6 : 3).map(produto => {
                                const validadeInfo = verificarValidade(produto)
                                return (
                                  <div key={produto.id} className="bg-white p-3 rounded-lg border border-orange-200">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                                    <p className="text-xs text-orange-600">⏰ {validadeInfo.textoVencimento}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Produtos vencendo em 7 dias */}
                        {alertasValidade.vencendoEm7Dias.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-yellow-700 mb-2">📅 Vencem em até 7 dias ({alertasValidade.vencendoEm7Dias.length})</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {alertasValidade.vencendoEm7Dias.slice(0, filtroAtivo === 'proximo_vencimento' ? 6 : 3).map(produto => {
                                const validadeInfo = verificarValidade(produto)
                                return (
                                  <div key={produto.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                                    <p className="text-xs text-yellow-600">📅 {validadeInfo.textoVencimento}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Produtos vencendo em 30 dias */}
                        {alertasValidade.vencendoEm30Dias.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-semibold text-blue-700 mb-2">📋 Vencem em até 30 dias ({alertasValidade.vencendoEm30Dias.length})</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {alertasValidade.vencendoEm30Dias.slice(0, filtroAtivo === 'proximo_vencimento' ? 6 : 3).map(produto => {
                                const validadeInfo = verificarValidade(produto)
                                return (
                                  <div key={produto.id} className="bg-white p-3 rounded-lg border border-blue-200">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                                    <p className="text-xs text-blue-600">{validadeInfo.textoVencimento}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Link para ver todos quando não está no filtro específico */}
                        {filtroAtivo !== 'proximo_vencimento' && totalProdutosComProblemaValidade > 9 && (
                          <button 
                            onClick={() => handleCardClick('proximo_vencimento')}
                            className="text-orange-600 text-sm font-medium underline hover:no-underline"
                          >
                            Clique para ver todos os {totalProdutosComProblemaValidade} produtos com problemas de validade
                          </button>
                        )}
                      </div>
                    )}

                    {/* 🆕 MENSAGEM QUANDO NENHUM FILTRO APLICÁVEL */}
                    {filtroAtivo === 'estoque_baixo' && produtosEstoqueBaixo.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Ótimas notícias!</h3>
                        <p className="text-gray-600">Nenhum produto com estoque baixo encontrado.</p>
                      </div>
                    )}

                    {filtroAtivo === 'estoque_zerado' && produtosEstoqueZerado.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Perfeito!</h3>
                        <p className="text-gray-600">Nenhum produto com estoque zerado.</p>
                      </div>
                    )}

                    {filtroAtivo === 'proximo_vencimento' && totalProdutosComProblemaValidade === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Excelente!</h3>
                        <p className="text-gray-600">Nenhum produto próximo ao vencimento.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resumo do Estoque */}
              <div className="bg-white rounded-xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  📊 Resumo do Estoque
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-3xl font-bold text-blue-600">{produtosAtivos.length}</p>
                    <p className="text-blue-600 font-semibold">Produtos Ativos</p>
                  </div>

                  <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-xl font-bold text-green-600">
                      R$ {valorTotalEstoque.toFixed(2)}
                    </p>
                    <p className="text-green-600 font-semibold">Valor do Estoque</p>
                  </div>

                  <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-3xl font-bold text-purple-600">{movimentacoes?.length || 0}</p>
                    <p className="text-purple-600 font-semibold">Total Movimentações</p>
                  </div>

                  <div className="text-center p-6 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-3xl font-bold text-orange-600">
                      {Math.round(((produtosAtivos.length - produtosEstoqueBaixo.length) / Math.max(produtosAtivos.length, 1)) * 100)}%
                    </p>
                    <p className="text-orange-600 font-semibold">Estoque Saudável</p>
                  </div>
                </div>
              </div>

              {/* Informações sobre o sistema */}
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">💡</div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-800 mb-2">
                      {user?.isMultiTenant ? 'Sistema Multi-tenant' : 'Sobre o Sistema'}
                    </h3>
                    <div className="text-sm text-blue-700 space-y-2">
                      {user?.isMultiTenant ? (
                        <>
                          <p>• Os dados desta empresa estão <strong>completamente isolados</strong> de outras empresas</p>
                          <p>• Backup e sincronização automática em tempo real</p>
                          <p>• Sistema seguro com autenticação por empresa</p>
                        </>
                      ) : (
                        <>
                          <p>• O faturamento é calculado apenas com as <strong>vendas (saídas)</strong> do mês atual</p>
                          <p>• Automaticamente zera todo dia 1º do mês para um novo ciclo</p>
                          <p>• Para análises históricas, use a aba <strong>Relatórios</strong> com períodos personalizados</p>
                          <p>• O lucro líquido detalhado está disponível nos relatórios</p>
                        </>
                      )}
                      <p>• <strong>🆕 Cards filtráveis:</strong> Clique nos cards de alertas para filtrar visualizações específicas</p>
                      <p>• Todos os dados são sincronizados em tempo real com o Firebase</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}