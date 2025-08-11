// src/app/movimentacoes/page.tsx
'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFirestore } from '@/hooks/useFirestore'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'
import ProtectedRoute from '@/components/ProtectedRoute'

// 🆕 INTERFACE CATEGORIA FIRESTORE
interface CategoriaFirestore {
  id: string
  nome: string
  descricao: string
  cor: string
  icone: string
  categoriaPai?: string
  ativo: boolean
  dataCadastro: string
  userId: string
}

interface Produto {
  id: string
  codigo: string
  nome: string
  categoria: string
  categoriaId?: string // 🆕 INTEGRAÇÃO COM CATEGORIAS
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
  produto: string
  codigo: string
  produtoId: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  valorUnitario: number
  valorTotal: number
  data: string
  hora: string
  observacao: string
  userId: string
}

// 🆕 COMPONENTE DE BUSCA INTELIGENTE ATUALIZADO COM CATEGORIAS
interface ProdutoSelectorProps {
  produtos: Produto[]
  categorias?: CategoriaFirestore[]
  onSelect: (produto: Produto | null) => void
  produtoSelecionado?: Produto | null
  disabled?: boolean
}

function ProdutoSelector({ produtos, categorias, onSelect, produtoSelecionado, disabled }: ProdutoSelectorProps) {
  const [busca, setBusca] = useState('')
  const [mostrarLista, setMostrarLista] = useState(false)
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>(produtos)
  const inputRef = useRef<HTMLInputElement>(null)

  // 🆕 FUNÇÃO PARA OBTER DADOS DA CATEGORIA
  const obterDadosCategoria = useCallback((produto: Produto) => {
    if (produto.categoriaId && categorias) {
      const categoria = categorias.find(cat => cat.id === produto.categoriaId)
      if (categoria) {
        return {
          id: categoria.id,
          nome: categoria.nome,
          icone: categoria.icone,
          cor: categoria.cor,
          descricao: categoria.descricao
        }
      }
    }
    
    return {
      id: '',
      nome: produto.categoria || 'Geral',
      icone: '📦',
      cor: '#6B7280',
      descricao: 'Categoria geral'
    }
  }, [categorias])

  // Filtrar produtos conforme busca
  const filtrarProdutos = (termoBusca: string) => {
    if (!termoBusca.trim()) {
      setProdutosFiltrados(produtos)
      return
    }

    const filtrados = produtos.filter(produto =>
      produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      produto.categoria?.toLowerCase().includes(termoBusca.toLowerCase())
    ).sort((a, b) => {
      // Priorizar produtos com nome que começam com o termo de busca
      const aStartsWith = a.nome.toLowerCase().startsWith(termoBusca.toLowerCase())
      const bStartsWith = b.nome.toLowerCase().startsWith(termoBusca.toLowerCase())
      
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      
      return a.nome.localeCompare(b.nome)
    })
    
    setProdutosFiltrados(filtrados)
  }

  const handleBuscaChange = (valor: string) => {
    setBusca(valor)
    filtrarProdutos(valor)
    setMostrarLista(true)
    
    // Se limpar a busca, limpar seleção
    if (!valor.trim()) {
      onSelect(null)
    }
  }

  const handleSelect = (produto: Produto) => {
    onSelect(produto)
    setBusca(produto.nome)
    setMostrarLista(false)
  }

  const limparSelecao = () => {
    setBusca('')
    onSelect(null)
    setMostrarLista(false)
    setProdutosFiltrados(produtos)
  }

  // Auto-focus e atalhos de teclado
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMostrarLista(false)
      }
    }

    if (mostrarLista) {
      document.addEventListener('keydown', handleKeydown)
      return () => document.removeEventListener('keydown', handleKeydown)
    }
  }, [mostrarLista])

  // Verificar validade do produto
  const verificarValidade = (produto: Produto) => {
    if (!produto.temValidade || !produto.dataValidade) return null

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const [ano, mes, dia] = produto.dataValidade.split('-').map(Number)
    const dataValidade = new Date(ano, mes - 1, dia)
    dataValidade.setHours(0, 0, 0, 0)
    
    const diasRestantes = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diasRestantes < 0) return { status: 'vencido', dias: Math.abs(diasRestantes) }
    if (diasRestantes === 0) return { status: 'vence_hoje', dias: 0 }
    if (diasRestantes <= 7) return { status: 'vence_em_7_dias', dias: diasRestantes }
    if (diasRestantes <= (produto.diasAlerta || 30)) return { status: 'proximo_vencimento', dias: diasRestantes }
    
    return { status: 'valido', dias: diasRestantes }
  }

  return (
    <div className="relative">
      {/* Campo de busca */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
          onFocus={() => {
            setMostrarLista(true)
            filtrarProdutos(busca)
          }}
          className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm pr-10 transition-all duration-200"
          placeholder="🔍 Busque por nome, código ou categoria..."
          disabled={disabled}
          autoComplete="off"
        />
        
        {busca && (
          <button
            type="button"
            onClick={limparSelecao}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Lista de produtos (ATUALIZADA COM VISUAL DE CATEGORIAS) */}
      {mostrarLista && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in">
          {produtosFiltrados.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {busca ? (
                <>
                  <div className="text-2xl mb-2">😔</div>
                  <div>Nenhum produto encontrado para "<strong>{busca}</strong>"</div>
                  <div className="text-xs text-gray-400 mt-1">Tente buscar por nome, código ou categoria</div>
                </>
              ) : (
                <>
                  <div className="text-2xl mb-2">📦</div>
                  <div>Nenhum produto disponível</div>
                </>
              )}
            </div>
          ) : (
            <>
              {produtosFiltrados.map((produto, index) => {
                const validadeInfo = verificarValidade(produto)
                const dadosCategoria = obterDadosCategoria(produto) // 🆕 OBTER DADOS DA CATEGORIA
                
                return (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => handleSelect(produto)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-100 focus:outline-none transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center flex-1">
                        {/* 🆕 ÍCONE DA CATEGORIA */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 flex-shrink-0"
                          style={{ backgroundColor: dadosCategoria.cor }}
                        >
                          <span className="text-sm">{dadosCategoria.icone}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{produto.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2 flex-wrap">
                            <span>#{produto.codigo}</span>
                            <span>•</span>
                            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: dadosCategoria.cor + '20', color: dadosCategoria.cor }}>
                              {dadosCategoria.nome}
                            </span>
                            <span>•</span>
                            <span>Est: {produto.estoque}</span>
                            <span>•</span>
                            <span>R$ {produto.valorVenda.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1 ml-2">
                        {produto.estoque <= 0 && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            🚫 Sem estoque
                          </span>
                        )}
                        {produto.estoque > 0 && produto.estoque <= produto.estoqueMinimo && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            ⚠️ Estoque baixo
                          </span>
                        )}
                        {validadeInfo && (
                          <>
                            {validadeInfo.status === 'vencido' && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                🚨 Vencido
                              </span>
                            )}
                            {validadeInfo.status === 'vence_hoje' && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                ⏰ Vence hoje
                              </span>
                            )}
                            {validadeInfo.status === 'vence_em_7_dias' && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                📅 {validadeInfo.dias} dias
                              </span>
                            )}
                            {validadeInfo.status === 'proximo_vencimento' && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                ⚠️ {validadeInfo.dias} dias
                              </span>
                            )}
                            {validadeInfo.status === 'valido' && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                ✅ Válido
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              
              {/* Rodapé com informações */}
              <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                {produtosFiltrados.length} produto(s) encontrado(s) • Use ↑↓ para navegar • ESC para fechar
              </div>
            </>
          )}
        </div>
      )}

      {/* Produto selecionado (ATUALIZADO COM VISUAL DE CATEGORIA) */}
      {produtoSelecionado && !mostrarLista && (
        <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg animate-slide-down">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3 flex-1">
              {/* 🆕 ÍCONE DA CATEGORIA DO PRODUTO SELECIONADO */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: obterDadosCategoria(produtoSelecionado).cor }}
              >
                <span className="text-lg">{obterDadosCategoria(produtoSelecionado).icone}</span>
              </div>
              
              <div className="flex-1">
                <div className="font-medium text-blue-900 text-lg">{produtoSelecionado.nome}</div>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <div className="flex items-center space-x-4 flex-wrap">
                    <span><strong>Código:</strong> #{produtoSelecionado.codigo}</span>
                    <span className="text-xs px-2 py-1 rounded-full" 
                          style={{ backgroundColor: obterDadosCategoria(produtoSelecionado).cor + '20', 
                                  color: obterDadosCategoria(produtoSelecionado).cor }}>
                      <strong>Categoria:</strong> {obterDadosCategoria(produtoSelecionado).nome}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 flex-wrap">
                    <span><strong>Estoque atual:</strong> {produtoSelecionado.estoque} unidades</span>
                    <span><strong>Estoque mínimo:</strong> {produtoSelecionado.estoqueMinimo}</span>
                  </div>
                  <div className="flex items-center space-x-4 flex-wrap">
                    <span><strong>Preço compra:</strong> R$ {produtoSelecionado.valorCompra.toFixed(2)}</span>
                    <span><strong>Preço venda:</strong> R$ {produtoSelecionado.valorVenda.toFixed(2)}</span>
                  </div>
                  
                  {/* Validade do produto */}
                  {produtoSelecionado.temValidade && produtoSelecionado.dataValidade && (
                    <div className="flex items-center space-x-4 flex-wrap">
                      <span><strong>Validade:</strong> {(() => {
                        const [ano, mes, dia] = produtoSelecionado.dataValidade.split('-')
                        return `${dia}/${mes}/${ano}`
                      })()}</span>
                      {(() => {
                        const validadeInfo = verificarValidade(produtoSelecionado)
                        if (validadeInfo) {
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              validadeInfo.status === 'vencido' ? 'bg-red-100 text-red-800' :
                              validadeInfo.status === 'vence_hoje' ? 'bg-orange-100 text-orange-800' :
                              validadeInfo.status === 'vence_em_7_dias' ? 'bg-yellow-100 text-yellow-800' :
                              validadeInfo.status === 'proximo_vencimento' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {validadeInfo.status === 'vencido' ? `🚨 Vencido há ${validadeInfo.dias} dias` :
                               validadeInfo.status === 'vence_hoje' ? '⏰ Vence hoje' :
                               `📅 ${validadeInfo.dias} dias restantes`}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}
                  
                  {/* Alertas do produto */}
                  <div className="flex items-center space-x-2 mt-2 flex-wrap">
                    {produtoSelecionado.estoque <= 0 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        🚫 Sem estoque
                      </span>
                    )}
                    {produtoSelecionado.estoque > 0 && produtoSelecionado.estoque <= produtoSelecionado.estoqueMinimo && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        ⚠️ Estoque baixo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={limparSelecao}
              className="ml-4 text-blue-600 hover:text-blue-800 font-medium transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Overlay para fechar lista */}
      {mostrarLista && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMostrarLista(false)}
        />
      )}
    </div>
  )
}

export default function Movimentacoes() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()

  // 🆕 MARGEM DINÂMICA BASEADA NO ESTADO DA SIDEBAR (CORRIGIDO - IGUAL DASHBOARD)
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
  
  // 🆕 HOOK PARA CATEGORIAS FIRESTORE
  const { 
    data: categorias, 
    loading: loadingCategorias 
  } = useFirestore<CategoriaFirestore>('categorias')
  
  // Hooks do Firestore
  const { 
    data: produtos, 
    loading: loadingProdutos,
    updateDocument: updateProduto
  } = useFirestore<Produto>('produtos')

  const { 
    data: movimentacoes, 
    loading: loadingMovimentacoes, 
    addDocument: addMovimentacao, 
    deleteDocument: deleteMovimentacao
  } = useFirestore<Movimentacao>('movimentacoes')

  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estados do produto selecionado
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    quantidade: '',
    observacao: ''
  })

  // Estados de filtro
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  // 🆕 NOVO FILTRO POR CATEGORIA
  const [filtroCategoria, setFiltroCategoria] = useState('')
  
  // Estados de ordenação
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'produto_asc' | 'valor_desc'>('data_desc')
  
  // Estados extras
  const [modoNoturno, setModoNoturno] = useState(false)
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([])
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false)

  // 🆕 FUNÇÃO PARA OBTER DADOS DA CATEGORIA
  const obterDadosCategoria = useCallback((produto: Produto) => {
    if (produto.categoriaId && categorias) {
      const categoria = categorias.find(cat => cat.id === produto.categoriaId)
      if (categoria) {
        return {
          id: categoria.id,
          nome: categoria.nome,
          icone: categoria.icone,
          cor: categoria.cor,
          descricao: categoria.descricao
        }
      }
    }
    
    return {
      id: '',
      nome: produto.categoria || 'Geral',
      icone: '📦',
      cor: '#6B7280',
      descricao: 'Categoria geral'
    }
  }, [categorias])

  // 🆕 CATEGORIAS PARA FILTRO
  const categoriasParaFiltro = useMemo(() => {
    if (!categorias) return []
    return categorias.filter(cat => cat.ativo).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categorias])

  // Definir produtosAtivos ANTES de usar nos useEffects
  const produtosAtivos = produtos ? produtos.filter(p => p.ativo) : []
  const isLoadingData = loadingProdutos || loadingMovimentacoes || loadingCategorias

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+N - Nova movimentação
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        if (produtosAtivos.length > 0) {
          setShowForm(true)
        }
      }
      // Ctrl+F - Focar na busca
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        document.getElementById('busca-movimentacoes')?.focus()
      }
      // Escape - Fechar modal
      if (e.key === 'Escape' && showForm) {
        resetForm()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showForm, produtosAtivos.length])

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      quantidade: '',
      observacao: ''
    })
    setProdutoSelecionado(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Erro de autenticação', 'Usuário não encontrado!')
      return
    }

    setLoading(true)
    try {
      // Validações
      if (!produtoSelecionado || !formData.quantidade) {
        toast.error('Campos obrigatórios', 'Selecione um produto e informe a quantidade!')
        return
      }

      const quantidade = parseInt(formData.quantidade)

      if (quantidade <= 0) {
        toast.error('Quantidade inválida', 'Quantidade deve ser maior que zero!')
        return
      }

      if (!produtoSelecionado.ativo) {
        toast.error('Produto inativo', 'Não é possível movimentar produtos inativos!')
        return
      }

      // Verificar estoque para saídas
      if (formData.tipo === 'saida' && produtoSelecionado.estoque < quantidade) {
        toast.error('Estoque insuficiente', `Estoque atual: ${produtoSelecionado.estoque} unidades`)
        return
      }

      // Calcular novo estoque
      const novoEstoque = formData.tipo === 'entrada' 
        ? produtoSelecionado.estoque + quantidade 
        : produtoSelecionado.estoque - quantidade

      if (novoEstoque < 0) {
        toast.error('Erro no cálculo', 'Estoque não pode ficar negativo!')
        return
      }

      // Usar valor padrão do produto (entrada = valor compra, saída = valor venda)
      const valorUnitario = formData.tipo === 'entrada' ? produtoSelecionado.valorCompra : produtoSelecionado.valorVenda

      const novaMovimentacao = {
        produto: produtoSelecionado.nome,
        codigo: produtoSelecionado.codigo,
        produtoId: produtoSelecionado.id,
        tipo: formData.tipo,
        quantidade,
        valorUnitario,
        valorTotal: valorUnitario * quantidade,
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        observacao: formData.observacao,
        userId: user.uid
      }

      // Salvar movimentação
      await addMovimentacao(novaMovimentacao)

      // Atualizar estoque do produto
      await updateProduto(produtoSelecionado.id, { ...produtoSelecionado, estoque: novoEstoque })

      const tipoTexto = formData.tipo === 'entrada' ? 'Entrada' : 'Saída'
      toast.success(
        `${tipoTexto} registrada!`, 
        `${quantidade} unidades de ${produtoSelecionado.nome}`
      )

      resetForm()
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
      toast.error('Erro ao salvar', 'Não foi possível salvar a movimentação!')
    } finally {
      setLoading(false)
    }
  }

  const excluirMovimentacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return

    if (!movimentacoes || !produtos) return

    setLoading(true)
    try {
      const movimentacao = movimentacoes.find(m => m.id === id)
      if (!movimentacao) return

      // Reverter o estoque
      const produto = produtos.find(p => p.id === movimentacao.produtoId)
      if (produto) {
        const estoqueRevertido = movimentacao.tipo === 'entrada' 
          ? produto.estoque - movimentacao.quantidade 
          : produto.estoque + movimentacao.quantidade
        
        if (estoqueRevertido >= 0) {
          await updateProduto(produto.id, { ...produto, estoque: estoqueRevertido })
        }
      }
      
      await deleteMovimentacao(id)
      toast.success('Movimentação excluída!', 'Estoque foi revertido automaticamente')
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error)
      toast.error('Erro ao excluir', 'Não foi possível excluir a movimentação!')
    } finally {
      setLoading(false)
    }
  }

  // Excluir múltiplas movimentações
  const excluirMovimentacoesSelecionadas = async () => {
    if (itensSelecionados.length === 0) return
    
    if (!confirm(`Tem certeza que deseja excluir ${itensSelecionados.length} movimentação(ões)?`)) return

    setLoading(true)
    try {
      for (const id of itensSelecionados) {
        await excluirMovimentacao(id)
      }
      setItensSelecionados([])
      toast.success('Movimentações excluídas!', `${itensSelecionados.length} itens removidos`)
    } catch (error) {
      toast.error('Erro ao excluir', 'Não foi possível excluir algumas movimentações')
    } finally {
      setLoading(false)
    }
  }

  // 🆕 FILTRAR MOVIMENTAÇÕES ATUALIZADO COM CATEGORIA
  const movimentacoesFiltradas = movimentacoes ? movimentacoes.filter(mov => {
    // Busca básica
    const matchBusca = mov.produto.toLowerCase().includes(busca.toLowerCase()) ||
                      mov.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                      mov.observacao.toLowerCase().includes(busca.toLowerCase())
    
    const matchTipo = filtroTipo === '' || mov.tipo === filtroTipo
    const matchData = filtroData === '' || mov.data === filtroData
    const matchProduto = filtroProduto === '' || mov.codigo === filtroProduto
    
    // 🆕 FILTRO POR CATEGORIA
    let matchCategoria = true
    if (filtroCategoria && produtos) {
      const produto = produtos.find(p => p.id === mov.produtoId)
      if (produto) {
        if (filtroCategoria === 'sem_categoria') {
          matchCategoria = !produto.categoriaId
        } else {
          matchCategoria = produto.categoriaId === filtroCategoria
        }
      } else {
        matchCategoria = false
      }
    }
    
    // Filtro por período
    let matchPeriodo = true
    if (filtroDataInicio || filtroDataFim) {
      const dataMovParts = mov.data.split('/')
      const dataMovObj = new Date(parseInt(dataMovParts[2]), parseInt(dataMovParts[1]) - 1, parseInt(dataMovParts[0]))
      
      if (filtroDataInicio) {
        const dataInicio = new Date(filtroDataInicio)
        matchPeriodo = matchPeriodo && dataMovObj >= dataInicio
      }
      
      if (filtroDataFim) {
        const dataFim = new Date(filtroDataFim)
        matchPeriodo = matchPeriodo && dataMovObj <= dataFim
      }
    }
    
    return matchBusca && matchTipo && matchData && matchProduto && matchCategoria && matchPeriodo
  }).sort((a, b) => {
    switch (ordenacao) {
      case 'data_desc':
        return new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime()
      case 'data_asc':
        return new Date(a.data + ' ' + a.hora).getTime() - new Date(b.data + ' ' + b.hora).getTime()
      case 'produto_asc':
        return a.produto.localeCompare(b.produto)
      case 'valor_desc':
        return b.valorTotal - a.valorTotal
      default:
        return 0
    }
  }) : []

  // Obter datas únicas
  const datasUnicas = movimentacoes ? 
    [...new Set(movimentacoes.map(m => m.data))].sort().reverse() : []

  // Exportar dados
  const exportarDados = () => {
    if (movimentacoesFiltradas.length === 0) {
      toast.warning('Nenhum dado', 'Não há movimentações para exportar')
      return
    }

    const csv = [
      'Data,Hora,Produto,Código,Categoria,Tipo,Quantidade,Valor Unitário,Valor Total,Observação',
      ...movimentacoesFiltradas.map(mov => {
        const produto = produtos?.find(p => p.id === mov.produtoId)
        const categoria = produto ? obterDadosCategoria(produto).nome : 'N/A'
        
        return `${mov.data},${mov.hora},${mov.produto},${mov.codigo},${categoria},${mov.tipo},${mov.quantidade},${mov.valorUnitario.toFixed(2)},${mov.valorTotal.toFixed(2)},"${mov.observacao}"`
      })
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `movimentacoes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
    link.click()

    toast.success('Dados exportados!', 'Arquivo CSV baixado com sucesso')
  }

  // 🆕 ESTATÍSTICAS POR CATEGORIA
  const estatisticasCategorias = useMemo(() => {
    if (!movimentacoes || !produtos || !categorias) return []

    const statsPorCategoria = new Map()

    movimentacoes.forEach(mov => {
      const produto = produtos.find(p => p.id === mov.produtoId)
      if (!produto) return

      const dadosCategoria = obterDadosCategoria(produto)
      const chaveCategoria = dadosCategoria.id || 'sem_categoria'

      if (!statsPorCategoria.has(chaveCategoria)) {
        statsPorCategoria.set(chaveCategoria, {
          categoria: dadosCategoria,
          entradas: 0,
          saidas: 0,
          valorEntradas: 0,
          valorSaidas: 0,
          totalMovimentacoes: 0
        })
      }

      const stats = statsPorCategoria.get(chaveCategoria)
      stats.totalMovimentacoes++

      if (mov.tipo === 'entrada') {
        stats.entradas++
        stats.valorEntradas += mov.valorTotal
      } else {
        stats.saidas++
        stats.valorSaidas += mov.valorTotal
      }
    })

    return Array.from(statsPorCategoria.values())
      .sort((a, b) => b.totalMovimentacoes - a.totalMovimentacoes)
  }, [movimentacoes, produtos, categorias, obterDadosCategoria])

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="Movimentações de Estoque" 
          currentPage="/movimentacoes" 
          userEmail={user?.email || undefined}
        />

        <main className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed
           ? 'lg:ml-16 lg:mr-4'
           : 'max-w-7xl mx-auto lg:ml-64'
        }`}>
          
          {/* Loading de carregamento inicial */}
          {isLoadingData && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-blue-600 text-2xl">📋</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando movimentações...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Sincronizando dados do Firebase</p>
              </div>
            </div>
          )}

          {/* Header principal */}
          {!isLoadingData && (
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                  📋 Controle de Movimentações
                </h1>
                <p className={`text-sm mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ctrl+N para nova movimentação • Ctrl+F para buscar
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <LoadingButton
                  onClick={() => setModoNoturno(!modoNoturno)}
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  {modoNoturno ? '☀️ Modo Dia' : '🌙 Modo Noite'}
                </LoadingButton>
                <LoadingButton
                  onClick={() => setShowForm(true)}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  disabled={produtosAtivos.length === 0}
                >
                  ➕ Nova Movimentação (Ctrl+N)
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Aviso se não há produtos */}
          {!isLoadingData && produtosAtivos.length === 0 && (
            <div className={`border rounded-xl p-6 mb-6 animate-fade-in ${modoNoturno ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⚠️</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-yellow-200' : 'text-yellow-800'}`}>
                    Nenhum produto ativo encontrado
                  </h3>
                  <div className={`mt-2 text-sm ${modoNoturno ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    <p>Para registrar movimentações, você precisa ter produtos ativos cadastrados.</p>
                  </div>
                  <div className="mt-4">
                    <LoadingButton
                      onClick={() => router.push('/produtos')}
                      variant="warning"
                      size="md"
                    >
                      📦 Ir para Produtos
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 ESTATÍSTICAS POR CATEGORIA */}
          {!isLoadingData && estatisticasCategorias.length > 0 && (
            <div className={`p-6 rounded-xl shadow-lg mb-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                📊 Movimentações por Categoria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {estatisticasCategorias.slice(0, 6).map(stat => (
                  <div
                    key={stat.categoria.id || 'sem_categoria'}
                    className={`p-4 rounded-lg border transition-colors duration-200 ${
                      modoNoturno ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                          style={{ backgroundColor: stat.categoria.cor }}
                        >
                          <span className="text-sm">{stat.categoria.icone}</span>
                        </div>
                        <div>
                          <h4 className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                            {stat.categoria.nome}
                          </h4>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                        {stat.totalMovimentacoes} movs.
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={modoNoturno ? 'text-gray-400' : 'text-gray-600'}>Entradas:</span>
                        <span className={`font-medium text-green-600`}>
                          {stat.entradas} (R$ {stat.valorEntradas.toFixed(0)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={modoNoturno ? 'text-gray-400' : 'text-gray-600'}>Saídas:</span>
                        <span className={`font-medium text-red-600`}>
                          {stat.saidas} (R$ {stat.valorSaidas.toFixed(0)})
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>Saldo:</span>
                        <span className={`font-bold ${
                          (stat.valorEntradas - stat.valorSaidas) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          R$ {(stat.valorEntradas - stat.valorSaidas).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🆕 FILTROS ATUALIZADOS COM CATEGORIA */}
          {!isLoadingData && produtosAtivos.length > 0 && (
            <div className={`p-6 rounded-xl shadow-lg mb-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>🔍 Filtros</h3>
                <button
                  onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
                  className={`text-sm font-medium transition-colors ${modoNoturno ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {mostrarFiltrosAvancados ? '📄 Filtros Básicos' : '⚙️ Filtros Avançados'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Buscar</label>
                  <input
                    id="busca-movimentacoes"
                    type="text"
                    placeholder="Produto, código ou observação..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-400 bg-white text-gray-900 placeholder-gray-600'
                    }`}
                  />
                </div>

                {/* 🆕 FILTRO POR CATEGORIA */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Categoria</label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-400 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todas as categorias</option>
                    <option value="sem_categoria">📦 Sem categoria</option>
                    {categoriasParaFiltro.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.icone} {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Tipo</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-400 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos os tipos</option>
                    <option value="entrada">📥 Entradas</option>
                    <option value="saida">📤 Saídas</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Data</label>
                  <select
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-400 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todas as datas</option>
                    {datasUnicas.map(data => (
                      <option key={data} value={data}>{data}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Produto</label>
                  <select
                    value={filtroProduto}
                    onChange={(e) => setFiltroProduto(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-400 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Todos os produtos</option>
                    {produtosAtivos.map(produto => (
                      <option key={produto.codigo} value={produto.codigo}>
                        {produto.nome} (#{produto.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  <LoadingButton
                    onClick={() => {
                      setBusca('')
                      setFiltroTipo('')
                      setFiltroData('')
                      setFiltroProduto('')
                      setFiltroDataInicio('')
                      setFiltroDataFim('')
                      setFiltroCategoria('') // 🆕 LIMPAR FILTRO DE CATEGORIA
                    }}
                    variant="secondary"
                    size="md"
                    className="w-full"
                  >
                    🧹 Limpar
                  </LoadingButton>
                </div>
              </div>

              {/* Filtros avançados */}
              {mostrarFiltrosAvancados && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 animate-slide-down">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Data Início</label>
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-400 bg-white text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Data Fim</label>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-400 bg-white text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Ordenar por</label>
                    <select
                      value={ordenacao}
                      onChange={(e) => setOrdenacao(e.target.value as any)}
                      className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-400 bg-white text-gray-900'
                      }`}
                    >
                      <option value="data_desc">📅 Data (mais recente)</option>
                      <option value="data_asc">📅 Data (mais antiga)</option>
                      <option value="produto_asc">📦 Produto (A-Z)</option>
                      <option value="valor_desc">💰 Valor (maior)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumo dos Filtros e Ações */}
          {!isLoadingData && movimentacoes && (
            <div className={`border rounded-lg p-4 mb-6 transition-colors duration-300 ${modoNoturno ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                <span className={`font-medium ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                  📊 {movimentacoesFiltradas.length} de {movimentacoes.length} movimentações
                  {(busca || filtroTipo || filtroData || filtroProduto || filtroDataInicio || filtroDataFim || filtroCategoria) && (
                    <span className={`ml-2 text-xs ${modoNoturno ? 'text-blue-300' : 'text-blue-600'}`}>🔍 Filtros ativos</span>
                  )}
                </span>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  {itensSelecionados.length > 0 && (
                    <LoadingButton
                      onClick={excluirMovimentacoesSelecionadas}
                      variant="danger"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      🗑️ Excluir {itensSelecionados.length}
                    </LoadingButton>
                  )}
                  <LoadingButton
                    onClick={exportarDados}
                    variant="success"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={movimentacoesFiltradas.length === 0}
                  >
                    📥 Exportar CSV
                  </LoadingButton>
                </div>
              </div>
            </div>
          )}

          {/* Formulário (ATUALIZADO COM CATEGORIAS NO PRODUTO SELECTOR) */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className={`rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                    ➕ Nova Movimentação
                  </h3>
                  <button
                    onClick={resetForm}
                    className={`hover:${modoNoturno ? 'text-gray-300' : 'text-gray-600'} transition-colors ${modoNoturno ? 'text-gray-400' : 'text-gray-400'}`}
                    disabled={loading}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  
                  {/* 🆕 BUSCA INTELIGENTE DE PRODUTOS COM CATEGORIAS */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                      Produto *
                    </label>
                    <ProdutoSelector
                      produtos={produtosAtivos}
                      categorias={categorias || undefined}  // 🆕 PASSAR CATEGORIAS
                      onSelect={setProdutoSelecionado}
                      produtoSelecionado={produtoSelecionado}
                      disabled={loading}
                    />
                    {produtosAtivos.length === 0 && (
                      <p className="text-red-600 text-sm mt-2">
                        Nenhum produto ativo encontrado. Cadastre produtos primeiro.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                      Tipo de Movimentação *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'entrada'})}
                        className={`p-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                          formData.tipo === 'entrada'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : modoNoturno
                              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-green-500'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                        }`}
                        disabled={loading}
                      >
                        📥 Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'saida'})}
                        className={`p-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                          formData.tipo === 'saida'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : modoNoturno
                              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-red-500'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                        }`}
                        disabled={loading}
                      >
                        📤 Saída
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                      className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-400 bg-white text-gray-900 placeholder-gray-600'
                      }`}
                      placeholder="0"
                      required
                      disabled={loading}
                    />
                    
                    {/* Alertas de estoque */}
                    {produtoSelecionado && formData.tipo === 'saida' && formData.quantidade && (
                      <div className="mt-2">
                        {parseInt(formData.quantidade) > produtoSelecionado.estoque ? (
                          <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                            ⚠️ Quantidade maior que estoque disponível ({produtoSelecionado.estoque} unidades)
                          </div>
                        ) : (
                          <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">
                            ✅ Estoque suficiente. Restará {produtoSelecionado.estoque - parseInt(formData.quantidade)} unidades
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                      Observação
                    </label>
                    <textarea
                      value={formData.observacao}
                      onChange={(e) => setFormData({...formData, observacao: e.target.value})}
                      className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-400 bg-white text-gray-900 placeholder-gray-600'
                      }`}
                      placeholder="Observações sobre a movimentação..."
                      rows={3}
                      disabled={loading}
                    />
                  </div>

                  {/* Resumo da movimentação */}
                  {produtoSelecionado && formData.quantidade && (
                    <div className="bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 p-5 rounded-lg border-4 border-green-500 shadow-lg animate-fade-in">
                      <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                        💰 <span className="ml-2">Resumo da Movimentação:</span>
                      </h4>
                      {(() => {
                        const quantidade = parseInt(formData.quantidade)
                        const valorUnitario = formData.tipo === 'entrada' ? produtoSelecionado.valorCompra : produtoSelecionado.valorVenda
                        const valorTotal = valorUnitario * quantidade
                        const dadosCategoria = obterDadosCategoria(produtoSelecionado)
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-white bg-opacity-70 rounded-lg">
                              <span className="text-gray-800 font-medium">Produto:</span>
                              <div className="flex items-center">
                                <div
                                  className="w-6 h-6 rounded flex items-center justify-center text-white mr-2"
                                  style={{ backgroundColor: dadosCategoria.cor }}
                                >
                                  <span className="text-xs">{dadosCategoria.icone}</span>
                                </div>
                                <span className="font-bold text-gray-900">{produtoSelecionado.nome}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white bg-opacity-70 rounded-lg">
                              <span className="text-gray-800 font-medium">Categoria:</span>
                              <span className="text-xs px-2 py-1 rounded-full font-medium"
                                    style={{ backgroundColor: dadosCategoria.cor + '20', color: dadosCategoria.cor }}>
                                {dadosCategoria.nome}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white bg-opacity-70 rounded-lg">
                              <span className="text-gray-800 font-medium">Tipo:</span>
                              <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                                formData.tipo === 'entrada' 
                                  ? 'bg-green-200 text-green-800' 
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {formData.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white bg-opacity-70 rounded-lg">
                              <span className="text-gray-800 font-medium">Quantidade:</span>
                              <span className="font-bold text-gray-900">{quantidade} unidades</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-white bg-opacity-70 rounded-lg">
                              <span className="text-gray-800 font-medium">Valor unitário:</span>
                              <span className="font-bold text-gray-900">R$ {valorUnitario.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-200 to-green-200 rounded-lg border-2 border-blue-400 shadow-md">
                              <span className="text-gray-900 font-bold text-base">Valor total:</span>
                              <span className="font-bold text-blue-800 text-lg">R$ {valorTotal.toFixed(2)}</span>
                            </div>
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-r-lg">
                              <p className="text-sm text-yellow-800 font-medium">
                                💡 <strong>Valor automático:</strong> {formData.tipo === 'entrada' ? 'Preço de compra' : 'Preço de venda'} do produto
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <LoadingButton
                      type="submit"
                      isLoading={loading}
                      loadingText="Salvando..."
                      variant="primary"
                      size="md"
                      className="flex-1"
                      disabled={!produtoSelecionado || !formData.quantidade}
                    >
                      ✅ Registrar Movimentação
                    </LoadingButton>
                    <LoadingButton
                      type="button"
                      onClick={resetForm}
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      disabled={loading}
                    >
                      ❌ Cancelar
                    </LoadingButton>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 🆕 LISTA DE MOVIMENTAÇÕES ATUALIZADA COM VISUAL DE CATEGORIAS */}
          {!isLoadingData && (
            <div className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>📋 Histórico de Movimentações</h3>
                {movimentacoesFiltradas.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setItensSelecionados(movimentacoesFiltradas.map(m => m.id))
                        } else {
                          setItensSelecionados([])
                        }
                      }}
                      checked={itensSelecionados.length === movimentacoesFiltradas.length}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                      Selecionar todos
                    </span>
                  </div>
                )}
              </div>

              {movimentacoesFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 animate-bounce">📋</div>
                  <h3 className={`text-lg font-medium mb-2 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>Nenhuma movimentação encontrada</h3>
                  <p className={`mb-4 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                    {!movimentacoes || movimentacoes.length === 0 
                      ? 'Comece registrando sua primeira movimentação.'
                      : 'Tente ajustar os filtros para encontrar as movimentações desejadas.'
                    }
                  </p>
                   {produtosAtivos.length > 0 && (
                    <LoadingButton
                      onClick={() => setShowForm(true)}
                      variant="primary"
                      size="md"
                      className="w-full sm:w-auto"
                    >
                      ➕ Nova Movimentação
                    </LoadingButton>
                  )}
                </div>
              ) : (
                <>
                  {/* Versão Mobile - Cards (ATUALIZADA COM CATEGORIAS) */}
                  <div className="block sm:hidden">
                    <div className={`divide-y ${modoNoturno ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {movimentacoesFiltradas.map((mov) => {
                        const produto = produtos?.find(p => p.id === mov.produtoId)
                        const dadosCategoria = produto ? obterDadosCategoria(produto) : { nome: 'N/A', icone: '📦', cor: '#6B7280' }
                        
                        return (
                          <div key={mov.id} className={`p-4 hover:${modoNoturno ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  checked={itensSelecionados.includes(mov.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setItensSelecionados([...itensSelecionados, mov.id])
                                    } else {
                                      setItensSelecionados(itensSelecionados.filter(id => id !== mov.id))
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                                />
                                
                                {/* 🆕 ÍCONE DA CATEGORIA */}
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                                  style={{ backgroundColor: dadosCategoria.cor }}
                                >
                                  <span className="text-sm">{dadosCategoria.icone}</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      mov.tipo === 'entrada' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {mov.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}
                                    </span>
                                    <span className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>{mov.data} às {mov.hora}</span>
                                  </div>
                                  
                                  <h4 className={`text-sm font-bold truncate mb-1 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{mov.produto}</h4>
                                  
                                  <div className={`space-y-1 text-xs ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <p><span className="font-medium">Código:</span> #{mov.codigo}</p>
                                    <p className="flex items-center">
                                      <span className="font-medium mr-2">Categoria:</span>
                                      <span className="text-xs px-2 py-1 rounded-full"
                                            style={{ backgroundColor: dadosCategoria.cor + '20', color: dadosCategoria.cor }}>
                                        {dadosCategoria.nome}
                                      </span>
                                    </p>
                                    <p><span className="font-medium">Quantidade:</span> {mov.quantidade} unidades</p>
                                    <p><span className="font-medium">Valor unitário:</span> R$ {mov.valorUnitario.toFixed(2)}</p>
                                    <p><span className="font-medium">Valor total:</span> R$ {mov.valorTotal.toFixed(2)}</p>
                                    {mov.observacao && (
                                      <p><span className="font-medium">Obs:</span> {mov.observacao}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ação Mobile */}
                              <div className="ml-4">
                                <LoadingButton
                                  onClick={() => excluirMovimentacao(mov.id)}
                                  isLoading={loading}
                                  variant="danger"
                                  size="sm"
                                  className="text-xs px-2 py-1"
                                >
                                  🗑️
                                </LoadingButton>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Versão Desktop - Tabela (ATUALIZADA COM CATEGORIAS) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className={modoNoturno ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setItensSelecionados(movimentacoesFiltradas.map(m => m.id))
                                } else {
                                  setItensSelecionados([])
                                }
                              }}
                              checked={itensSelecionados.length === movimentacoesFiltradas.length}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Data/Hora
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Produto
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Categoria
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Tipo
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Quantidade
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Valores
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Observação
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${modoNoturno ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {movimentacoesFiltradas.map((mov) => {
                          const produto = produtos?.find(p => p.id === mov.produtoId)
                          const dadosCategoria = produto ? obterDadosCategoria(produto) : { nome: 'N/A', icone: '📦', cor: '#6B7280' }
                          
                          return (
                            <tr key={mov.id} className={`hover:${modoNoturno ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={itensSelecionados.includes(mov.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setItensSelecionados([...itensSelecionados, mov.id])
                                    } else {
                                      setItensSelecionados(itensSelecionados.filter(id => id !== mov.id))
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div>{mov.data}</div>
                                <div className={modoNoturno ? 'text-gray-400' : 'text-gray-500'}>{mov.hora}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{mov.produto}</div>
                                <div className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>#{mov.codigo}</div>
                              </td>
                              {/* 🆕 COLUNA DA CATEGORIA */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                                    style={{ backgroundColor: dadosCategoria.cor }}
                                  >
                                    <span className="text-sm">{dadosCategoria.icone}</span>
                                  </div>
                                  <div className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                    {dadosCategoria.nome}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  mov.tipo === 'entrada' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {mov.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}
                                </span>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                                {mov.quantidade} unidades
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div>Unit: R$ {mov.valorUnitario.toFixed(2)}</div>
                                <div className="font-medium">Total: R$ {mov.valorTotal.toFixed(2)}</div>
                              </td>
                              <td className={`px-6 py-4 text-sm max-w-xs truncate ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                                {mov.observacao || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <LoadingButton
                                  onClick={() => excluirMovimentacao(mov.id)}
                                  isLoading={loading}
                                  variant="danger"
                                  size="sm"
                                >
                                  🗑️
                                </LoadingButton>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Estatísticas das Movimentações (MANTIDAS ORIGINAIS) */}
          {!isLoadingData && movimentacoes && movimentacoes.length > 0 && (
            <div className={`mt-8 rounded-xl p-6 border transition-colors duration-300 ${
              modoNoturno 
                ? 'bg-gradient-to-r from-blue-900 to-green-900 border-blue-700' 
                : 'bg-gradient-to-r from-blue-50 to-green-50 border-blue-200'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>📊 Resumo das Movimentações</h3>
              
              {/* Cards de estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={`text-center p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="text-2xl font-bold text-green-600">
                    {movimentacoes.filter(m => m.tipo === 'entrada').length}
                  </div>
                  <div className="text-green-600 text-sm font-medium">📥 Entradas</div>
                </div>
                
                <div className={`text-center p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="text-2xl font-bold text-red-600">
                    {movimentacoes.filter(m => m.tipo === 'saida').length}
                  </div>
                  <div className="text-red-600 text-sm font-medium">📤 Saídas</div>
                </div>
                
                <div className={`text-center p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="text-xl font-bold text-blue-600">
                    R$ {movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0).toFixed(2)}
                  </div>
                  <div className="text-blue-600 text-sm font-medium">💰 Valor Entradas</div>
                </div>
                
                <div className={`text-center p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="text-xl font-bold text-purple-600">
                    R$ {movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0).toFixed(2)}
                  </div>
                  <div className="text-purple-600 text-sm font-medium">💸 Valor Saídas</div>
                </div>
              </div>

              {/* Informações adicionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg shadow ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <h4 className={`font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>📈 Produto Mais Movimentado</h4>
                  {(() => {
                    const produtosMais = movimentacoes.reduce((acc, mov) => {
                      acc[mov.produto] = (acc[mov.produto] || 0) + mov.quantidade
                      return acc
                    }, {} as Record<string, number>)
                    
                    const maisMovimentado = Object.entries(produtosMais)
                      .sort(([,a], [,b]) => b - a)[0]
                    
                    return maisMovimentado ? (
                      <div>
                        <div className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{maisMovimentado[0]}</div>
                        <div className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>{maisMovimentado[1]} unidades movimentadas</div>
                      </div>
                    ) : (
                      <div className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>Nenhum dado disponível</div>
                    )
                  })()}
                </div>

                <div className={`p-4 rounded-lg shadow ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <h4 className={`font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>📅 Última Movimentação</h4>
                  {(() => {
                    const ultimaMovimentacao = movimentacoes
                      .sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime())[0]
                    
                    return ultimaMovimentacao ? (
                      <div>
                        <div className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                          {ultimaMovimentacao.produto}
                        </div>
                        <div className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                          {ultimaMovimentacao.data} às {ultimaMovimentacao.hora}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          ultimaMovimentacao.tipo === 'entrada' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {ultimaMovimentacao.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}
                        </span>
                      </div>
                    ) : (
                      <div className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>Nenhuma movimentação encontrada</div>
                    )
                  })()}
                </div>
              </div>

              {/* Saldo atual */}
              <div className="mt-4">
                <div className={`p-4 rounded-lg border-2 text-center ${
                  (() => {
                    const saldo = movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0) -
                                  movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0)
                    
                    return saldo >= 0 
                      ? modoNoturno 
                        ? 'bg-green-900 border-green-600' 
                        : 'bg-green-100 border-green-400'
                      : modoNoturno 
                        ? 'bg-red-900 border-red-600' 
                        : 'bg-red-100 border-red-400'
                  })()
                }`}>
                  <h4 className={`font-bold text-lg mb-1 ${
                    (() => {
                      const saldo = movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0) -
                                    movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0)
                      
                      return saldo >= 0 
                        ? modoNoturno ? 'text-green-200' : 'text-green-800'
                        : modoNoturno ? 'text-red-200' : 'text-red-800'
                    })()
                  }`}>
                    💼 Saldo em Movimentações
                  </h4>
                  <div className={`text-2xl font-bold ${
                    (() => {
                      const saldo = movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0) -
                                    movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0)
                      
                      return saldo >= 0 
                        ? modoNoturno ? 'text-green-200' : 'text-green-800'
                        : modoNoturno ? 'text-red-200' : 'text-red-800'
                    })()
                  }`}>
                    {(() => {
                      const saldo = movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0) -
                                    movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0)
                      
                      return saldo >= 0 ? `+R$ ${saldo.toFixed(2)}` : `-R$ ${Math.abs(saldo).toFixed(2)}`
                    })()}
                  </div>
                  <div className={`text-sm mt-1 ${
                    (() => {
                      const saldo = movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0) -
                                    movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0)
                      
                      return saldo >= 0 
                        ? modoNoturno ? 'text-green-300' : 'text-green-700'
                        : modoNoturno ? 'text-red-300' : 'text-red-700'
                    })()
                  }`}>
                    {(() => {
                      const saldo = movimentacoes.filter(m => m.tipo === 'entrada').reduce((total, m) => total + m.valorTotal, 0) -
                                    movimentacoes.filter(m => m.tipo === 'saida').reduce((total, m) => total + m.valorTotal, 0)
                      
                      return saldo >= 0 ? '🟢 Saldo positivo' : '🔴 Saldo negativo'
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 INFORMAÇÕES ATUALIZADAS */}
          {!isLoadingData && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📋</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>
                    Sistema de Movimentações com Categorias Visuais
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-green-300' : 'text-green-700'}`}>
                    <p>• <strong>📂 Filtros por categoria:</strong> Análise segmentada de movimentações</p>
                    <p>• <strong>🎨 Visual categorizado:</strong> Ícones e cores para fácil identificação</p>
                    <p>• <strong>🔍 Busca inteligente:</strong> Produto selector com categorias visuais</p>
                    <p>• <strong>📊 Estatísticas por categoria:</strong> Top categorias movimentadas</p>
                    <p>• <strong>📥 Exportação melhorada:</strong> CSV com dados de categoria</p>
                    <p>• <strong>🔄 Controle automático:</strong> Atualização de estoque em tempo real</p>
                    <p>• <strong>💰 Valores automáticos:</strong> Entrada=compra, Saída=venda</p>
                    <p>• <strong>⌨️ Atalhos produtivos:</strong> Ctrl+N=Nova | Ctrl+F=Buscar</p>
                    <p>• <strong>📋 Seleção múltipla:</strong> Excluir várias movimentações</p>
                    <p>• <strong>🔔 Alertas inteligentes:</strong> Validação de estoque e produto</p>
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