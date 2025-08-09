// src/app/categorias/page.tsx
'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFirestore } from '@/hooks/useFirestore'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Categoria {
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
  categoriaId?: string
  codigoBarras?: string
  estoqueMinimo: number
  valorCompra: number
  valorVenda: number
  estoque: number
  ativo: boolean
  dataCadastro: string
  userId: string
}

export default function Categorias() {
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

  // Hooks do Firestore
  const { 
    data: categorias, 
    loading: loadingCategorias,
    addDocument: addCategoria,
    updateDocument: updateCategoria,
    deleteDocument: deleteCategoria
  } = useFirestore<Categoria>('categorias')

  const { 
    data: produtos 
  } = useFirestore<Produto>('produtos')

  // Estados
  const [buscarCategoria, setBuscarCategoria] = useState('')
  const [mostrarApenas, setMostrarApenas] = useState<'todos' | 'ativas' | 'inativas'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [loading, setLoading] = useState(false)
  const [modoNoturno, setModoNoturno] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 12

  // Estados do formulário
  const [dadosCategoria, setDadosCategoria] = useState<Omit<Categoria, 'id' | 'dataCadastro' | 'userId'>>({
    nome: '',
    descricao: '',
    cor: '#3B82F6',
    icone: '📦',
    categoriaPai: '',
    ativo: true
  })

  // Ícones disponíveis
  const iconesDisponiveis = [
    '📦', '🍔', '👕', '📱', '💊', '🧴', '🎮', '📚', '⚽', '🎵',
    '🏠', '🚗', '✂️', '🎨', '🔧', '💍', '👶', '🐕', '🌱', '☕',
    '🍕', '🍰', '👟', '💻', '📷', '🎬', '🏃‍♂️', '🍷', '🧸', '💄'
  ]

  // Cores disponíveis
  const coresDisponiveis = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]

  // Filtrar categorias
  const categoriasFiltradas = useMemo(() => {
    if (!categorias) return []

    const resultado = categorias.filter(categoria => {
      const matchBusca = categoria.nome.toLowerCase().includes(buscarCategoria.toLowerCase()) ||
                        categoria.descricao.toLowerCase().includes(buscarCategoria.toLowerCase())

      const matchStatus = mostrarApenas === 'todos' ||
                         (mostrarApenas === 'ativas' && categoria.ativo) ||
                         (mostrarApenas === 'inativas' && !categoria.ativo)

      return matchBusca && matchStatus
    })

    return resultado.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categorias, buscarCategoria, mostrarApenas])

  // Paginação
  const totalPaginas = Math.ceil(categoriasFiltradas.length / itensPorPagina)
  const categoriasExibidas = categoriasFiltradas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  )

  // Obter categorias pai (sem pai)
  const categoriasPai = useMemo(() => {
    return categorias?.filter(cat => !cat.categoriaPai && cat.ativo) || []
  }, [categorias])

  // Obter subcategorias
  const obterSubcategorias = useCallback((categoriaPaiId: string) => {
    return categorias?.filter(cat => cat.categoriaPai === categoriaPaiId && cat.ativo) || []
  }, [categorias])

  // Contar produtos por categoria
  const contarProdutos = useCallback((categoriaId: string) => {
    return produtos?.filter(produto => produto.categoriaId === categoriaId && produto.ativo).length || 0
  }, [produtos])

  // Funções para modal
  const abrirModal = useCallback((categoria?: Categoria) => {
    if (categoria) {
      setCategoriaEditando(categoria)
      setDadosCategoria({
        nome: categoria.nome,
        descricao: categoria.descricao,
        cor: categoria.cor,
        icone: categoria.icone,
        categoriaPai: categoria.categoriaPai || '',
        ativo: categoria.ativo
      })
    } else {
      setCategoriaEditando(null)
      setDadosCategoria({
        nome: '',
        descricao: '',
        cor: '#3B82F6',
        icone: '📦',
        categoriaPai: '',
        ativo: true
      })
    }
    setModalAberto(true)
  }, [])

  const fecharModal = useCallback(() => {
    setModalAberto(false)
    setCategoriaEditando(null)
    setDadosCategoria({
      nome: '',
      descricao: '',
      cor: '#3B82F6',
      icone: '📦',
      categoriaPai: '',
      ativo: true
    })
  }, [])

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        abrirModal()
      }
      if (e.key === 'Escape' && modalAberto) {
        e.preventDefault()
        fecharModal()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [modalAberto, abrirModal, fecharModal])

  // Salvar categoria
  const salvarCategoria = async () => {
    if (!user) {
      toast.error('Erro de autenticação', 'Usuário não encontrado!')
      return
    }

    if (!dadosCategoria.nome.trim()) {
      toast.warning('Campo obrigatório', 'Nome da categoria é obrigatório!')
      return
    }

    // Verificar duplicação
    const categoriaExistente = categorias?.find(cat => 
      cat.nome.toLowerCase() === dadosCategoria.nome.toLowerCase() && 
      cat.id !== categoriaEditando?.id
    )

    if (categoriaExistente) {
      toast.error('Categoria já existe', 'Já existe uma categoria com este nome!')
      return
    }

    setLoading(true)
    try {
      if (categoriaEditando) {
        // Editar categoria existente
        await updateCategoria(categoriaEditando.id, {
          ...categoriaEditando,
          ...dadosCategoria
        })
        toast.success('Categoria atualizada!', `${dadosCategoria.nome} foi atualizada com sucesso`)
      } else {
        // Criar nova categoria
        const novaCategoria: Omit<Categoria, 'id'> = {
          ...dadosCategoria,
          dataCadastro: new Date().toISOString(),
          userId: user.uid
        }
        await addCategoria(novaCategoria)
        toast.success('Categoria criada!', `${dadosCategoria.nome} foi criada com sucesso`)
      }

      fecharModal()
    } catch (error) {
      toast.error('Erro ao salvar', 'Não foi possível salvar a categoria')
    } finally {
      setLoading(false)
    }
  }

  // Alternar status da categoria
  const alternarStatusCategoria = async (categoria: Categoria) => {
    if (!user) return

    try {
      await updateCategoria(categoria.id, {
        ...categoria,
        ativo: !categoria.ativo
      })
      toast.success(
        categoria.ativo ? 'Categoria inativada!' : 'Categoria ativada!',
        `${categoria.nome} foi ${categoria.ativo ? 'inativada' : 'ativada'} com sucesso`
      )
    } catch (error) {
      toast.error('Erro ao alterar status', 'Não foi possível alterar o status da categoria')
    }
  }

  // Excluir categoria
  const excluirCategoria = async (categoria: Categoria) => {
    const produtosDaCategoria = contarProdutos(categoria.id)
    const subcategorias = obterSubcategorias(categoria.id)

    if (produtosDaCategoria > 0) {
      toast.error('Categoria em uso', `Não é possível excluir. ${produtosDaCategoria} produtos estão nesta categoria.`)
      return
    }

    if (subcategorias.length > 0) {
      toast.error('Categoria possui subcategorias', `Não é possível excluir. ${subcategorias.length} subcategorias dependem desta categoria.`)
      return
    }

    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoria.nome}"?`)) {
      return
    }

    try {
      await deleteCategoria(categoria.id)
      toast.success('Categoria excluída!', `${categoria.nome} foi excluída com sucesso`)
    } catch (_error) {
      toast.error('Erro ao excluir', 'Não foi possível excluir a categoria')
    }
  }

  // Exportar categorias
  const exportarCategorias = () => {
    if (!categoriasFiltradas.length) {
      toast.warning('Nenhuma categoria', 'Não há categorias para exportar')
      return
    }

    const csvContent = [
      ['Nome', 'Descrição', 'Categoria Pai', 'Produtos', 'Status', 'Data Cadastro'].join(','),
      ...categoriasFiltradas.map(categoria => {
        const categoriaPaiNome = categoria.categoriaPai 
          ? categorias?.find(c => c.id === categoria.categoriaPai)?.nome || 'N/A'
          : 'Categoria Principal'
        
        return [
          categoria.nome,
          categoria.descricao,
          categoriaPaiNome,
          contarProdutos(categoria.id),
          categoria.ativo ? 'Ativa' : 'Inativa',
          new Date(categoria.dataCadastro).toLocaleDateString('pt-BR')
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `categorias_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('📊 Relatório exportado!', 'Arquivo CSV foi baixado com sucesso')
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="Categorias de Produtos" 
          currentPage="/categorias" 
          userEmail={user?.email || undefined}
        />

        {/* 🆕 MARGEM DINÂMICA BASEADA NO ESTADO DA SIDEBAR (CORRIGIDO - IGUAL DASHBOARD) */}
        <main className={`max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>
          
          {/* Loading inicial */}
          {loadingCategorias && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-blue-600 text-2xl">📂</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando categorias...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Sincronizando dados do Firebase</p>
              </div>
            </div>
          )}

          {!loadingCategorias && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl p-6 mb-6 text-white animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">📂 Categorias de Produtos</h1>
                    <p className="text-blue-100 mt-2 text-base sm:text-lg">
                      Organize seus produtos de forma inteligente e hierárquica
                    </p>
                    <div className="mt-2 text-sm text-blue-200">
                      Atalhos: Ctrl+N = Nova categoria | ESC = Fechar modal
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <LoadingButton
                      onClick={() => abrirModal()}
                      variant="success"
                      size="md"
                      className="w-full sm:w-auto bg-gray bg-opacity-20 hover:bg-opacity-30 text-white border-white"
                    >
                      ➕ Nova Categoria
                    </LoadingButton>
                    
                    <LoadingButton
                      onClick={() => setModoNoturno(!modoNoturno)}
                      variant="secondary"
                      size="md"
                      className="w-full sm:w-auto bg-gray bg-opacity-20 hover:bg-opacity-30 text-white border-white"
                    >
                      {modoNoturno ? '☀️ Modo Dia' : '🌙 Modo Noite'}
                    </LoadingButton>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xl">📂</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
                      <p className={`text-2xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                        {categorias?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-xl">✅</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>Ativas</p>
                      <p className={`text-2xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                        {categorias?.filter(c => c.ativo).length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 text-xl">🌳</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>Principais</p>
                      <p className={`text-2xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                        {categoriasPai.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 text-xl">📦</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>Com Produtos</p>
                      <p className={`text-2xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                        {categorias?.filter(c => contarProdutos(c.id) > 0).length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros e busca */}
              <div className={`rounded-xl shadow-lg p-6 mb-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1">
                    <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      🔍 Buscar Categoria
                    </label>
                    <input
                      type="text"
                      value={buscarCategoria}
                      onChange={(e) => setBuscarCategoria(e.target.value)}
                      placeholder="Digite o nome ou descrição da categoria..."
                      className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div className="lg:w-48">
                    <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      📊 Filtro
                    </label>
                    <select
                      value={mostrarApenas}
                      onChange={(e) => setMostrarApenas(e.target.value as 'todos' | 'ativas' | 'inativas')}
                      className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      <option value="todos">Todas as categorias</option>
                      <option value="ativas">Apenas ativas</option>
                      <option value="inativas">Apenas inativas</option>
                    </select>
                  </div>

                  <div className="lg:w-auto">
                    <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      📤 Exportar
                    </label>
                    <LoadingButton
                      onClick={exportarCategorias}
                      variant="secondary"
                      size="md"
                      disabled={!categoriasFiltradas.length}
                      className="w-full lg:w-auto"
                    >
                      📊 CSV
                    </LoadingButton>
                  </div>
                </div>
              </div>

              {/* Lista de categorias */}
              {categoriasFiltradas.length === 0 ? (
                <div className={`text-center py-12 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="text-6xl mb-4">📂</div>
                  <h3 className={`text-lg font-medium mb-2 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                    {buscarCategoria || mostrarApenas !== 'todos' ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
                  </h3>
                  <p className={`mb-4 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                    {buscarCategoria || mostrarApenas !== 'todos' 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Crie sua primeira categoria para organizar os produtos'
                    }
                  </p>
                  {!buscarCategoria && mostrarApenas === 'todos' && (
                    <LoadingButton
                      onClick={() => abrirModal()}
                      variant="primary"
                      size="md"
                    >
                      ➕ Criar Primeira Categoria
                    </LoadingButton>
                  )}
                </div>
              ) : (
                <>
                  {/* Grid de categorias */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                    {categoriasExibidas.map((categoria) => (
                      <div
                        key={categoria.id}
                        className={`rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                          modoNoturno ? 'bg-gray-800' : 'bg-white'
                        } ${!categoria.ativo ? 'opacity-60' : ''}`}
                      >
                        {/* Header da categoria */}
                        <div
                          className="p-4 text-white"
                          style={{ backgroundColor: categoria.cor }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{categoria.icone}</span>
                              <div>
                                <h3 className="font-bold text-lg truncate">{categoria.nome}</h3>
                                <p className="text-sm opacity-90 truncate">{categoria.descricao}</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              categoria.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {categoria.ativo ? '✅' : '❌'}
                            </span>
                          </div>
                        </div>

                        {/* Conteúdo da categoria */}
                        <div className="p-4">
                          <div className="space-y-2 mb-4">
                            {categoria.categoriaPai && (
                              <div className="flex items-center text-sm">
                                <span className={modoNoturno ? 'text-gray-400' : 'text-gray-600'}>Categoria pai:</span>
                                <span className={`ml-2 font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                  {categorias?.find(c => c.id === categoria.categoriaPai)?.nome || 'N/A'}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                                📦 Produtos:
                              </span>
                              <span className={`font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {contarProdutos(categoria.id)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                                🌿 Subcategorias:
                              </span>
                              <span className={`font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {obterSubcategorias(categoria.id).length}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                                📅 Criada em:
                              </span>
                              <span className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {new Date(categoria.dataCadastro).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex space-x-2">
                            <LoadingButton
                              onClick={() => abrirModal(categoria)}
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                            >
                              ✏️ Editar
                            </LoadingButton>
                            
                            <LoadingButton
                              onClick={() => alternarStatusCategoria(categoria)}
                              variant={categoria.ativo ? "warning" : "success"}
                              size="sm"
                              className="flex-1"
                            >
                              {categoria.ativo ? '⏸️ Inativar' : '▶️ Ativar'}
                            </LoadingButton>
                            
                            <LoadingButton
                              onClick={() => excluirCategoria(categoria)}
                              variant="danger"
                              size="sm"
                              disabled={contarProdutos(categoria.id) > 0 || obterSubcategorias(categoria.id).length > 0}
                              aria-label={
                                contarProdutos(categoria.id) > 0 
                                  ? 'Não é possível excluir categoria com produtos'
                                  : obterSubcategorias(categoria.id).length > 0
                                    ? 'Não é possível excluir categoria com subcategorias'
                                    : 'Excluir categoria'
                              }
                            >
                              🗑️
                            </LoadingButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  {totalPaginas > 1 && (
                    <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                        <div className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          Mostrando {categoriasExibidas.length} de {categoriasFiltradas.length} categorias
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <LoadingButton
                            onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                            variant="secondary"
                            size="sm"
                            disabled={paginaAtual === 1}
                          >
                            ← Anterior
                          </LoadingButton>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, index) => {
                              const pagina = index + 1
                              return (
                                <button
                                  key={pagina}
                                  onClick={() => setPaginaAtual(pagina)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                    paginaAtual === pagina
                                      ? 'bg-blue-600 text-white'
                                      : modoNoturno
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {pagina}
                                </button>
                              )
                            })}
                          </div>
                          
                          <LoadingButton
                            onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                            variant="secondary"
                            size="sm"
                            disabled={paginaAtual === totalPaginas}
                          >
                            Próxima →
                          </LoadingButton>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Modal de categoria */}
          {modalAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl transition-colors duration-300 ${
                modoNoturno ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className={`sticky top-0 px-6 py-4 border-b ${
                  modoNoturno ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                      {categoriaEditando ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
                    </h2>
                    <button
                      onClick={fecharModal}
                      className={`text-gray-400 hover:text-gray-600 transition-colors duration-200 ${
                        modoNoturno ? 'hover:text-gray-300' : 'hover:text-gray-600'
                      }`}
                    >
                      <span className="text-2xl">×</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna 1: Dados básicos */}
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          📝 Nome da Categoria *
                        </label>
                        <input
                          type="text"
                          value={dadosCategoria.nome}
                          onChange={(e) => setDadosCategoria(prev => ({ ...prev, nome: e.target.value }))}
                          className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                          }`}
                          placeholder="Ex: Eletrônicos"
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          📝 Descrição
                        </label>
                        <textarea
                          value={dadosCategoria.descricao}
                          onChange={(e) => setDadosCategoria(prev => ({ ...prev, descricao: e.target.value }))}
                          rows={3}
                          className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                          }`}
                          placeholder="Descreva a categoria..."
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          🌳 Categoria Pai (Opcional)
                        </label>
                        <select
                          value={dadosCategoria.categoriaPai}
                          onChange={(e) => setDadosCategoria(prev => ({ ...prev, categoriaPai: e.target.value }))}
                          className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-white' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                        >
                          <option value="">Categoria Principal</option>
                          {categoriasPai
                            .filter(cat => cat.id !== categoriaEditando?.id)
                            .map(categoria => (
                              <option key={categoria.id} value={categoria.id}>
                                {categoria.icone} {categoria.nome}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="ativo"
                          checked={dadosCategoria.ativo}
                          onChange={(e) => setDadosCategoria(prev => ({ ...prev, ativo: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="ativo" className={`ml-2 text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          Categoria ativa
                        </label>
                      </div>
                    </div>

                    {/* Coluna 2: Visual */}
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          🎨 Cor da Categoria
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {coresDisponiveis.map(cor => (
                            <button
                              key={cor}
                              onClick={() => setDadosCategoria(prev => ({ ...prev, cor }))}
                              className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 ${
                                dadosCategoria.cor === cor 
                                  ? 'border-gray-900 scale-110' 
                                  : 'border-gray-300 hover:scale-105'
                              }`}
                              style={{ backgroundColor: cor }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          😀 Ícone da Categoria
                        </label>
                        <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                          {iconesDisponiveis.map(icone => (
                            <button
                              key={icone}
                              onClick={() => setDadosCategoria(prev => ({ ...prev, icone }))}
                              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all duration-200 ${
                                dadosCategoria.icone === icone 
                                  ? 'border-blue-500 bg-blue-50 scale-110' 
                                  : modoNoturno
                                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                                    : 'border-gray-300 bg-white hover:bg-gray-50'
                              }`}
                            >
                              {icone}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preview */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          👁️ Preview
                        </label>
                        <div
                          className="p-4 rounded-lg text-white"
                          style={{ backgroundColor: dadosCategoria.cor }}
                        >
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">{dadosCategoria.icone}</span>
                            <div>
                              <h3 className="font-bold text-lg">
                                {dadosCategoria.nome || 'Nome da categoria'}
                              </h3>
                              <p className="text-sm opacity-90">
                                {dadosCategoria.descricao || 'Descrição da categoria'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações do modal */}
                  <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <LoadingButton
                      onClick={salvarCategoria}
                      isLoading={loading}
                      loadingText="Salvando..."
                      variant="primary"
                      size="md"
                      className="flex-1"
                    >
                      💾 {categoriaEditando ? 'Atualizar Categoria' : 'Criar Categoria'}
                    </LoadingButton>
                    <LoadingButton
                      onClick={fecharModal}
                      variant="secondary"
                      size="md"
                      className="flex-1"
                    >
                      ❌ Cancelar
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informações adicionais */}
          {!loadingCategorias && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📂</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                    Sistema Avançado de Categorias Hierárquicas
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-blue-300' : 'text-blue-700'}`}>
                    <p>• <strong>🌳 Hierarquia:</strong> Crie categorias pai e subcategorias organizadas</p>
                    <p>• <strong>🎨 Visual personalizado:</strong> Cores e ícones únicos para cada categoria</p>
                    <p>• <strong>📊 Estatísticas:</strong> Contagem de produtos e subcategorias</p>
                    <p>• <strong>🔍 Busca inteligente:</strong> Encontre categorias por nome ou descrição</p>
                    <p>• <strong>📱 Interface responsiva:</strong> Perfeita em desktop e mobile</p>
                    <p>• <strong>📋 Exportação:</strong> Gere relatórios completos em CSV</p>
                    <p>• <strong>⚡ Atalhos:</strong> Ctrl+N para nova categoria, ESC para fechar</p>
                    <p>• <strong>🔒 Proteção:</strong> Não permite excluir categorias com produtos</p>
                    <p>• <strong>🔄 Status dinâmico:</strong> Ative/inative categorias conforme necessário</p>
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