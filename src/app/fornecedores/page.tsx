// src/app/fornecedores/page.tsx
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFirestore } from '@/hooks/useFirestore'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Fornecedor {
  id?: string
  nomeEmpresa: string
  cnpj: string
  inscricaoEstadual: string
  email: string
  telefone: string
  site: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  // Dados comerciais
  condicoesPagamento: string
  prazoEntrega: number
  valorMinimoCompra: number
  // Contato responsável
  nomeContato: string
  emailContato: string
  telefoneContato: string
  cargoContato: string
  // Outros
  observacoes: string
  ativo: boolean
  dataCadastro: string
  userId: string
}

export default function Fornecedores() {
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
  
  // Hooks do Firestore
  const { 
    data: fornecedores, 
    loading: loadingFornecedores,
    addDocument: addFornecedor,
    updateDocument: updateFornecedor,
    deleteDocument: deleteFornecedor
  } = useFirestore<Fornecedor>('fornecedores')

  // Estados
  const [loading, setLoading] = useState(false)
  const [modoNoturno, setModoNoturno] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(10)

  // Estados do formulário
  const [dadosFornecedor, setDadosFornecedor] = useState<Fornecedor>({
    nomeEmpresa: '',
    cnpj: '',
    inscricaoEstadual: '',
    email: '',
    telefone: '',
    site: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    condicoesPagamento: '',
    prazoEntrega: 0,
    valorMinimoCompra: 0,
    nomeContato: '',
    emailContato: '',
    telefoneContato: '',
    cargoContato: '',
    observacoes: '',
    ativo: true,
    dataCadastro: new Date().toLocaleDateString('pt-BR'),
    userId: user?.uid || ''
  })

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        abrirModalNovoFornecedor()
      }
      if (e.key === 'Escape' && modalAberto) {
        fecharModal()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [modalAberto])

  // Função para validar CNPJ (simplificada)
  const validarCNPJ = useCallback((cnpj: string) => {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '')
    return cnpjLimpo.length === 14 && cnpjLimpo !== '00000000000000'
  }, [])

  // Função para formatar CNPJ
  const formatarCnpj = useCallback((valor: string) => {
    const apenasNumeros = valor.replace(/[^\d]/g, '')
    return apenasNumeros
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
  }, [])

  // Filtrar e paginar fornecedores
  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedores) return []

    return fornecedores.filter(fornecedor => {
      const matchBusca = !busca || 
        fornecedor.nomeEmpresa.toLowerCase().includes(busca.toLowerCase()) ||
        fornecedor.email.toLowerCase().includes(busca.toLowerCase()) ||
        fornecedor.telefone.includes(busca) ||
        fornecedor.cnpj.includes(busca) ||
        fornecedor.nomeContato.toLowerCase().includes(busca.toLowerCase())

      const matchStatus = filtroStatus === 'todos' || 
        (filtroStatus === 'ativo' && fornecedor.ativo) ||
        (filtroStatus === 'inativo' && !fornecedor.ativo)

      return matchBusca && matchStatus
    })
  }, [fornecedores, busca, filtroStatus])

  const fornecedoresPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return fornecedoresFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [fornecedoresFiltrados, paginaAtual, itensPorPagina])

  const totalPaginas = Math.ceil(fornecedoresFiltrados.length / itensPorPagina)

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!fornecedores) return { total: 0, ativos: 0, comSite: 0, mediaEntrega: 0 }

    const total = fornecedores.length
    const ativos = fornecedores.filter(f => f.ativo).length
    const comSite = fornecedores.filter(f => f.site.trim() !== '').length
    const mediaEntrega = fornecedores.length > 0 
      ? fornecedores.reduce((acc, f) => acc + f.prazoEntrega, 0) / fornecedores.length 
      : 0

    return { total, ativos, comSite, mediaEntrega }
  }, [fornecedores])

  // Abrir modal para novo fornecedor
  const abrirModalNovoFornecedor = useCallback(() => {
    setFornecedorEditando(null)
    setDadosFornecedor({
      nomeEmpresa: '',
      cnpj: '',
      inscricaoEstadual: '',
      email: '',
      telefone: '',
      site: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      condicoesPagamento: '',
      prazoEntrega: 0,
      valorMinimoCompra: 0,
      nomeContato: '',
      emailContato: '',
      telefoneContato: '',
      cargoContato: '',
      observacoes: '',
      ativo: true,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      userId: user?.uid || ''
    })
    setModalAberto(true)
  }, [user])

  // Abrir modal para editar fornecedor
  const abrirModalEditarFornecedor = useCallback((fornecedor: Fornecedor) => {
    setFornecedorEditando(fornecedor)
    setDadosFornecedor(fornecedor)
    setModalAberto(true)
  }, [])

  // Fechar modal
  const fecharModal = useCallback(() => {
    setModalAberto(false)
    setFornecedorEditando(null)
  }, [])

  // Salvar fornecedor
  const salvarFornecedor = useCallback(async () => {
    if (!user) return

    // Validações
    if (!dadosFornecedor.nomeEmpresa.trim()) {
      toast.warning('Campo obrigatório', 'Nome da empresa é obrigatório')
      return
    }

    if (!dadosFornecedor.cnpj.trim()) {
      toast.warning('Campo obrigatório', 'CNPJ é obrigatório')
      return
    }

    // Validar CNPJ
    if (!validarCNPJ(dadosFornecedor.cnpj)) {
      toast.error('CNPJ inválido', 'Digite um CNPJ válido')
      return
    }

    // Verificar se CNPJ já existe (exceto para o fornecedor sendo editado)
    const cnpjExistente = fornecedores?.find(f => 
      f.cnpj === dadosFornecedor.cnpj && 
      f.id !== fornecedorEditando?.id
    )

    if (cnpjExistente) {
      toast.error('CNPJ já cadastrado', 'Este CNPJ já está em uso por outro fornecedor')
      return
    }

    setLoading(true)
    try {
      const fornecedorCompleto = { ...dadosFornecedor, userId: user.uid }

      if (fornecedorEditando) {
        await updateFornecedor(fornecedorEditando.id!, fornecedorCompleto)
        toast.success('Fornecedor atualizado!', 'Dados do fornecedor foram atualizados com sucesso')
      } else {
        await addFornecedor(fornecedorCompleto)
        toast.success('Fornecedor cadastrado!', 'Novo fornecedor foi adicionado com sucesso')
      }

      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
      toast.error('Erro ao salvar', 'Não foi possível salvar os dados do fornecedor')
    } finally {
      setLoading(false)
    }
  }, [dadosFornecedor, user, fornecedorEditando, fornecedores, updateFornecedor, addFornecedor, validarCNPJ, toast, fecharModal])

  // Alternar status do fornecedor
  const alternarStatusFornecedor = useCallback(async (fornecedor: Fornecedor) => {
    if (!user) return

    setLoading(true)
    try {
      const fornecedorAtualizado = { ...fornecedor, ativo: !fornecedor.ativo }
      await updateFornecedor(fornecedor.id!, fornecedorAtualizado)
      
      toast.success(
        fornecedorAtualizado.ativo ? 'Fornecedor ativado!' : 'Fornecedor inativado!',
        `${fornecedor.nomeEmpresa} foi ${fornecedorAtualizado.ativo ? 'ativado' : 'inativado'} com sucesso`
      )
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status', 'Não foi possível alterar o status do fornecedor')
    } finally {
      setLoading(false)
    }
  }, [user, updateFornecedor, toast])

  // Exportar fornecedores
  const exportarFornecedores = useCallback(async () => {
    if (!fornecedores) return

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      let csvContent = '\uFEFF' // BOM para UTF-8
      csvContent += `StockPro - Lista de Fornecedores\n`
      csvContent += `Data de Geração,${new Date().toLocaleString('pt-BR')}\n`
      csvContent += `Total de Fornecedores,${fornecedores.length}\n\n`
      
      csvContent += `Nome Empresa,CNPJ,Email,Telefone,Cidade,Estado,Contato Responsável,Prazo Entrega (dias),Condições Pagamento,Status,Data Cadastro\n`
      
      fornecedores.forEach(fornecedor => {
        csvContent += `${fornecedor.nomeEmpresa},${fornecedor.cnpj},${fornecedor.email},${fornecedor.telefone},${fornecedor.cidade},${fornecedor.estado},${fornecedor.nomeContato},${fornecedor.prazoEntrega},${fornecedor.condicoesPagamento},${fornecedor.ativo ? 'Ativo' : 'Inativo'},${fornecedor.dataCadastro}\n`
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fornecedores-stockpro-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Lista exportada!', 'Arquivo CSV gerado com sucesso')
    } catch (error) {
      toast.error('Erro na exportação', 'Não foi possível exportar a lista de fornecedores')
    } finally {
      setLoading(false)
    }
  }, [fornecedores, toast])

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="Gestão de Fornecedores" 
          currentPage="/fornecedores" 
          userEmail={user?.email || undefined}
        />

        {/* 🆕 MARGEM DINÂMICA CORRIGIDA - ADAPTAÇÃO COMPLETA AO ESPAÇO DISPONÍVEL */}
        <main className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed 
            ? 'lg:ml-16 lg:mr-4' 
            : 'max-w-7xl mx-auto lg:ml-64'
        }`}>
          
          {/* Loading de carregamento inicial */}
          {loadingFornecedores && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-orange-600 text-2xl">🏪</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando fornecedores...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Sincronizando base de dados</p>
              </div>
            </div>
          )}

          {/* Header principal */}
          {!loadingFornecedores && (
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                  🏪 Gestão de Fornecedores
                </h1>
                <p className={`text-sm mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ctrl+N para novo fornecedor • ESC para fechar modal
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
                  onClick={abrirModalNovoFornecedor}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  🏪 Novo Fornecedor (Ctrl+N)
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Cards de Estatísticas */}
          {!loadingFornecedores && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              
              {/* Total de Fornecedores */}
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-orange-100 text-sm">Total de Fornecedores</p>
                    <p className="text-2xl font-bold">{estatisticas.total}</p>
                    <p className="text-orange-100 text-xs">Cadastrados no sistema</p>
                  </div>
                  <div className="text-3xl ml-2">🏪</div>
                </div>
              </div>

              {/* Fornecedores Ativos */}
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-green-100 text-sm">Fornecedores Ativos</p>
                    <p className="text-2xl font-bold">{estatisticas.ativos}</p>
                    <p className="text-green-100 text-xs">{estatisticas.total > 0 ? ((estatisticas.ativos / estatisticas.total) * 100).toFixed(1) : 0}% do total</p>
                  </div>
                  <div className="text-3xl ml-2">✅</div>
                </div>
              </div>

              {/* Com Website */}
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-blue-100 text-sm">Com Website</p>
                    <p className="text-2xl font-bold">{estatisticas.comSite}</p>
                    <p className="text-blue-100 text-xs">Possuem site informado</p>
                  </div>
                  <div className="text-3xl ml-2">🌐</div>
                </div>
              </div>

              {/* Prazo Médio de Entrega */}
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-purple-100 text-sm">Prazo Médio</p>
                    <p className="text-2xl font-bold">{estatisticas.mediaEntrega.toFixed(1)}</p>
                    <p className="text-purple-100 text-xs">Dias para entrega</p>
                  </div>
                  <div className="text-3xl ml-2">🚚</div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros e Busca */}
          {!loadingFornecedores && (
            <div className={`mb-6 p-6 rounded-xl shadow-lg transition-colors duration-300 ${
              modoNoturno ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Busca */}
                <div className="lg:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                    🔍 Buscar Fornecedor
                  </label>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome da empresa, CNPJ, email, telefone ou contato..."
                    className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Filtro por Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                    📊 Status
                  </label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as any)}
                    className={`w-full border rounded-lg px-3 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="todos">Todos os status</option>
                    <option value="ativo">Apenas ativos</option>
                    <option value="inativo">Apenas inativos</option>
                  </select>
                </div>
              </div>

              {/* Ações */}
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  📋 Mostrando {fornecedoresFiltrados.length} de {estatisticas.total} fornecedores
                </div>
                
                <LoadingButton
                  onClick={exportarFornecedores}
                  isLoading={loading}
                  loadingText="Exportando..."
                  variant="success"
                  size="md"
                  disabled={!fornecedores || fornecedores.length === 0}
                >
                  📊 Exportar Lista
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Lista de Fornecedores */}
          {!loadingFornecedores && (
            <div className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${
              modoNoturno ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {fornecedoresPaginados.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">🏪</div>
                  <h3 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                    {busca || filtroStatus !== 'todos' 
                      ? 'Nenhum fornecedor encontrado' 
                      : 'Nenhum fornecedor cadastrado'
                    }
                  </h3>
                  <p className={`text-sm mb-6 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                    {busca || filtroStatus !== 'todos' 
                      ? 'Tente ajustar os filtros de busca' 
                      : 'Comece cadastrando seu primeiro fornecedor'
                    }
                  </p>
                  {(!busca && filtroStatus === 'todos') && (
                    <LoadingButton
                      onClick={abrirModalNovoFornecedor}
                      variant="primary"
                      size="md"
                    >
                      🏪 Cadastrar Primeiro Fornecedor
                    </LoadingButton>
                  )}
                </div>
              ) : (
                <>
                  {/* Tabela - Desktop */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead className={`${modoNoturno ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Fornecedor
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Contato
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            CNPJ
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Localização
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Entrega
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Status
                          </th>
                          <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${modoNoturno ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {fornecedoresPaginados.map((fornecedor) => (
                          <tr key={fornecedor.id} className={`hover:bg-opacity-50 transition-colors duration-200 ${
                            modoNoturno ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                          }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                  fornecedor.ativo ? 'bg-orange-500' : 'bg-gray-400'
                                }`}>
                                  🏪
                                </div>
                                <div className="ml-4">
                                  <div className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                    {fornecedor.nomeEmpresa}
                                  </div>
                                  <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {fornecedor.site ? (
                                      <a 
                                        href={fornecedor.site.startsWith('http') ? fornecedor.site : `https://${fornecedor.site}`}
                                        
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        🌐 Website
                                      </a>
                                    ) : (
                                      'Sem website'
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {fornecedor.email}
                              </div>
                              <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                {fornecedor.telefone}
                              </div>
                              {fornecedor.nomeContato && (
                                <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                  👤 {fornecedor.nomeContato}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-mono ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {fornecedor.cnpj}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {fornecedor.cidade}
                              </div>
                              <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                {fornecedor.estado}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {fornecedor.prazoEntrega} dias
                              </div>
                              <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                {fornecedor.condicoesPagamento || 'Não informado'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                fornecedor.ativo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {fornecedor.ativo ? '✅ Ativo' : '❌ Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                              <button
                                onClick={() => abrirModalEditarFornecedor(fornecedor)}
                                className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                                title="Editar fornecedor"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => alternarStatusFornecedor(fornecedor)}
                                className={`transition-colors duration-200 ${
                                  fornecedor.ativo 
                                    ? 'text-red-600 hover:text-red-900' 
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                                title={fornecedor.ativo ? 'Inativar fornecedor' : 'Ativar fornecedor'}
                              >
                                {fornecedor.ativo ? '❌' : '✅'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards - Mobile */}
                  <div className="lg:hidden space-y-4 p-4">
                    {fornecedoresPaginados.map((fornecedor) => (
                      <div key={fornecedor.id} className={`p-4 rounded-lg border transition-colors duration-200 ${
                        modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                              fornecedor.ativo ? 'bg-orange-500' : 'bg-gray-400'
                            }`}>
                              🏪
                            </div>
                            <div>
                              <h3 className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {fornecedor.nomeEmpresa}
                              </h3>
                              <p className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                Prazo: {fornecedor.prazoEntrega} dias
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            fornecedor.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {fornecedor.ativo ? '✅ Ativo' : '❌ Inativo'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>CNPJ:</strong> {fornecedor.cnpj}
                          </div>
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Email:</strong> {fornecedor.email}
                          </div>
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Telefone:</strong> {fornecedor.telefone}
                          </div>
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Localização:</strong> {fornecedor.cidade}, {fornecedor.estado}
                          </div>
                          {fornecedor.nomeContato && (
                            <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                              <strong>Contato:</strong> {fornecedor.nomeContato}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={() => abrirModalEditarFornecedor(fornecedor)}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => alternarStatusFornecedor(fornecedor)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                              fornecedor.ativo 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {fornecedor.ativo ? '❌ Inativar' : '✅ Ativar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  {totalPaginas > 1 && (
                    <div className={`px-6 py-4 border-t ${modoNoturno ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          Página {paginaAtual} de {totalPaginas}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                            disabled={paginaAtual === 1}
                            className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                              paginaAtual === 1
                                ? modoNoturno ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : modoNoturno ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            ← Anterior
                          </button>
                          <button
                            onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                            disabled={paginaAtual === totalPaginas}
                            className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                              paginaAtual === totalPaginas
                                ? modoNoturno ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : modoNoturno ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            Próxima →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Modal de Fornecedor */}
          {modalAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl transition-colors duration-300 ${
                modoNoturno ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className={`sticky top-0 px-6 py-4 border-b ${
                  modoNoturno ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                      {fornecedorEditando ? '✏️ Editar Fornecedor' : '🏪 Novo Fornecedor'}
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Dados da Empresa */}
                    <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        🏢 Dados da Empresa
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Nome da Empresa *
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.nomeEmpresa}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, nomeEmpresa: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="Nome da empresa fornecedora"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            CNPJ *
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.cnpj}
                            onChange={(e) => {
                              const valorFormatado = formatarCnpj(e.target.value)
                              setDadosFornecedor(prev => ({ ...prev, cnpj: valorFormatado }))
                            }}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 font-mono ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="00.000.000/0000-00"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Inscrição Estadual
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.inscricaoEstadual}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, inscricaoEstadual: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="000.000.000.000"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Email Comercial
                          </label>
                          <input
                            type="email"
                            value={dadosFornecedor.email}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, email: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="comercial@fornecedor.com"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Telefone Comercial
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.telefone}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, telefone: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="(11) 99999-9999"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Website
                          </label>
                          <input
                            type="url"
                            value={dadosFornecedor.site}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, site: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="https://www.fornecedor.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        📍 Endereço
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Endereço Completo
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.endereco}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, endereco: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="Rua, número, bairro"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                              Cidade
                            </label>
                            <input
                              type="text"
                              value={dadosFornecedor.cidade}
                              onChange={(e) => setDadosFornecedor(prev => ({ ...prev, cidade: e.target.value }))}
                              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                                modoNoturno 
                                  ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                              }`}
                              placeholder="São Paulo"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                              Estado
                            </label>
                            <select
                              value={dadosFornecedor.estado}
                              onChange={(e) => setDadosFornecedor(prev => ({ ...prev, estado: e.target.value }))}
                              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                                modoNoturno 
                                  ? 'border-gray-600 bg-gray-600 text-white' 
                                  : 'border-gray-300 bg-white text-gray-900'
                              }`}
                            >
                              <option value="">Selecione</option>
                              <option value="SP">São Paulo</option>
                              <option value="RJ">Rio de Janeiro</option>
                              <option value="MG">Minas Gerais</option>
                              <option value="RS">Rio Grande do Sul</option>
                              <option value="PR">Paraná</option>
                              <option value="SC">Santa Catarina</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            CEP
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.cep}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, cep: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="00000-000"
                          />
                        </div>

                        {/* Dados Comerciais */}
                        <div className="pt-4 border-t border-gray-600">
                          <h4 className={`text-md font-bold mb-3 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                            💼 Dados Comerciais
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                Condições de Pagamento
                              </label>
                              <input
                                type="text"
                                value={dadosFornecedor.condicoesPagamento}
                                onChange={(e) => setDadosFornecedor(prev => ({ ...prev, condicoesPagamento: e.target.value }))}
                                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                                  modoNoturno 
                                    ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Ex: 30/60/90 dias"
                              />
                            </div>

                            <div>
                              <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                Prazo de Entrega (dias)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={dadosFornecedor.prazoEntrega}
                                onChange={(e) => setDadosFornecedor(prev => ({ ...prev, prazoEntrega: parseInt(e.target.value) || 0 }))}
                                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                                  modoNoturno 
                                    ? 'border-gray-600 bg-gray-600 text-white' 
                                    : 'border-gray-300 bg-white text-gray-900'
                                }`}
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                Valor Mínimo de Compra (R$)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={dadosFornecedor.valorMinimoCompra}
                                onChange={(e) => setDadosFornecedor(prev => ({ ...prev, valorMinimoCompra: parseFloat(e.target.value) || 0 }))}
                                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                                  modoNoturno 
                                    ? 'border-gray-600 bg-gray-600 text-white' 
                                    : 'border-gray-300 bg-white text-gray-900'
                                }`}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contato Responsável e Observações */}
                    <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        👤 Contato Responsável
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Nome do Contato
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.nomeContato}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, nomeContato: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="Nome do responsável"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Cargo/Função
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.cargoContato}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, cargoContato: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="Ex: Gerente Comercial"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Email do Contato
                          </label>
                          <input
                            type="email"
                            value={dadosFornecedor.emailContato}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, emailContato: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="contato@fornecedor.com"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Telefone do Contato
                          </label>
                          <input
                            type="text"
                            value={dadosFornecedor.telefoneContato}
                            onChange={(e) => setDadosFornecedor(prev => ({ ...prev, telefoneContato: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="(11) 99999-9999"
                          />
                        </div>

                        <div className="pt-4 border-t border-gray-600">
                          <h4 className={`text-md font-bold mb-3 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                            📝 Observações
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                Informações Adicionais
                              </label>
                              <textarea
                                value={dadosFornecedor.observacoes}
                                onChange={(e) => setDadosFornecedor(prev => ({ ...prev, observacoes: e.target.value }))}
                                rows={4}
                                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                                  modoNoturno 
                                    ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Informações adicionais sobre o fornecedor, histórico, especialidades, etc..."
                              />
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="ativo"
                                checked={dadosFornecedor.ativo}
                                onChange={(e) => setDadosFornecedor(prev => ({ ...prev, ativo: e.target.checked }))}
                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                              />
                              <label htmlFor="ativo" className={`ml-2 text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                Fornecedor ativo
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Modal */}
                  <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <LoadingButton
                      onClick={salvarFornecedor}
                      isLoading={loading}
                      loadingText="Salvando..."
                      variant="primary"
                      size="md"
                      className="flex-1"
                    >
                      💾 {fornecedorEditando ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}
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

          {/* Informações Adicionais */}
          {!loadingFornecedores && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-orange-900 border-orange-700' : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🏪</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-orange-200' : 'text-orange-800'}`}>
                    Sistema Avançado de Gestão de Fornecedores
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-orange-300' : 'text-orange-700'}`}>
                    <p>• <strong>🏢 Cadastro completo:</strong> Dados da empresa, endereço e informações comerciais</p>
                    <p>• <strong>🔍 Busca inteligente:</strong> Encontre fornecedores por nome, CNPJ, email ou contato</p>
                    <p>• <strong>📊 Estatísticas visuais:</strong> Total, ativos, com website e prazo médio de entrega</p>
                    <p>• <strong>✅ Validação automática:</strong> CNPJ verificado automaticamente</p>
                    <p>• <strong>📱 Interface responsiva:</strong> Perfeita em desktop e mobile</p>
                    <p>• <strong>📋 Exportação:</strong> Gere relatórios completos em CSV</p>
                    <p>• <strong>👤 Contato responsável:</strong> Dados completos do representante comercial</p>
                    <p>• <strong>⌨️ Atalhos produtivos:</strong> Ctrl+N para novo fornecedor, ESC para fechar</p>
                    <p>• <strong>🔒 Segurança:</strong> Dados protegidos e sincronizados na nuvem</p>
                    <p>• <strong>💼 Dados comerciais:</strong> Condições de pagamento, prazos e valores mínimos</p>
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