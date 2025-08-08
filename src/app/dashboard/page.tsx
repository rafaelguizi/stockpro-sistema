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
}

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()
  
  // Hooks do Firestore
  const { data: produtos, loading: loadingProdutos } = useFirestore<Produto>('produtos')
  const { data: movimentacoes, loading: loadingMovimentacoes } = useFirestore<Movimentacao>('movimentacoes')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular um pequeno delay para melhor UX
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Aguardar dados do Firebase
  const isDataLoading = loading || loadingProdutos || loadingMovimentacoes

  // Função para verificar produtos próximos do vencimento
  const verificarProdutosVencimento = () => {
    if (!produtos) return { vencendoHoje: [], vencendoEm7Dias: [], vencendoEm30Dias: [], vencidos: [] }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const produtosComValidade = produtos.filter(p => p.ativo && p.temValidade && p.dataValidade)

    const vencidos: Produto[] = []
    const vencendoHoje: Produto[] = []
    const vencendoEm7Dias: Produto[] = []
    const vencendoEm30Dias: Produto[] = []

    produtosComValidade.forEach(produto => {
      if (!produto.dataValidade) return

      const dataValidade = new Date(produto.dataValidade + 'T00:00:00')
      dataValidade.setHours(0, 0, 0, 0)
      
      const diasParaVencer = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

      if (diasParaVencer < 0) {
        vencidos.push(produto)
      } else if (diasParaVencer === 0) {
        vencendoHoje.push(produto)
      } else if (diasParaVencer <= 7) {
        vencendoEm7Dias.push(produto)
      } else if (diasParaVencer <= (produto.diasAlerta || 30)) {
        vencendoEm30Dias.push(produto)
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
  const totalProdutosComProblemaValidade = alertasValidade.vencidos.length + 
                                          alertasValidade.vencendoHoje.length + 
                                          alertasValidade.vencendoEm7Dias.length

  // Faturamento mensal
  const faturamentoMensal = calcularFaturamentoMensal()

  // Valor total do estoque
  const valorTotalEstoque = produtosAtivos.reduce((total, produto) => {
    return total + (produto.estoque * produto.valorCompra)
  }, 0)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <MobileHeader 
          title="Dashboard Principal" 
          currentPage="/dashboard" 
          userEmail={user?.email || undefined}
        />

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 lg:ml-64">

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
                <p className="text-gray-500 text-sm mt-2">Sincronizando dados do Firebase</p>
                
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
                      <p className="text-purple-200 text-sm mt-1">
                        Logado como: <span className="font-semibold">{user.email}</span>
                      </p>
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
                      <span className="text-xl">📋</span>
                      <span>Nova Movimentação</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">

                {/* Total de Produtos */}
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

                {/* Estoque Baixo */}
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-yellow-100 text-sm">Estoque Baixo</p>
                      <p className="text-3xl font-bold">{produtosEstoqueBaixo.length}</p>
                      <p className="text-yellow-100 text-xs">Precisam reposição</p>
                    </div>
                    <div className="text-4xl ml-3">⚠️</div>
                  </div>
                </div>

                {/* Estoque Zerado */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-red-100 text-sm">Estoque Zerado</p>
                      <p className="text-3xl font-bold">{produtosEstoqueZerado.length}</p>
                      <p className="text-red-100 text-xs">Sem estoque</p>
                    </div>
                    <div className="text-4xl ml-3">🚫</div>
                  </div>
                </div>

                {/* Alertas de Validade */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-purple-100 text-sm">Próx. Vencimento</p>
                      <p className="text-3xl font-bold">{totalProdutosComProblemaValidade}</p>
                      <p className="text-purple-100 text-xs">Requer atenção</p>
                    </div>
                    <div className="text-4xl ml-3">📅</div>
                  </div>
                </div>

                {/* Faturamento Mensal */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-green-100 text-sm">Faturamento</p>
                      <p className="text-xl font-bold">R\$ {faturamentoMensal.totalFaturamento.toFixed(2)}</p>
                      <p className="text-green-100 text-xs">{faturamentoMensal.quantidadeVendas} vendas</p>
                    </div>
                    <div className="text-4xl ml-3">💰</div>
                  </div>
                </div>
              </div>

              {/* Alertas de Estoque */}
              {(produtosEstoqueBaixo.length > 0 || produtosEstoqueZerado.length > 0 || totalProdutosComProblemaValidade > 0) && (
                <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    🚨 Alertas Importantes
                  </h3>

                  <div className="space-y-6">
                    {/* Produtos com estoque zerado */}
                    {produtosEstoqueZerado.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                        <h4 className="font-bold text-red-800 mb-3 flex items-center">
                          🚫 Produtos sem estoque ({produtosEstoqueZerado.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {produtosEstoqueZerado.slice(0, 6).map(produto => (
                            <div key={produto.id} className="bg-white p-4 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                              <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                              <p className="text-xs text-gray-500">#{produto.codigo}</p>
                              <p className="text-xs text-red-600 font-bold">Estoque: 0</p>
                            </div>
                          ))}
                        </div>
                        {produtosEstoqueZerado.length > 6 && (
                          <p className="text-red-600 text-sm mt-3 font-medium">
                            +{produtosEstoqueZerado.length - 6} produtos também estão sem estoque
                          </p>
                        )}
                      </div>
                    )}

                    {/* Produtos com estoque baixo */}
                    {produtosEstoqueBaixo.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                        <h4 className="font-bold text-yellow-800 mb-3 flex items-center">
                          ⚠️ Produtos com estoque baixo ({produtosEstoqueBaixo.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {produtosEstoqueBaixo.slice(0, 6).map(produto => (
                            <div key={produto.id} className="bg-white p-4 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                              <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                              <p className="text-xs text-gray-500">#{produto.codigo}</p>
                              <p className="text-xs text-yellow-600 font-bold">
                                Estoque: {produto.estoque} (mín: {produto.estoqueMinimo})
                              </p>
                            </div>
                          ))}
                        </div>
                        {produtosEstoqueBaixo.length > 6 && (
                          <p className="text-yellow-600 text-sm mt-3 font-medium">
                            +{produtosEstoqueBaixo.length - 6} produtos também estão com estoque baixo
                          </p>
                        )}
                      </div>
                    )}

                    {/* Alertas de Validade */}
                    {alertasValidade.vencidos.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                        <h4 className="font-bold text-red-800 mb-3 flex items-center">
                          🚨 Produtos VENCIDOS ({alertasValidade.vencidos.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {alertasValidade.vencidos.slice(0, 6).map(produto => (
                            <div key={produto.id} className="bg-white p-4 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                              <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                              <p className="text-xs text-gray-500">#{produto.codigo}</p>
                              <p className="text-xs text-red-600 font-bold">
                                Venceu em: {produto.dataValidade ? new Date(produto.dataValidade).toLocaleDateString('pt-BR') : 'N/A'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {alertasValidade.vencendoHoje.length > 0 && (
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                        <h4 className="font-bold text-orange-800 mb-3 flex items-center">
                          ⏰ Produtos vencendo HOJE ({alertasValidade.vencendoHoje.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {alertasValidade.vencendoHoje.slice(0, 6).map(produto => (
                            <div key={produto.id} className="bg-white p-4 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                              <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                              <p className="text-xs text-gray-500">#{produto.codigo}</p>
                              <p className="text-xs text-orange-600 font-bold">Vence hoje!</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {alertasValidade.vencendoEm7Dias.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                        <h4 className="font-bold text-yellow-800 mb-3 flex items-center">
                          📆 Produtos vencendo em até 7 dias ({alertasValidade.vencendoEm7Dias.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {alertasValidade.vencendoEm7Dias.slice(0, 6).map(produto => {
                            const hoje = new Date()
                            hoje.setHours(0, 0, 0, 0)
                            
                            const dataValidade = new Date(produto.dataValidade + 'T00:00:00')
                            dataValidade.setHours(0, 0, 0, 0)
                            
                            const diasParaVencer = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                            
                            return (
                              <div key={produto.id} className="bg-white p-4 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow">
                                <p className="font-semibold text-gray-900 text-sm truncate">{produto.nome}</p>
                                <p className="text-xs text-gray-500">#{produto.codigo}</p>
                                <p className="text-xs text-yellow-600 font-bold">
                                  {diasParaVencer === 1 ? 'Vence amanhã' : `Vence em ${diasParaVencer} dia${diasParaVencer !== 1 ? 's' : ''}`}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ações Rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <button
                  onClick={() => router.push('/produtos')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-4xl mb-3">➕</div>
                  <div className="font-bold text-xl">Novo Produto</div>
                  <div className="text-blue-100 text-sm mt-2">Cadastrar item</div>
                </button>

                <button
                  onClick={() => router.push('/movimentacoes')}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-4xl mb-3">📦</div>
                  <div className="font-bold text-xl">Nova Movimentação</div>
                  <div className="text-green-100 text-sm mt-2">Entrada/Saída</div>
                </button>

                <button
                  onClick={() => router.push('/pdv')}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-4xl mb-3">💰</div>
                  <div className="font-bold text-xl">PDV</div>
                  <div className="text-purple-100 text-sm mt-2">Ponto de Venda</div>
                </button>

                <button
                  onClick={() => router.push('/relatorios')}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-4xl mb-3">📊</div>
                  <div className="font-bold text-xl">Relatórios</div>
                  <div className="text-orange-100 text-sm mt-2">Análises</div>
                </button>
              </div>

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
                      R\$ {valorTotalEstoque.toFixed(2)}
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
                      Sobre o Faturamento Mensal
                    </h3>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p>• O faturamento é calculado apenas com as <strong>vendas (saídas)</strong> do mês atual</p>
                      <p>• Automaticamente zera todo dia 1º do mês para um novo ciclo</p>
                      <p>• Para análises históricas, use a aba <strong>Relatórios</strong> com períodos personalizados</p>
                      <p>• O lucro líquido detalhado está disponível nos relatórios</p>
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