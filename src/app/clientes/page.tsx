// src/app/clientes/page.tsx
'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useFirestore } from '@/hooks/useFirestore'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Cliente {
  id?: string
  nome: string
  email: string
  telefone: string
  cpfCnpj: string
  tipoCliente: 'pessoa_fisica' | 'pessoa_juridica'
  endereco: string
  cidade: string
  estado: string
  cep: string
  limiteCredito: number
  observacoes: string
  ativo: boolean
  dataCadastro: string
  userId: string
}

export default function Clientes() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()
  
  // Hooks do Firestore
  const { 
    data: clientes, 
    loading: loadingClientes,
    addDocument: addCliente,
    updateDocument: updateCliente,
    deleteDocument: deleteCliente
  } = useFirestore<Cliente>('clientes')

  // Estados
  const [loading, setLoading] = useState(false)
  const [modoNoturno, setModoNoturno] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'pessoa_fisica' | 'pessoa_juridica'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(10)

  // Estados do formulário
  const [dadosCliente, setDadosCliente] = useState<Cliente>({
    nome: '',
    email: '',
    telefone: '',
    cpfCnpj: '',
    tipoCliente: 'pessoa_fisica',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    limiteCredito: 0,
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
        abrirModalNovoCliente()
      }
      if (e.key === 'Escape' && modalAberto) {
        fecharModal()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [modalAberto])

  // Função para validar CPF (simplificada)
  const validarCPF = useCallback((cpf: string) => {
    const cpfLimpo = cpf.replace(/[^\d]/g, '')
    return cpfLimpo.length === 11 && cpfLimpo !== '00000000000'
  }, [])

  // Função para validar CNPJ (simplificada)
  const validarCNPJ = useCallback((cnpj: string) => {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '')
    return cnpjLimpo.length === 14 && cnpjLimpo !== '00000000000000'
  }, [])

  // Função para formatar CPF/CNPJ
  const formatarCpfCnpj = useCallback((valor: string, tipo: 'pessoa_fisica' | 'pessoa_juridica') => {
    const apenasNumeros = valor.replace(/[^\d]/g, '')
    
    if (tipo === 'pessoa_fisica') {
      return apenasNumeros
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    } else {
      return apenasNumeros
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    }
  }, [])

  // Filtrar e paginar clientes
  const clientesFiltrados = useMemo(() => {
    if (!clientes) return []

    return clientes.filter(cliente => {
      const matchBusca = !busca || 
        cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
        cliente.email.toLowerCase().includes(busca.toLowerCase()) ||
        cliente.telefone.includes(busca) ||
        cliente.cpfCnpj.includes(busca)

      const matchTipo = filtroTipo === 'todos' || cliente.tipoCliente === filtroTipo
      const matchStatus = filtroStatus === 'todos' || 
        (filtroStatus === 'ativo' && cliente.ativo) ||
        (filtroStatus === 'inativo' && !cliente.ativo)

      return matchBusca && matchTipo && matchStatus
    })
  }, [clientes, busca, filtroTipo, filtroStatus])

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return clientesFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [clientesFiltrados, paginaAtual, itensPorPagina])

  const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina)

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!clientes) return { total: 0, ativos: 0, pessoaFisica: 0, pessoaJuridica: 0 }

    const total = clientes.length
    const ativos = clientes.filter(c => c.ativo).length
    const pessoaFisica = clientes.filter(c => c.tipoCliente === 'pessoa_fisica').length
    const pessoaJuridica = clientes.filter(c => c.tipoCliente === 'pessoa_juridica').length

    return { total, ativos, pessoaFisica, pessoaJuridica }
  }, [clientes])

  // Abrir modal para novo cliente
  const abrirModalNovoCliente = useCallback(() => {
    setClienteEditando(null)
    setDadosCliente({
      nome: '',
      email: '',
      telefone: '',
      cpfCnpj: '',
      tipoCliente: 'pessoa_fisica',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      limiteCredito: 0,
      observacoes: '',
      ativo: true,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      userId: user?.uid || ''
    })
    setModalAberto(true)
  }, [user])

  // Abrir modal para editar cliente
  const abrirModalEditarCliente = useCallback((cliente: Cliente) => {
    setClienteEditando(cliente)
    setDadosCliente(cliente)
    setModalAberto(true)
  }, [])

  // Fechar modal
  const fecharModal = useCallback(() => {
    setModalAberto(false)
    setClienteEditando(null)
  }, [])

  // Salvar cliente
  const salvarCliente = useCallback(async () => {
    if (!user) return

    // Validações
    if (!dadosCliente.nome.trim()) {
      toast.warning('Campo obrigatório', 'Nome é obrigatório')
      return
    }

    if (!dadosCliente.cpfCnpj.trim()) {
      toast.warning('Campo obrigatório', 'CPF/CNPJ é obrigatório')
      return
    }

    // Validar CPF/CNPJ
    if (dadosCliente.tipoCliente === 'pessoa_fisica' && !validarCPF(dadosCliente.cpfCnpj)) {
      toast.error('CPF inválido', 'Digite um CPF válido')
      return
    }

    if (dadosCliente.tipoCliente === 'pessoa_juridica' && !validarCNPJ(dadosCliente.cpfCnpj)) {
      toast.error('CNPJ inválido', 'Digite um CNPJ válido')
      return
    }

    // Verificar se CPF/CNPJ já existe (exceto para o cliente sendo editado)
    const cpfCnpjExistente = clientes?.find(c => 
      c.cpfCnpj === dadosCliente.cpfCnpj && 
      c.id !== clienteEditando?.id
    )

    if (cpfCnpjExistente) {
      toast.error('CPF/CNPJ já cadastrado', 'Este documento já está em uso por outro cliente')
      return
    }

    setLoading(true)
    try {
      const clienteCompleto = { ...dadosCliente, userId: user.uid }

      if (clienteEditando) {
        await updateCliente(clienteEditando.id!, clienteCompleto)
        toast.success('Cliente atualizado!', 'Dados do cliente foram atualizados com sucesso')
      } else {
        await addCliente(clienteCompleto)
        toast.success('Cliente cadastrado!', 'Novo cliente foi adicionado com sucesso')
      }

      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      toast.error('Erro ao salvar', 'Não foi possível salvar os dados do cliente')
    } finally {
      setLoading(false)
    }
  }, [dadosCliente, user, clienteEditando, clientes, updateCliente, addCliente, validarCPF, validarCNPJ, toast, fecharModal])

  // Alternar status do cliente
  const alternarStatusCliente = useCallback(async (cliente: Cliente) => {
    if (!user) return

    setLoading(true)
    try {
      const clienteAtualizado = { ...cliente, ativo: !cliente.ativo }
      await updateCliente(cliente.id!, clienteAtualizado)
      
      toast.success(
        clienteAtualizado.ativo ? 'Cliente ativado!' : 'Cliente inativado!',
        `${cliente.nome} foi ${clienteAtualizado.ativo ? 'ativado' : 'inativado'} com sucesso`
      )
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status', 'Não foi possível alterar o status do cliente')
    } finally {
      setLoading(false)
    }
  }, [user, updateCliente, toast])

  // Exportar clientes
  const exportarClientes = useCallback(async () => {
    if (!clientes) return

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      let csvContent = '\uFEFF' // BOM para UTF-8
      csvContent += `StockPro - Lista de Clientes\n`
      csvContent += `Data de Geração,${new Date().toLocaleString('pt-BR')}\n`
      csvContent += `Total de Clientes,${clientes.length}\n\n`
      
      csvContent += `Nome,Email,Telefone,CPF/CNPJ,Tipo,Cidade,Estado,Limite Crédito,Status,Data Cadastro\n`
      
      clientes.forEach(cliente => {
        csvContent += `${cliente.nome},${cliente.email},${cliente.telefone},${cliente.cpfCnpj},${cliente.tipoCliente === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'},${cliente.cidade},${cliente.estado},R$ ${cliente.limiteCredito.toFixed(2)},${cliente.ativo ? 'Ativo' : 'Inativo'},${cliente.dataCadastro}\n`
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clientes-stockpro-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Lista exportada!', 'Arquivo CSV gerado com sucesso')
    } catch (error) {
      toast.error('Erro na exportação', 'Não foi possível exportar a lista de clientes')
    } finally {
      setLoading(false)
    }
  }, [clientes, toast])

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="Gestão de Clientes" 
          currentPage="/clientes" 
          userEmail={user?.email || undefined}
        />

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 lg:ml-64">
          
          {/* Loading de carregamento inicial */}
          {loadingClientes && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-blue-600 text-2xl">👥</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando clientes...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Sincronizando base de dados</p>
              </div>
            </div>
          )}

          {/* Header principal */}
          {!loadingClientes && (
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                  👥 Gestão de Clientes
                </h1>
                <p className={`text-sm mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ctrl+N para novo cliente • ESC para fechar modal
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
                  onClick={abrirModalNovoCliente}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  👤 Novo Cliente (Ctrl+N)
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Cards de Estatísticas */}
          {!loadingClientes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              
              {/* Total de Clientes */}
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-blue-100 text-sm">Total de Clientes</p>
                    <p className="text-2xl font-bold">{estatisticas.total}</p>
                    <p className="text-blue-100 text-xs">Cadastrados no sistema</p>
                  </div>
                  <div className="text-3xl ml-2">👥</div>
                </div>
              </div>

              {/* Clientes Ativos */}
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-green-100 text-sm">Clientes Ativos</p>
                    <p className="text-2xl font-bold">{estatisticas.ativos}</p>
                    <p className="text-green-100 text-xs">{estatisticas.total > 0 ? ((estatisticas.ativos / estatisticas.total) * 100).toFixed(1) : 0}% do total</p>
                  </div>
                  <div className="text-3xl ml-2">✅</div>
                </div>
              </div>

              {/* Pessoa Física */}
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-purple-100 text-sm">Pessoa Física</p>
                    <p className="text-2xl font-bold">{estatisticas.pessoaFisica}</p>
                    <p className="text-purple-100 text-xs">Clientes CPF</p>
                  </div>
                  <div className="text-3xl ml-2">👤</div>
                </div>
              </div>

              {/* Pessoa Jurídica */}
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-orange-100 text-sm">Pessoa Jurídica</p>
                    <p className="text-2xl font-bold">{estatisticas.pessoaJuridica}</p>
                    <p className="text-orange-100 text-xs">Clientes CNPJ</p>
                  </div>
                  <div className="text-3xl ml-2">🏢</div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros e Busca */}
          {!loadingClientes && (
            <div className={`mb-6 p-6 rounded-xl shadow-lg transition-colors duration-300 ${
              modoNoturno ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Busca */}
                <div className="lg:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                    🔍 Buscar Cliente
                  </label>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome, email, telefone ou CPF/CNPJ..."
                    className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Filtro por Tipo */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                    👤 Tipo de Cliente
                  </label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as any)}
                    className={`w-full border rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="todos">Todos os tipos</option>
                    <option value="pessoa_fisica">Pessoa Física</option>
                    <option value="pessoa_juridica">Pessoa Jurídica</option>
                  </select>
                </div>

                {/* Filtro por Status */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                    📊 Status
                  </label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as any)}
                    className={`w-full border rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
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
                  📋 Mostrando {clientesFiltrados.length} de {estatisticas.total} clientes
                </div>
                
                <LoadingButton
                  onClick={exportarClientes}
                  isLoading={loading}
                  loadingText="Exportando..."
                  variant="success"
                  size="md"
                  disabled={!clientes || clientes.length === 0}
                >
                  📊 Exportar Lista
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Lista de Clientes */}
          {!loadingClientes && (
            <div className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${
              modoNoturno ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {clientesPaginados.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                    {busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' 
                      ? 'Nenhum cliente encontrado' 
                      : 'Nenhum cliente cadastrado'
                    }
                  </h3>
                  <p className={`text-sm mb-6 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                    {busca || filtroTipo !== 'todos' || filtroStatus !== 'todos' 
                      ? 'Tente ajustar os filtros de busca' 
                      : 'Comece cadastrando seu primeiro cliente'
                    }
                  </p>
                  {(!busca && filtroTipo === 'todos' && filtroStatus === 'todos') && (
                    <LoadingButton
                      onClick={abrirModalNovoCliente}
                      variant="primary"
                      size="md"
                    >
                      👤 Cadastrar Primeiro Cliente
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
                            Cliente
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Contato
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Documento
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            modoNoturno ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            Localização
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
                        {clientesPaginados.map((cliente) => (
                          <tr key={cliente.id} className={`hover:bg-opacity-50 transition-colors duration-200 ${
                            modoNoturno ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                          }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                  cliente.ativo ? 'bg-green-500' : 'bg-gray-400'
                                }`}>
                                  {cliente.tipoCliente === 'pessoa_fisica' ? '👤' : '🏢'}
                                </div>
                                <div className="ml-4">
                                  <div className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                    {cliente.nome}
                                  </div>
                                  <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {cliente.tipoCliente === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {cliente.email}
                              </div>
                              <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                {cliente.telefone}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-mono ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {cliente.cpfCnpj}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {cliente.cidade}
                              </div>
                              <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                {cliente.estado}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                cliente.ativo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {cliente.ativo ? '✅ Ativo' : '❌ Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                              <button
                                onClick={() => abrirModalEditarCliente(cliente)}
                                className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                                title="Editar cliente"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => alternarStatusCliente(cliente)}
                                className={`transition-colors duration-200 ${
                                  cliente.ativo 
                                    ? 'text-red-600 hover:text-red-900' 
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                                title={cliente.ativo ? 'Inativar cliente' : 'Ativar cliente'}
                              >
                                {cliente.ativo ? '❌' : '✅'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards - Mobile */}
                  <div className="lg:hidden space-y-4 p-4">
                    {clientesPaginados.map((cliente) => (
                      <div key={cliente.id} className={`p-4 rounded-lg border transition-colors duration-200 ${
                        modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                              cliente.ativo ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              {cliente.tipoCliente === 'pessoa_fisica' ? '👤' : '🏢'}
                            </div>
                            <div>
                              <h3 className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {cliente.nome}
                              </h3>
                              <p className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                {cliente.tipoCliente === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            cliente.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {cliente.ativo ? '✅ Ativo' : '❌ Inativo'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Email:</strong> {cliente.email}
                          </div>
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Telefone:</strong> {cliente.telefone}
                          </div>
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Documento:</strong> {cliente.cpfCnpj}
                          </div>
                          <div className={`${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <strong>Localização:</strong> {cliente.cidade}, {cliente.estado}
                          </div>
                        </div>

                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={() => abrirModalEditarCliente(cliente)}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => alternarStatusCliente(cliente)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                              cliente.ativo 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {cliente.ativo ? '❌ Inativar' : '✅ Ativar'}
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

          {/* Modal de Cliente */}
          {modalAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl transition-colors duration-300 ${
                modoNoturno ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className={`sticky top-0 px-6 py-4 border-b ${
                  modoNoturno ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                      {clienteEditando ? '✏️ Editar Cliente' : '👤 Novo Cliente'}
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dados Pessoais */}
                    <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        👤 Dados Pessoais
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Nome Completo *
                          </label>
                          <input
                            type="text"
                            value={dadosCliente.nome}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, nome: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="Nome completo do cliente"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Tipo de Cliente *
                          </label>
                          <select
                            value={dadosCliente.tipoCliente}
                            onChange={(e) => {
                              const novoTipo = e.target.value as 'pessoa_fisica' | 'pessoa_juridica'
                              setDadosCliente(prev => ({ 
                                ...prev, 
                                tipoCliente: novoTipo,
                                cpfCnpj: '' // Limpar o campo ao mudar o tipo
                              }))
                            }}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white' 
                                : 'border-gray-300 bg-white text-gray-900'
                            }`}
                          >
                            <option value="pessoa_fisica">👤 Pessoa Física</option>
                            <option value="pessoa_juridica">🏢 Pessoa Jurídica</option>
                          </select>
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            {dadosCliente.tipoCliente === 'pessoa_fisica' ? 'CPF *' : 'CNPJ *'}
                          </label>
                          <input
                            type="text"
                            value={dadosCliente.cpfCnpj}
                            onChange={(e) => {
                              const valorFormatado = formatarCpfCnpj(e.target.value, dadosCliente.tipoCliente)
                              setDadosCliente(prev => ({ ...prev, cpfCnpj: valorFormatado }))
                            }}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 font-mono ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder={dadosCliente.tipoCliente === 'pessoa_fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Email
                          </label>
                          <input
                            type="email"
                            value={dadosCliente.email}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, email: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="email@exemplo.com"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Telefone
                          </label>
                          <input
                            type="text"
                            value={dadosCliente.telefone}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, telefone: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Endereço e Dados Comerciais */}
                    <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        📍 Endereço e Dados Comerciais
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Endereço
                          </label>
                          <input
                            type="text"
                            value={dadosCliente.endereco}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, endereco: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
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
                              value={dadosCliente.cidade}
                              onChange={(e) => setDadosCliente(prev => ({ ...prev, cidade: e.target.value }))}
                              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
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
                              value={dadosCliente.estado}
                              onChange={(e) => setDadosCliente(prev => ({ ...prev, estado: e.target.value }))}
                              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
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
                            value={dadosCliente.cep}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, cep: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="00000-000"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Limite de Crédito (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={dadosCliente.limiteCredito}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, limiteCredito: parseFloat(e.target.value) || 0 }))}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Observações
                          </label>
                          <textarea
                            value={dadosCliente.observacoes}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, observacoes: e.target.value }))}
                            rows={3}
                            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            placeholder="Informações adicionais sobre o cliente..."
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="ativo"
                            checked={dadosCliente.ativo}
                            onChange={(e) => setDadosCliente(prev => ({ ...prev, ativo: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="ativo" className={`ml-2 text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Cliente ativo
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Modal */}
                  <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <LoadingButton
                      onClick={salvarCliente}
                      isLoading={loading}
                      loadingText="Salvando..."
                      variant="primary"
                      size="md"
                      className="flex-1"
                    >
                      💾 {clienteEditando ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
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
          {!loadingClientes && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">👥</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                    Sistema Avançado de Gestão de Clientes
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-blue-300' : 'text-blue-700'}`}>
                    <p>• <strong>👤 Cadastro completo:</strong> Dados pessoais, endereço e informações comerciais</p>
                    <p>• <strong>🔍 Busca inteligente:</strong> Encontre clientes por nome, email, telefone ou documento</p>
                    <p>• <strong>📊 Filtros avançados:</strong> Organize por tipo de cliente e status</p>
                    <p>• <strong>✅ Validação automática:</strong> CPF e CNPJ verificados automaticamente</p>
                    <p>• <strong>📱 Interface responsiva:</strong> Perfeita em desktop e mobile</p>
                    <p>• <strong>📋 Exportação:</strong> Gere relatórios completos em CSV</p>
                    <p>• <strong>🔗 Integração PDV:</strong> Conecta diretamente com o ponto de venda</p>
                    <p>• <strong>⌨️ Atalhos produtivos:</strong> Ctrl+N para novo cliente, ESC para fechar</p>
                    <p>• <strong>🔒 Segurança:</strong> Dados protegidos e sincronizados na nuvem</p>
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