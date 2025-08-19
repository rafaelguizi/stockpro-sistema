// src/app/pdv/page.tsx
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

// 📦 INTERFACE PRODUTO ATUALIZADA
interface Produto {
  id: string
  codigo: string
  nome: string
  categoria: string
  categoriaId?: string
  codigosBarras: string[]      // 🆕 Array de códigos
  temCodigoBarras: boolean     // 🆕 Controle se usa código
  isDestilado: boolean         // 🆕 Bebida sem validade
  estoqueMinimo: number
  valorCompra: number
  valorVenda: number
  estoque: number
  ativo: boolean
  dataCadastro: string
  userId: string
}

interface Cliente {
  id: string
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

interface ItemVenda {
  produto: Produto
  quantidade: number
  valorUnitario: number
  valorTotal: number
  desconto?: number
  codigoBarrasUsado?: string   // 🆕 Qual código foi usado na venda
}

// 📋 INTERFACE MOVIMENTACAO ATUALIZADA
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
  codigoBarrasUsado?: string   // 🆕 Código específico usado
  clienteId?: string
  clienteNome?: string
  clienteCpfCnpj?: string
  formaPagamento?: string
  valorPago?: number
  troco?: number
}

// Sons de feedback (simulados com emojis sonoros)
const playSound = (type: 'success' | 'error' | 'scan') => {
  console.log(`🔊 Som: ${type}`)
}

export default function PDV() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()

  // 🆕 MARGEM DINÂMICA BASEADA NO ESTADO DA SIDEBAR
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handleStorageChange = () => {
      const collapsed = localStorage.getItem('stockpro_sidebar_collapsed')
      if (collapsed !== null) { 
        setSidebarCollapsed(JSON.parse(collapsed))
      }
    }

    handleStorageChange()
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(handleStorageChange, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])
  
  // Hooks do Firestore
  const { 
    data: produtos, 
    loading: loadingProdutos,
    updateDocument: updateProduto
  } = useFirestore<Produto>('produtos')

  const { 
    data: clientes, 
    loading: loadingClientes 
  } = useFirestore<Cliente>('clientes')

  const { 
    data: categorias, 
    loading: loadingCategorias 
  } = useFirestore<CategoriaFirestore>('categorias')

  const { 
    addDocument: addMovimentacao
  } = useFirestore<Movimentacao>('movimentacoes')
  
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estados para venda ativa
  const [vendaAtiva, setVendaAtiva] = useState(false)
  const [autoFocus, setAutoFocus] = useState(true)
  
  // Estados para funcionalidades extras
  const [modoNoturno, setModoNoturno] = useState(false)
  const [vendasDoDia, setVendasDoDia] = useState(0)
  const [faturamentoDoDia, setFaturamentoDoDia] = useState(0)
  
  // Estados para desconto inteligente
  const [tipoDesconto, setTipoDesconto] = useState<'valor' | 'percentual'>('percentual')
  const [descontoPercentual, setDescontoPercentual] = useState(0)
  const [descontoTotal, setDescontoTotal] = useState(0)

  // Estados para clientes
  const [buscarCliente, setBuscarCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix' | 'prazo'>('dinheiro')
  const [valorPago, setValorPago] = useState<number>(0)
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false)

  // Estados para filtros por categoria
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [mostrarProdutos, setMostrarProdutos] = useState(false)

  // 🆕 ESTADOS PARA PRODUTOS SEM CÓDIGO
  const [mostrarProdutosSemCodigo, setMostrarProdutosSemCodigo] = useState(false)
  const [produtoSemCodigoNome, setProdutoSemCodigoNome] = useState('')
  const [produtoSemCodigoPreco, setProdutoSemCodigoPreco] = useState('')
  const [produtoSemCodigoQuantidade, setProdutoSemCodigoQuantidade] = useState(1)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Categorias ativas para filtro
  const categoriasAtivas = useMemo(() => {
    return categorias?.filter(cat => cat.ativo).slice(0, 8) || []
  }, [categorias])

  // 🆕 OBTER DADOS DA CATEGORIA DO PRODUTO
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

  // 🆕 PRODUTOS FILTRADOS POR CATEGORIA E BUSCA
  const produtosFiltrados = useMemo(() => {
    if (!produtos) return []
    
    let produtosFiltrados = produtos.filter(p => p.ativo)
    
    // Filtrar por categoria selecionada
    if (categoriaSelecionada) {
      produtosFiltrados = produtosFiltrados.filter(p => {
        if (categoriaSelecionada === 'sem_categoria') {
          return !p.categoriaId
        }
        return p.categoriaId === categoriaSelecionada
      })
    }
    
    // Filtrar por busca de nome
    if (buscaProduto.trim()) {
      const termo = buscaProduto.toLowerCase()
      produtosFiltrados = produtosFiltrados.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        p.codigo.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo)
      )
    }
    
    return produtosFiltrados.slice(0, 20)
  }, [produtos, categoriaSelecionada, buscaProduto])

  // 🆕 PRODUTOS SEM CÓDIGO DE BARRAS
  const produtosSemCodigo = useMemo(() => {
    if (!produtos) return []
    return produtos.filter(p => p.ativo && !p.temCodigoBarras).slice(0, 10)
  }, [produtos])

  // Auto-focus no input de código de barras
  useEffect(() => {
    if (inputRef.current && !loadingProdutos && autoFocus && !mostrarProdutos && !mostrarProdutosSemCodigo) {
      inputRef.current.focus()
    }
  }, [loadingProdutos, autoFocus, vendaAtiva, mostrarProdutos, mostrarProdutosSemCodigo])

  // 🆕 ATALHOS DE TECLADO ATUALIZADOS
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F1 - Toggle venda ativa
      if (e.key === 'F1') {
        e.preventDefault()
        toggleVendaAtiva()
      }
      // F2 - Finalizar venda
      if (e.key === 'F2' && itensVenda.length > 0) {
        e.preventDefault()
        setModalPagamentoAberto(true)
      }
      // F3 - Limpar venda
      if (e.key === 'F3' && itensVenda.length > 0) {
        e.preventDefault()
        limparVenda()
      }
      // F4 - Focar no input
      if (e.key === 'F4') {
        e.preventDefault()
        inputRef.current?.focus()
        setMostrarProdutos(false)
        setMostrarProdutosSemCodigo(false)
      }
      // 🆕 F10 - Produtos sem código
      if (e.key === 'F10') {
        e.preventDefault()
        setMostrarProdutosSemCodigo(!mostrarProdutosSemCodigo)
        setMostrarProdutos(false)
        setCategoriaSelecionada('')
      }
      // F5-F9 - Selecionar categorias
      if (e.key === 'F5' && categoriasAtivas[0]) {
        e.preventDefault()
        selecionarCategoria(categoriasAtivas[0].id)
      }
      if (e.key === 'F6' && categoriasAtivas[1]) {
        e.preventDefault()
        selecionarCategoria(categoriasAtivas[1].id)
      }
      if (e.key === 'F7' && categoriasAtivas[2]) {
        e.preventDefault()
        selecionarCategoria(categoriasAtivas[2].id)
      }
      if (e.key === 'F8' && categoriasAtivas[3]) {
        e.preventDefault()
        selecionarCategoria(categoriasAtivas[3].id)
      }
      if (e.key === 'F9' && categoriasAtivas[4]) {
        e.preventDefault()
        selecionarCategoria(categoriasAtivas[4].id)
      }
      // Escape - Fechar filtros/modais
      if (e.key === 'Escape') {
        e.preventDefault()
        if (modalPagamentoAberto) {
          setModalPagamentoAberto(false)
        } else if (mostrarListaClientes) {
          setMostrarListaClientes(false)
        } else if (mostrarProdutos || categoriaSelecionada || mostrarProdutosSemCodigo) {
          setMostrarProdutos(false)
          setMostrarProdutosSemCodigo(false)
          setCategoriaSelecionada('')
          setBuscaProduto('')
          inputRef.current?.focus()
        } else if (vendaAtiva) {
          setVendaAtiva(false)
          toast.info('⏸️ Venda pausada', 'Pressione F1 para reativar')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [vendaAtiva, itensVenda.length, modalPagamentoAberto, mostrarListaClientes, mostrarProdutos, mostrarProdutosSemCodigo, categoriaSelecionada, categoriasAtivas])

  // Produtos ativos
  const produtosAtivos = produtos ? produtos.filter(p => p.ativo) : []
  const produtosComCodigoBarras = produtosAtivos.filter(p => p.temCodigoBarras && p.codigosBarras.length > 0)

  // 🆕 BUSCAR PRODUTO POR CÓDIGO DE BARRAS ATUALIZADA
  const buscarProdutoPorCodigoBarras = (codigoBarras: string) => {
    const produtoEncontrado = produtosAtivos.find(p => 
      p.codigosBarras?.includes(codigoBarras) || 
      p.codigo === codigoBarras
    )
    
    return produtoEncontrado ? {
      produto: produtoEncontrado,
      codigoUsado: produtoEncontrado.codigosBarras?.includes(codigoBarras) ? codigoBarras : produtoEncontrado.codigo
    } : null
  }

  // Função para selecionar categoria
  const selecionarCategoria = (categoriaId: string) => {
    setCategoriaSelecionada(categoriaId)
    setBuscaProduto('')
    setMostrarProdutos(true)
    setMostrarProdutosSemCodigo(false)
    
    const categoria = categorias?.find(cat => cat.id === categoriaId)
    if (categoria) {
      toast.success('📂 Categoria selecionada', `${categoria.icone} ${categoria.nome}`)
    }
  }

  // 🆕 FUNÇÃO PARA ADICIONAR PRODUTO DA LISTA ATUALIZADA
  const adicionarProdutoDaLista = async (produto: Produto, codigoEspecifico?: string) => {
    await adicionarProdutoVenda(produto, 1, codigoEspecifico)
    
    if (!vendaAtiva) {
      setMostrarProdutos(false)
      setMostrarProdutosSemCodigo(false)
      setCategoriaSelecionada('')
      setBuscaProduto('')
      
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  // 🆕 FUNÇÃO PARA ADICIONAR PRODUTO SEM CÓDIGO
  const adicionarProdutoSemCodigo = async () => {
    if (!produtoSemCodigoNome.trim() || !produtoSemCodigoPreco || produtoSemCodigoQuantidade <= 0) {
      toast.error('Dados incompletos', 'Preencha nome, preço e quantidade!')
      return
    }

    const preco = parseFloat(produtoSemCodigoPreco)
    if (preco <= 0) {
      toast.error('Preço inválido', 'O preço deve ser maior que zero!')
      return
    }

    // Criar produto temporário
    const produtoTemporario: Produto = {
      id: `temp_${Date.now()}`,
      codigo: `TEMP${Date.now()}`,
      nome: produtoSemCodigoNome,
      categoria: 'Produtos Avulsos',
      codigosBarras: [],
      temCodigoBarras: false,
      isDestilado: false,
      estoqueMinimo: 0,
      valorCompra: preco * 0.7, // Margem estimada
      valorVenda: preco,
      estoque: 999999, // Estoque "infinito" para produtos avulsos
      ativo: true,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      userId: user?.uid || ''
    }

    const novoItem: ItemVenda = {
      produto: produtoTemporario,
      quantidade: produtoSemCodigoQuantidade,
      valorUnitario: preco,
      valorTotal: preco * produtoSemCodigoQuantidade,
      desconto: 0,
      codigoBarrasUsado: 'PRODUTO_AVULSO'
    }

    setItensVenda([...itensVenda, novoItem])

    // Limpar campos
    setProdutoSemCodigoNome('')
    setProdutoSemCodigoPreco('')
    setProdutoSemCodigoQuantidade(1)

    playSound('success')
    toast.success('Produto avulso adicionado!', `${produtoSemCodigoNome} - ${produtoSemCodigoQuantidade}x`)

    if (!vendaAtiva) {
      setMostrarProdutosSemCodigo(false)
    }
  }

  // Funções utilitárias (mantidas originais)
  const calcularSubtotalVenda = () => {
    return itensVenda.reduce((total, item) => total + item.valorTotal, 0)
  }

  const calcularTotalVenda = () => {
    const subtotal = calcularSubtotalVenda()
    
    if (tipoDesconto === 'percentual') {
      const valorDesconto = (subtotal * descontoPercentual) / 100
      return Math.max(0, subtotal - valorDesconto)
    } else {
      return Math.max(0, subtotal - descontoTotal)
    }
  }

  const obterValorDesconto = () => {
    const subtotal = calcularSubtotalVenda()
    
    if (tipoDesconto === 'percentual') {
      return (subtotal * descontoPercentual) / 100
    } else {
      return descontoTotal
    }
  }

  // Filtrar clientes pela busca
  const clientesFiltrados = useMemo(() => {
    if (!buscarCliente.trim()) return clientes?.filter(c => c.ativo).slice(0, 10) || []
    
    const termo = buscarCliente.toLowerCase()
    return clientes?.filter(cliente => 
      cliente.ativo && (
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.email.toLowerCase().includes(termo) ||
        cliente.cpfCnpj.includes(termo) ||
        cliente.telefone.includes(termo)
      )
    ).slice(0, 10) || []
  }, [clientes, buscarCliente])

  // Calcular totais da venda com cliente
  const totaisVenda = useMemo(() => {
    const subtotal = calcularSubtotalVenda()
    const valorDesconto = obterValorDesconto()
    const total = subtotal - valorDesconto
    const troco = formaPagamento === 'dinheiro' ? Math.max(0, valorPago - total) : 0
    
    return { subtotal, valorDesconto, total, troco }
  }, [itensVenda, descontoPercentual, descontoTotal, tipoDesconto, valorPago, formaPagamento])

  // Verificar limite de crédito
  const limiteExcedido = useMemo(() => {
    if (!clienteSelecionado || formaPagamento !== 'prazo') return false
    return totaisVenda.total > clienteSelecionado.limiteCredito
  }, [clienteSelecionado, formaPagamento, totaisVenda.total])

  // Selecionar cliente
  const selecionarCliente = useCallback((cliente: Cliente) => {
    setClienteSelecionado(cliente)
    setBuscarCliente(cliente.nome)
    setMostrarListaClientes(false)
    
    if (descontoPercentual === 0) {
      setDescontoPercentual(5)
      toast.success('Cliente selecionado!', `Desconto de 5% aplicado para ${cliente.nome}`)
    } else {
      toast.success('Cliente selecionado!', cliente.nome)
    }
  }, [descontoPercentual, toast])

  // Remover cliente
  const removerCliente = useCallback(() => {
    setClienteSelecionado(null)
    setBuscarCliente('')
    setDescontoPercentual(0)
    setDescontoTotal(0)
    if (formaPagamento === 'prazo') {
      setFormaPagamento('dinheiro')
    }
    toast.info('Cliente removido', 'Desconto de cliente removido')
  }, [formaPagamento, toast])

  // 🆕 ADICIONAR PRODUTO À VENDA ATUALIZADA
  const adicionarProdutoVenda = async (produto: Produto, quantidade: number = 1, codigoBarrasUsado?: string) => {
    if (produto.estoque < quantidade && produto.id.indexOf('temp_') !== 0) {
      playSound('error')
      toast.error('Estoque insuficiente', `Disponível: ${produto.estoque} unidades`)
      return
    }

    const itemExistente = itensVenda.find(item => 
      item.produto.id === produto.id && 
      item.codigoBarrasUsado === codigoBarrasUsado
    )
    
    if (itemExistente && produto.id.indexOf('temp_') !== 0) {
      const novaQuantidade = itemExistente.quantidade + quantidade
      if (produto.estoque < novaQuantidade) {
        playSound('error')
        toast.error('Estoque insuficiente', `Disponível: ${produto.estoque} unidades`)
        return
      }
      
      setItensVenda(itensVenda.map(item => 
        item.produto.id === produto.id && item.codigoBarrasUsado === codigoBarrasUsado
          ? {
              ...item,
              quantidade: novaQuantidade,
              valorTotal: (item.valorUnitario * novaQuantidade) - (item.desconto || 0)
            }
          : item
      ))
    } else {
      const novoItem: ItemVenda = {
        produto,
        quantidade,
        valorUnitario: produto.valorVenda,
        valorTotal: produto.valorVenda * quantidade,
        desconto: 0,
        codigoBarrasUsado
      }
      setItensVenda([...itensVenda, novoItem])
    }

    playSound('success')
    toast.success('Produto adicionado!', `${produto.nome} - ${quantidade}x`)
  }

  // 🆕 PROCESSAR CÓDIGO DE BARRAS ATUALIZADA
  const processarCodigoBarras = async (codigoBarras: string) => {
    if (!codigoBarras.trim()) return

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const resultado = buscarProdutoPorCodigoBarras(codigoBarras.trim())
      
      if (resultado) {
        playSound('scan')
        await adicionarProdutoVenda(resultado.produto, 1, resultado.codigoUsado)
        setCodigoBarrasInput('')
        
        if (vendaAtiva) {
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }, 100)
        }
      } else {
        playSound('error')
        toast.error('Produto não encontrado', 'Código de barras não cadastrado')
        setCodigoBarrasInput('')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle do input de código de barras
  const handleCodigoBarrasSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    processarCodigoBarras(codigoBarrasInput)
  }

  // Toggle venda ativa
  const toggleVendaAtiva = () => {
    const novoEstado = !vendaAtiva
    setVendaAtiva(novoEstado)
    
    if (novoEstado) {
      setMostrarProdutos(false)
      setMostrarProdutosSemCodigo(false)
      setCategoriaSelecionada('')
      setBuscaProduto('')
    }
    
    if (novoEstado) {
      playSound('success')
      toast.success('🔥 Venda iniciada!', 'Escaneie produtos continuamente (F1 para pausar)')
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    } else {
      toast.info('⏸️ Venda pausada', 'Modo manual ativado (F1 para reativar)')
    }
  }

  // Remover item da venda
  const removerItemVenda = (produtoId: string, codigoBarrasUsado?: string) => {
    setItensVenda(itensVenda.filter(item => 
      !(item.produto.id === produtoId && item.codigoBarrasUsado === codigoBarrasUsado)
    ))
    toast.info('Item removido', 'Produto removido da venda')
  }

  // Alterar quantidade do item
  const alterarQuantidadeItem = (produtoId: string, novaQuantidade: number, codigoBarrasUsado?: string) => {
    if (novaQuantidade <= 0) {
      removerItemVenda(produtoId, codigoBarrasUsado)
      return
    }

    const item = itensVenda.find(item => 
      item.produto.id === produtoId && item.codigoBarrasUsado === codigoBarrasUsado
    )
    if (!item) return

    if (item.produto.id.indexOf('temp_') !== 0 && item.produto.estoque < novaQuantidade) {
      toast.error('Estoque insuficiente', `Disponível: ${item.produto.estoque} unidades`)
      return
    }

    setItensVenda(itensVenda.map(item => 
      item.produto.id === produtoId && item.codigoBarrasUsado === codigoBarrasUsado
        ? {
            ...item,
            quantidade: novaQuantidade,
            valorTotal: (item.valorUnitario * novaQuantidade) - (item.desconto || 0)
          }
        : item
    ))
  }

  // Aplicar desconto em item específico
  const aplicarDescontoItem = (produtoId: string, desconto: number, codigoBarrasUsado?: string) => {
    setItensVenda(itensVenda.map(item => 
      item.produto.id === produtoId && item.codigoBarrasUsado === codigoBarrasUsado
        ? {
            ...item,
            desconto: Math.max(0, Math.min(desconto, item.valorUnitario * item.quantidade)),
            valorTotal: (item.valorUnitario * item.quantidade) - Math.max(0, Math.min(desconto, item.valorUnitario * item.quantidade))
          }
        : item
    ))
  }

  // 🔧 FINALIZAR VENDA CORRIGIDA - SEM CAMPOS UNDEFINED
  const finalizarVenda = async () => {
  if (!user) {
    toast.error('Erro de autenticação', 'Usuário não encontrado!')
    return
  }

  if (itensVenda.length === 0) {
    toast.warning('Venda vazia', 'Adicione produtos à venda!')
    return
  }

  if (formaPagamento === 'dinheiro' && valorPago < totaisVenda.total) {
    toast.warning('Valor insuficiente', 'Valor pago menor que o total da venda')
    return
  }

  if (formaPagamento === 'prazo' && !clienteSelecionado) {
    toast.warning('Cliente obrigatório', 'Selecione um cliente para venda a prazo')
    return
  }

  if (limiteExcedido) {
    toast.error('Limite excedido', 'Valor da venda excede o limite de crédito do cliente')
    return
  }

  setLoading(true)
  try {
    const totalVenda = calcularTotalVenda()
    const totalItens = itensVenda.reduce((total, item) => total + item.quantidade, 0)
    const valorDesconto = obterValorDesconto()

    // 🆕 CRIAR MOVIMENTAÇÕES SEM CAMPOS UNDEFINED
    const movimentacoesPromises = itensVenda.map(item => {
      let observacao = vendaAtiva 
        ? `Venda PDV - Modo Ativo` 
        : `Venda PDV`
      
      if (clienteSelecionado) observacao += ` - Cliente: ${clienteSelecionado.nome}`
      if (valorDesconto > 0) {
        observacao += ` - Desconto: ${tipoDesconto === 'percentual' ? `${descontoPercentual}%` : `R$ ${descontoTotal.toFixed(2)}`}`
      }

      // Adicionar informação do código usado
      if (item.codigoBarrasUsado && item.codigoBarrasUsado !== 'PRODUTO_AVULSO') {
        observacao += ` - Código: ${item.codigoBarrasUsado}`
      } else if (item.codigoBarrasUsado === 'PRODUTO_AVULSO') {
        observacao += ` - Produto Avulso`
      }

      // 🔧 CAMPOS OBRIGATÓRIOS DA MOVIMENTAÇÃO
      const movimentacaoBase = {
        produto: item.produto.nome,
        codigo: item.produto.codigo,
        produtoId: item.produto.id,
        tipo: 'saida' as const,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        observacao,
        userId: user.uid,
        formaPagamento,
        valorPago: formaPagamento === 'dinheiro' ? valorPago : totalVenda,
        troco: totaisVenda.troco
      }

      // 🔧 CAMPOS OPCIONAIS - SÓ ADICIONAR SE TIVEREM VALOR
      const camposOpcionais: Partial<Movimentacao> = {}

      // Código de barras usado
      if (item.codigoBarrasUsado && item.codigoBarrasUsado.trim() !== '') {
        camposOpcionais.codigoBarrasUsado = item.codigoBarrasUsado
      }

      // Dados do cliente (só se cliente estiver selecionado)
      if (clienteSelecionado) {
        camposOpcionais.clienteId = clienteSelecionado.id
        camposOpcionais.clienteNome = clienteSelecionado.nome
        camposOpcionais.clienteCpfCnpj = clienteSelecionado.cpfCnpj
      }

      // 🔧 COMBINAR E FILTRAR UNDEFINED
      const movimentacaoCompleta = { ...movimentacaoBase, ...camposOpcionais }

      // 🚀 FILTRO FINAL - REMOVER QUALQUER UNDEFINED
      const movimentacaoLimpa = Object.fromEntries(
        Object.entries(movimentacaoCompleta).filter(([_, value]) => value !== undefined)
      ) as Omit<Movimentacao, 'id'>

      console.log('Movimentação a ser salva:', movimentacaoLimpa) // Debug

      return addMovimentacao(movimentacaoLimpa)
    })

    // Atualizar estoque apenas para produtos reais
    const estoquePromises = itensVenda
      .filter(item => item.produto.id.indexOf('temp_') !== 0)
      .map(item => {
        const novoEstoque = item.produto.estoque - item.quantidade
        return updateProduto(item.produto.id, { 
          ...item.produto, 
          estoque: novoEstoque 
        })
      })

    await Promise.all([...movimentacoesPromises, ...estoquePromises])

    setVendasDoDia(prev => prev + 1)
    setFaturamentoDoDia(prev => prev + totalVenda)

    imprimirCupom()
    limparVenda(true)
    setModalPagamentoAberto(false)

    playSound('success')
    
    const mensagemDesconto = valorDesconto > 0 
      ? ` - Desconto: ${tipoDesconto === 'percentual' ? `${descontoPercentual}%` : `R$ ${valorDesconto.toFixed(2)}`}`
      : ''
    
    toast.success(
      '💰 Venda finalizada!', 
      `Total: R$ ${totalVenda.toFixed(2)} - ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}${clienteSelecionado ? ` - ${clienteSelecionado.nome}` : ''}${mensagemDesconto}`
    )

    if (vendaAtiva) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }

  } catch (error) {
    console.error('Erro ao finalizar venda:', error)
    toast.error('Erro na venda', 'Não foi possível finalizar a venda')
  } finally {
    setLoading(false)
  }
}

  // Limpar venda
  const limparVenda = () => {
    if (itensVenda.length === 0) return
    
    if (confirm('Tem certeza que deseja limpar a venda?')) {
      setItensVenda([])
      setDescontoTotal(0)
      setDescontoPercentual(0)
      setTipoDesconto('percentual')
      setClienteSelecionado(null)
      setBuscarCliente('')
      setFormaPagamento('dinheiro')
      setValorPago(0)
      setMostrarProdutos(false)
      setMostrarProdutosSemCodigo(false)
      setCategoriaSelecionada('')
      setBuscaProduto('')
      toast.info('🧹 Venda limpa', 'Todos os itens foram removidos')
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  // Iniciar scanner
  const iniciarScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowScanner(true)
        toast.info('📷 Scanner ativo', 'Aponte a câmera para o código de barras')
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error)
      toast.error('Erro na câmera', 'Não foi possível acessar a câmera')
    }
  }

  // Parar scanner
  const pararScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
    setShowScanner(false)
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  // 🆕 SIMULAR LEITURA ATUALIZADA
  const simularLeituraCodigoBarras = () => {
    if (produtosComCodigoBarras.length === 0) {
      toast.warning('Nenhum produto', 'Cadastre produtos com código de barras primeiro')
      return
    }

    const produtoAleatorio = produtosComCodigoBarras[Math.floor(Math.random() * produtosComCodigoBarras.length)]
    const codigoAleatorio = produtoAleatorio.codigosBarras[0] || produtoAleatorio.codigo
    processarCodigoBarras(codigoAleatorio)
    pararScanner()
  }

  // 🆕 IMPRIMIR CUPOM ATUALIZADO
  const imprimirCupom = () => {
    const valorDesconto = obterValorDesconto()
    const cupom = `
      ====== CUPOM FISCAL ======
      Data: ${new Date().toLocaleDateString('pt-BR')}
      Hora: ${new Date().toLocaleTimeString('pt-BR')}
      
      ${clienteSelecionado ? `
      CLIENTE: ${clienteSelecionado.nome}
      DOC: ${clienteSelecionado.cpfCnpj}
      FONE: ${clienteSelecionado.telefone}
      ` : ''}
      
      ITENS:
      ${itensVenda.map(item => {
        let linha = `${item.produto.nome} - ${item.quantidade}x R$ ${item.valorUnitario.toFixed(2)} = R$ ${item.valorTotal.toFixed(2)}`
        if (item.codigoBarrasUsado && item.codigoBarrasUsado !== 'PRODUTO_AVULSO') {
          linha += `\n  Código: ${item.codigoBarrasUsado}`
        } else if (item.codigoBarrasUsado === 'PRODUTO_AVULSO') {
          linha += `\n  (Produto Avulso)`
        }
        return linha
      }).join('\n')}
      
      SUBTOTAL: R$ ${calcularSubtotalVenda().toFixed(2)}
      ${valorDesconto > 0 ? `DESCONTO ${tipoDesconto === 'percentual' ? `(${descontoPercentual}%)` : ''}: -R$ ${valorDesconto.toFixed(2)}` : ''}
      TOTAL: R$ ${calcularTotalVenda().toFixed(2)}
      
      FORMA PAGAMENTO: ${formaPagamento.toUpperCase()}
      ${formaPagamento === 'dinheiro' ? `VALOR PAGO: R$ ${valorPago.toFixed(2)}` : ''}
      ${totaisVenda.troco > 0 ? `TROCO: R$ ${totaisVenda.troco.toFixed(2)}` : ''}
      
      ===== OBRIGADO PELA PREFERÊNCIA =====
    `
    
    console.log(cupom)
    toast.success('🖨️ Cupom gerado!', 'Confira no console do navegador')
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="PDV - Ponto de Venda" 
          currentPage="/pdv" 
          userEmail={user?.email || undefined}
        />

        <main className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed
           ? 'lg:ml-16 lg:mr-4' 
           : 'max-w-7xl mx-auto lg:ml-64'
        }`}>
          
          {/* Loading inicial */}
          {(loadingProdutos || loadingClientes || loadingCategorias) && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-green-600 text-2xl">🛒</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando PDV...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Sincronizando dados do Firebase</p>
              </div>
            </div>
          )}

          {!loadingProdutos && !loadingClientes && !loadingCategorias && (
            <>
              {/* 🆕 HEADER DO PDV ATUALIZADO */}
              <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-xl p-6 mb-6 text-white animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">🛒 PDV Pro + Múltiplos Códigos</h1>
                    <p className="text-green-100 mt-2 text-base sm:text-lg">
                      {vendaAtiva 
                        ? '🔥 Modo Venda Ativa - Escaneie produtos continuamente' 
                        : mostrarProdutos
                          ? `📂 Categoria: ${categorias?.find(c => c.id === categoriaSelecionada)?.nome || 'Produtos'}`
                          : mostrarProdutosSemCodigo
                            ? '📝 Produtos Sem Código - Adicione rapidamente'
                            : 'Escaneie códigos, filtre por categoria ou adicione produtos avulsos'
                      }
                    </p>
                    <div className="mt-2 text-sm text-green-200">
                      F1=Venda | F2=Pagamento | F3=Limpar | F4=Scanner | F5-F9=Categorias | F10=Sem Código | ESC=Voltar
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <LoadingButton
                      onClick={toggleVendaAtiva}
                      variant={vendaAtiva ? "warning" : "success"}
                      size="md"
                      className="w-full sm:w-auto bg-black bg-opacity-20 hover:bg-opacity-30 text-white border-white"
                    >
                      {vendaAtiva ? '⏸️ Pausar (F1)' : '▶️ Iniciar (F1)'}
                    </LoadingButton>
                    
                    <LoadingButton
                      onClick={() => setModoNoturno(!modoNoturno)}
                      variant="secondary"
                      size="md"
                      className="w-full sm:w-auto bg-black bg-opacity-20 hover:bg-opacity-30 text-white border-white"
                    >
                      {modoNoturno ? '☀️ Modo Dia' : '🌙 Modo Noite'}
                    </LoadingButton>
                    
                    <LoadingButton
                      onClick={() => router.push('/produtos')}
                      variant="secondary"
                      size="md"
                      className="w-full sm:w-auto bg-black bg-opacity-20 hover:bg-opacity-30 text-white border-white"
                    >
                      📦 Produtos
                    </LoadingButton>
                  </div>
                </div>
              </div>

              {/* Indicador visual de venda ativa */}
              {vendaAtiva && (
                <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-400 rounded-xl p-5 mb-6 shadow-lg animate-pulse-slow">
                  <div className="flex items-center">
                    <div className="animate-pulse w-4 h-4 bg-green-500 rounded-full mr-4"></div>
                    <div className="flex-1">
                      <h3 className="text-green-800 font-bold text-xl">🔥 VENDA ATIVA</h3>
                      <p className="text-green-700 mt-1">
                        Escaneie produtos continuamente. Sistema com múltiplos códigos e produtos avulsos!
                      </p>
                      <div className="mt-3 text-sm text-green-600 space-y-1">
                        <p>• ✅ Múltiplos códigos de barras por produto suportados</p>
                        <p>• 📝 Use F10 para adicionar produtos sem código rapidamente</p>
                        <p>• 🔄 Controle automático de qual código foi usado na venda</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aviso se não há produtos */}
              {produtosAtivos.length === 0 && (
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
                        <p>Para usar o PDV, você precisa ter produtos ativos cadastrados.</p>
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 🆕 COLUNA 1: SCANNER E FILTROS ATUALIZADOS */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* 🆕 SEÇÃO PRODUTOS SEM CÓDIGO */}
                  {!vendaAtiva && (
                    <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                          📝 Produtos Sem Código
                        </h3>
                        <button
                          onClick={() => {
                            setMostrarProdutosSemCodigo(!mostrarProdutosSemCodigo)
                            setMostrarProdutos(false)
                            setCategoriaSelecionada('')
                          }}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            mostrarProdutosSemCodigo
                              ? 'bg-green-500 text-white'
                              : modoNoturno
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {mostrarProdutosSemCodigo ? '📂 Fechar (F10)' : '➕ Abrir (F10)'}
                        </button>
                      </div>

                      {mostrarProdutosSemCodigo ? (
                        <div className="space-y-4">
                          {/* Formulário rápido */}
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Nome do produto (ex: Bala sortida)"
                              value={produtoSemCodigoNome}
                              onChange={(e) => setProdutoSemCodigoNome(e.target.value)}
                              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                                modoNoturno 
                                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                              }`}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Preço (R$)"
                                value={produtoSemCodigoPreco}
                                onChange={(e) => setProdutoSemCodigoPreco(e.target.value)}
                                className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                                  modoNoturno 
                                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                }`}
                              />
                              <input
                                type="number"
                                min="1"
                                placeholder="Qtd"
                                value={produtoSemCodigoQuantidade}
                                onChange={(e) => setProdutoSemCodigoQuantidade(parseInt(e.target.value) || 1)}
                                className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                                  modoNoturno 
                                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                }`}
                              />
                            </div>
                            <LoadingButton
                              onClick={adicionarProdutoSemCodigo}
                              variant="success"
                              size="md"
                              className="w-full"
                              disabled={!produtoSemCodigoNome.trim() || !produtoSemCodigoPreco}
                            >
                              ➕ Adicionar à Venda
                            </LoadingButton>
                          </div>

                          {/* Lista de produtos sem código cadastrados */}
                          {produtosSemCodigo.length > 0 && (
                            <div>
                              <h5 className={`text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                🗂️ Produtos sem código cadastrados:
                              </h5>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {produtosSemCodigo.map(produto => {
                                  const dadosCategoria = obterDadosCategoria(produto)
                                  
                                  return (
                                    <button
                                      key={produto.id}
                                      onClick={() => adicionarProdutoDaLista(produto)}
                                      className={`w-full p-2 rounded-lg border transition-all hover:shadow-md ${
                                        modoNoturno 
                                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                                          : 'border-gray-200 bg-white hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        <div
                                          className="w-6 h-6 rounded flex items-center justify-center text-white mr-2"
                                          style={{ backgroundColor: dadosCategoria.cor }}
                                        >
                                          <span className="text-xs">{dadosCategoria.icone}</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                          <div className={`text-xs font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                            {produto.nome}
                                          </div>
                                          <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                                            R$ {produto.valorVenda.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                            💡 Para produtos como: bala avulsa, cigarro solto, copo de 700ml, etc.
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">📝</div>
                          <p className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                            Adicione produtos avulsos rapidamente
                          </p>
                          <p className={`text-xs mt-1 ${modoNoturno ? 'text-gray-500' : 'text-gray-500'}`}>
                            Bala avulsa, cigarro solto, copo 700ml...
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Filtros por categoria */}
                  {!vendaAtiva && categoriasAtivas.length > 0 && (
                    <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        📂 Filtros por Categoria
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-2 mb-4">
                        {categoriasAtivas.slice(0, 5).map((categoria, index) => (
                          <button
                            key={categoria.id}
                            onClick={() => selecionarCategoria(categoria.id)}
                            className={`flex items-center p-3 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${
                              categoriaSelecionada === categoria.id
                                ? 'text-white shadow-lg'
                                : modoNoturno
                                  ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            style={{
                              backgroundColor: categoriaSelecionada === categoria.id ? categoria.cor : undefined
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                              style={{ backgroundColor: categoria.cor }}
                            >
                              <span className="text-sm">{categoria.icone}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium">{categoria.nome}</div>
                              <div className="text-xs opacity-75">F{index + 5}</div>
                            </div>
                            <div className="text-sm font-bold">
                              {produtos?.filter(p => p.categoriaId === categoria.id && p.ativo).length || 0}
                            </div>
                          </button>
                        ))}
                        
                        <button
                          onClick={() => selecionarCategoria('sem_categoria')}
                          className={`flex items-center p-3 rounded-lg border-2 transition-all duration-200 ${
                            categoriaSelecionada === 'sem_categoria'
                              ? 'border-gray-500 bg-gray-500 text-white'
                              : modoNoturno
                                ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3 bg-gray-400">
                            <span className="text-sm">📦</span>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">Sem categoria</div>
                            <div className="text-xs opacity-75">Produtos gerais</div>
                          </div>
                          <div className="text-sm font-bold">
                            {produtos?.filter(p => !p.categoriaId && p.ativo).length || 0}
                          </div>
                        </button>
                      </div>

                      {categoriaSelecionada && (
                        <LoadingButton
                          onClick={() => {
                            setCategoriaSelecionada('')
                            setBuscaProduto('')
                            setMostrarProdutos(false)
                            inputRef.current?.focus()
                          }}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                        >
                          🧹 Limpar Filtro (ESC)
                        </LoadingButton>
                      )}
                    </div>
                  )}

                  {/* Busca rápida de produtos */}
                  {(mostrarProdutos || buscaProduto) && !vendaAtiva && (
                    <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        🔍 Busca Rápida
                      </h3>
                      
                      <div className="mb-4">
                        <input
                          type="text"
                          value={buscaProduto}
                          onChange={(e) => setBuscaProduto(e.target.value)}
                          placeholder="Digite o nome do produto..."
                          className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {produtosFiltrados.length === 0 ? (
                          <div className="text-center py-4">
                            <div className="text-4xl mb-2">🔍</div>
                            <p className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                              {buscaProduto ? 'Nenhum produto encontrado' : 'Digite para buscar produtos'}
                            </p>
                          </div>
                        ) : (
                          produtosFiltrados.map(produto => {
                            const dadosCategoria = obterDadosCategoria(produto)
                            
                            return (
                              <div key={produto.id} className="space-y-1">
                                {/* Produto principal */}
                                <button
                                  onClick={() => adicionarProdutoDaLista(produto)}
                                  className={`w-full p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                    modoNoturno 
                                      ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                                      : 'border-gray-200 bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                                      style={{ backgroundColor: dadosCategoria.cor }}
                                    >
                                      <span className="text-sm">{dadosCategoria.icone}</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className={`font-medium text-sm ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                        {produto.nome}
                                      </div>
                                      <div className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                                        #{produto.codigo} • {dadosCategoria.nome}
                                      </div>
                                      <div className={`text-xs ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                        Estoque: {produto.estoque} • R$ {produto.valorVenda.toFixed(2)}
                                      </div>
                                      
                                      {/* 🆕 MOSTRAR CÓDIGOS DE BARRAS DISPONÍVEIS */}
                                      {produto.temCodigoBarras && produto.codigosBarras.length > 0 && (
                                        <div className={`text-xs mt-1 ${modoNoturno ? 'text-blue-400' : 'text-blue-600'}`}>
                                          📱 {produto.codigosBarras.length} código(s) de barras
                                        </div>
                                      )}
                                      {!produto.temCodigoBarras && (
                                        <div className={`text-xs mt-1 ${modoNoturno ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                          📝 Sem código de barras
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-green-600 text-xl">➕</div>
                                  </div>
                                </button>

                                {/* 🆕 BOTÕES PARA CÓDIGOS ESPECÍFICOS */}
                                {produto.temCodigoBarras && produto.codigosBarras.length > 1 && (
                                  <div className="ml-6 space-y-1">
                                    {produto.codigosBarras.slice(0, 3).map((codigo, index) => (
                                      <button
                                        key={index}
                                        onClick={() => adicionarProdutoDaLista(produto, codigo)}
                                        className={`w-full p-2 rounded border transition-all text-left ${
                                          modoNoturno 
                                            ? 'border-gray-600 bg-gray-800 hover:bg-gray-600 text-gray-300' 
                                            : 'border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="text-xs font-mono">📱 {codigo}</div>
                                            <div className="text-xs opacity-75">Código específico {index + 1}</div>
                                          </div>
                                          <div className="text-green-500 text-sm">+</div>
                                        </div>
                                      </button>
                                    ))}
                                    {produto.codigosBarras.length > 3 && (
                                      <div className={`text-xs text-center py-1 ${modoNoturno ? 'text-gray-500' : 'text-gray-400'}`}>
                                        +{produto.codigosBarras.length - 3} códigos adicionais
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>

                      {produtosFiltrados.length >= 20 && (
                        <div className={`mt-3 text-xs text-center ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                          Mostrando 20 produtos. Refine a busca para ver mais.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input de Código de Barras */}
                  {(!mostrarProdutos || vendaAtiva) && !mostrarProdutosSemCodigo && (
                    <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                      <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        📱 Scanner de Produtos
                        {vendaAtiva && <span className="ml-2 text-green-400 text-sm animate-pulse">(ATIVO)</span>}
                      </h3>
                      
                      <form onSubmit={handleCodigoBarrasSubmit} className="space-y-4">
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                            Código de Barras
                            {vendaAtiva && <span className="ml-2 text-green-400 text-xs">(Auto-foco ativo)</span>}
                          </label>
                          <input
                            ref={inputRef}
                            type="text"
                            value={codigoBarrasInput}
                            onChange={(e) => setCodigoBarrasInput(e.target.value)}
                            className={`w-full border-2 rounded-lg px-4 py-4 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm text-lg transition-all duration-200 ${
                              vendaAtiva 
                                ? 'border-green-500 bg-green-50 text-gray-900' 
                                : modoNoturno 
                                  ? 'border-gray-600 bg-gray-700 text-white' 
                                  : 'border-gray-400 bg-white text-gray-900'
                            }`}
                            placeholder={vendaAtiva ? "🔥 VENDA ATIVA - Escaneie os produtos..." : "Escaneie ou digite o código"}
                            disabled={loading || produtosAtivos.length === 0}
                            autoFocus={vendaAtiva}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <LoadingButton
                            type="submit"
                            isLoading={loading}
                            loadingText="Buscando..."
                            variant="primary"
                            size="md"
                            className="w-full"
                            disabled={produtosAtivos.length === 0}
                          >
                            🔍 Buscar
                          </LoadingButton>
                          <LoadingButton
                            type="button"
                            onClick={iniciarScanner}
                            variant="secondary"
                            size="md"
                            className="w-full"
                            disabled={produtosAtivos.length === 0}
                          >
                            📷 Câmera
                          </LoadingButton>
                        </div>
                      </form>

                      <div className={`mt-4 p-3 rounded-lg border ${modoNoturno ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                        <p className={`text-sm ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                          💡 <strong>Novo:</strong> {vendaAtiva 
                            ? 'Sistema reconhece múltiplos códigos automaticamente!'
                            : 'Use F5-F9 para categorias ou F10 para produtos sem código!'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* RESTO DOS COMPONENTES MANTIDOS (CLIENTE, DESCONTO, ESTATÍSTICAS) */}
                  {/* Seção de Cliente */}
                  <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      👥 Cliente da Venda
                    </h3>

                    {clienteSelecionado ? (
                      <div className={`p-4 rounded-lg border ${
                        modoNoturno ? 'border-green-600 bg-green-900' : 'border-green-200 bg-green-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-4 ${
                              clienteSelecionado.ativo ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              {clienteSelecionado.tipoCliente === 'pessoa_fisica' ? '👤' : '🏢'}
                            </div>
                            <div>
                              <h4 className={`font-bold ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>
                                {clienteSelecionado.nome}
                              </h4>
                              <p className={`text-sm ${modoNoturno ? 'text-green-300' : 'text-green-700'}`}>
                                {clienteSelecionado.cpfCnpj} • {clienteSelecionado.telefone}
                              </p>
                              <p className={`text-xs ${modoNoturno ? 'text-green-400' : 'text-green-600'}`}>
                                Limite: R$ {clienteSelecionado.limiteCredito.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={removerCliente}
                            className="text-red-600 hover:text-red-800 transition-colors duration-200"
                            title="Remover cliente"
                          >
                            <span className="text-xl">❌</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={buscarCliente}
                          onChange={(e) => {
                            setBuscarCliente(e.target.value)
                            setMostrarListaClientes(e.target.value.length > 0)
                          }}
                          onFocus={() => setMostrarListaClientes(buscarCliente.length > 0)}
                          placeholder="Buscar cliente por nome, email, telefone ou CPF/CNPJ..."
                          className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                          }`}
                        />

                        {mostrarListaClientes && clientesFiltrados.length > 0 && (
                          <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto ${
                            modoNoturno ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'
                          }`}>
                            {clientesFiltrados.map(cliente => (
                              <button
                                key={cliente.id}
                                onClick={() => selecionarCliente(cliente)}
                                className={`w-full p-3 text-left hover:bg-opacity-75 transition-colors duration-200 border-b last:border-b-0 ${
                                  modoNoturno 
                                    ? 'hover:bg-gray-600 border-gray-600' 
                                    : 'hover:bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                                    cliente.ativo ? 'bg-green-500' : 'bg-gray-400'
                                  }`}>
                                    {cliente.tipoCliente === 'pessoa_fisica' ? '👥' : '🏢'}
                                  </div>
                                  <div>
                                    <p className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                      {cliente.nome}
                                    </p>
                                    <p className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {cliente.cpfCnpj} • {cliente.telefone}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desconto inteligente (MANTIDO ORIGINAL) */}
                  <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      💸 Desconto na Venda
                    </h3>
                    
                    <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setTipoDesconto('percentual')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          tipoDesconto === 'percentual'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        📊 Porcentagem
                      </button>
                      <button
                        onClick={() => setTipoDesconto('valor')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          tipoDesconto === 'valor'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        💰 Valor Fixo
                      </button>
                    </div>

                    {tipoDesconto === 'percentual' ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            { label: '5% Cliente', valor: 5 },
                            { label: '10% Funcionário', valor: 10 },
                            { label: '15% Atacado', valor: 15 },
                            { label: '20% Promoção', valor: 20 }
                          ].map(opcao => (
                            <button
                              key={opcao.valor}
                              onClick={() => setDescontoPercentual(opcao.valor)}
                              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                descontoPercentual === opcao.valor
                                  ? 'bg-green-500 text-white'
                                  : modoNoturno
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              disabled={itensVenda.length === 0}
                            >
                              {opcao.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={descontoPercentual}
                            onChange={(e) => setDescontoPercentual(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                            className={`flex-1 border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-700 text-white' 
                                : 'border-gray-400 bg-white text-gray-900'
                            }`}
                            placeholder="0.0"
                            disabled={itensVenda.length === 0}
                          />
                          <span className={`text-lg font-bold ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>%</span>
                        </div>

                        {descontoPercentual > 0 && calcularSubtotalVenda() > 0 && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-green-800 font-medium">Desconto {descontoPercentual}%:</span>
                              <span className="text-green-600 font-bold">-R$ {obterValorDesconto().toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={calcularSubtotalVenda()}
                            value={descontoTotal}
                            onChange={(e) => setDescontoTotal(Math.max(0, parseFloat(e.target.value) || 0))}
                            className={`flex-1 border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition-all duration-200 ${
                              modoNoturno 
                                ? 'border-gray-600 bg-gray-700 text-white' 
                                : 'border-gray-400 bg-white text-gray-900'
                            }`}
                            placeholder="0.00"
                            disabled={itensVenda.length === 0}
                          />
                        </div>

                        {descontoTotal > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-red-800 font-medium">Desconto aplicado:</span>
                              <span className="text-red-600 font-bold">-R$ {descontoTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {(descontoPercentual > 0 || descontoTotal > 0) && (
                      <button
                        onClick={() => {
                          setDescontoPercentual(0)
                          setDescontoTotal(0)
                        }}
                        className="mt-3 w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        🧹 Limpar Desconto
                      </button>
                    )}
                  </div>

                  {/* 🆕 ESTATÍSTICAS ATUALIZADAS */}
                  <div className={`rounded-xl shadow-lg p-6 transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>📊 Estatísticas</h3>
                    
                    <div className="space-y-3">
                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-blue-900' : 'bg-blue-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>Produtos Ativos</span>
                        <span className={`font-bold ${modoNoturno ? 'text-blue-100' : 'text-blue-600'}`}>{produtosAtivos.length}</span>
                      </div>
                      
                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-green-900' : 'bg-green-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>Com Código de Barras</span>
                        <span className={`font-bold ${modoNoturno ? 'text-green-100' : 'text-green-600'}`}>{produtosComCodigoBarras.length}</span>
                      </div>

                      {/* 🆕 ESTATÍSTICA DE PRODUTOS SEM CÓDIGO */}
                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-yellow-900' : 'bg-yellow-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-yellow-200' : 'text-yellow-800'}`}>Produtos Sem Código</span>
                        <span className={`font-bold ${modoNoturno ? 'text-yellow-100' : 'text-yellow-600'}`}>{produtosSemCodigo.length}</span>
                      </div>

                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-purple-900' : 'bg-purple-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-purple-200' : 'text-purple-800'}`}>Categorias Ativas</span>
                        <span className={`font-bold ${modoNoturno ? 'text-purple-100' : 'text-purple-600'}`}>{categoriasAtivas.length}</span>
                      </div>
                      
                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-orange-900' : 'bg-orange-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-orange-200' : 'text-orange-800'}`}>Itens na Venda</span>
                        <span className={`font-bold ${modoNoturno ? 'text-orange-100' : 'text-orange-600'}`}>{itensVenda.length}</span>
                      </div>

                      {/* 🆕 TOTAL DE CÓDIGOS DE BARRAS */}
                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-indigo-900' : 'bg-indigo-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-indigo-200' : 'text-indigo-800'}`}>Total de Códigos</span>
                        <span className={`font-bold ${modoNoturno ? 'text-indigo-100' : 'text-indigo-600'}`}>
                          {produtos?.reduce((total, p) => total + (p.codigosBarras?.length || 0), 0) || 0}
                        </span>
                      </div>

                      {/* Status da venda */}
                      <div className={`flex justify-between items-center p-3 rounded-lg border ${
                        vendaAtiva 
                          ? modoNoturno ? 'bg-green-900 border-green-700' : 'bg-green-100 border-green-300'
                          : modoNoturno ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <span className={`font-medium ${
                          vendaAtiva 
                            ? modoNoturno ? 'text-green-200' : 'text-green-800'
                            : modoNoturno ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Status da Venda
                        </span>
                        <span className={`font-bold ${
                          vendaAtiva 
                            ? modoNoturno ? 'text-green-100' : 'text-green-600'
                            : modoNoturno ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {vendaAtiva ? '🔥 ATIVA' : mostrarProdutos ? '📂 FILTRO' : mostrarProdutosSemCodigo ? '📝 SEM CÓDIGO' : '⏸️ Manual'}
                        </span>
                      </div>

                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-yellow-900' : 'bg-yellow-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-yellow-200' : 'text-yellow-800'}`}>Vendas Hoje</span>
                        <span className={`font-bold ${modoNoturno ? 'text-yellow-100' : 'text-yellow-600'}`}>{vendasDoDia}</span>
                      </div>

                      <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-green-900' : 'bg-green-50'}`}>
                        <span className={`font-medium ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>Faturamento</span>
                        <span className={`font-bold ${modoNoturno ? 'text-green-100' : 'text-green-600'}`}>R$ {faturamentoDoDia.toFixed(2)}</span>
                      </div>

                      {clienteSelecionado && (
                        <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-indigo-900' : 'bg-indigo-50'}`}>
                          <span className={`font-medium ${modoNoturno ? 'text-indigo-200' : 'text-indigo-800'}`}>Cliente Ativo</span>
                          <span className={`font-bold ${modoNoturno ? 'text-indigo-100' : 'text-indigo-600'}`}>✅ {clienteSelecionado.nome.split(' ')[0]}</span>
                        </div>
                      )}

                      {categoriaSelecionada && categorias && (
                        <div className={`flex justify-between items-center p-3 rounded-lg ${modoNoturno ? 'bg-pink-900' : 'bg-pink-50'}`}>
                          <span className={`font-medium ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>Filtro Ativo</span>
                          <span className={`font-bold ${modoNoturno ? 'text-pink-100' : 'text-pink-600'}`}>
                            {categoriaSelecionada === 'sem_categoria' 
                              ? '📦 Sem categoria'
                              : `${categorias.find(c => c.id === categoriaSelecionada)?.icone} ${categorias.find(c => c.id === categoriaSelecionada)?.nome}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Lista de Itens da Venda (ATUALIZADA COM CÓDIGOS ESPECÍFICOS) */}
                <div className="lg:col-span-2">
                  <div className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className={`px-6 py-4 border-b flex justify-between items-center ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>🛒 Itens da Venda</h3>
                      <div className="flex space-x-2">
                        <LoadingButton
                          onClick={limparVenda}
                          variant="warning"
                          size="sm"
                          disabled={itensVenda.length === 0}
                        >
                          🧹 Limpar (F3)
                        </LoadingButton>
                        <LoadingButton
                          onClick={() => setModalPagamentoAberto(true)}
                          variant="success"
                          size="sm"
                          disabled={itensVenda.length === 0}
                        >
                          💳 Pagamento (F2)
                        </LoadingButton>
                      </div>
                    </div>

                    {itensVenda.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4 animate-bounce">🛒</div>
                        <h3 className={`text-lg font-medium mb-2 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>Venda vazia</h3>
                        <p className={`mb-4 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                          {produtosAtivos.length === 0 
                            ? 'Cadastre produtos ativos para começar a vender'
                            : vendaAtiva
                              ? '🔥 Escaneie códigos - múltiplos códigos e produtos avulsos suportados!'
                              : mostrarProdutos
                                ? '📂 Clique nos produtos da lista para adicionar à venda'
                                : mostrarProdutosSemCodigo
                                  ? '📝 Adicione produtos sem código rapidamente'
                                  : 'Escaneie códigos, filtre por categoria ou adicione produtos avulsos'
                          }
                        </p>
                        <div className={`text-sm space-y-2 ${modoNoturno ? 'text-gray-400' : 'text-gray-400'}`}>
                          <div>💡 {vendaAtiva 
                            ? 'Novo: Sistema detecta múltiplos códigos automaticamente!'
                            : mostrarProdutos
                              ? 'Produtos organizados por categoria com códigos específicos'
                              : mostrarProdutosSemCodigo
                                ? 'Adicione balas avulsas, cigarros soltos e produtos sem código'
                                : 'F5-F9=Categorias | F10=Sem Código | F4=Scanner'
                          }</div>
                          {!vendaAtiva && !mostrarProdutos && !mostrarProdutosSemCodigo && categoriasAtivas.length > 0 && (
                            <div className="mt-3">
                              <p className="font-medium mb-2">Atalhos:</p>
                              <div className="flex flex-wrap justify-center gap-2">
                                {categoriasAtivas.slice(0, 4).map((categoria, index) => (
                                  <span 
                                    key={categoria.id}
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ backgroundColor: categoria.cor, color: 'white' }}
                                  >
                                    F{index + 5}: {categoria.icone} {categoria.nome}
                                  </span>
                                ))}
                                <span className="text-xs px-2 py-1 rounded bg-yellow-500 text-white">
                                  F10: 📝 Sem Código
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 🆕 LISTA DE ITENS MOBILE ATUALIZADA */}
                        <div className={`block sm:hidden divide-y ${modoNoturno ? 'divide-gray-700' : 'divide-gray-200'}`}>
                          {itensVenda.map((item, index) => (
                            <div key={`${item.produto.id}-${item.codigoBarrasUsado || index}`} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-sm font-bold truncate ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{item.produto.nome}</h4>
                                  <div className={`space-y-1 text-xs mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <p><span className="font-medium">Código:</span> #{item.produto.codigo}</p>
                                    
                                    {/* 🆕 MOSTRAR CÓDIGO ESPECÍFICO USADO */}
                                    {item.codigoBarrasUsado && item.codigoBarrasUsado !== 'PRODUTO_AVULSO' && (
                                      <p><span className="font-medium text-blue-600">Código usado:</span> {item.codigoBarrasUsado}</p>
                                    )}
                                    {item.codigoBarrasUsado === 'PRODUTO_AVULSO' && (
                                      <p><span className="font-medium text-yellow-600">Tipo:</span> Produto avulso</p>
                                    )}
                                    
                                    <p><span className="font-medium">Preço unit.:</span> R$ {item.valorUnitario.toFixed(2)}</p>
                                    <p><span className="font-medium">Subtotal:</span> R$ {item.valorTotal.toFixed(2)}</p>
                                    {item.desconto && item.desconto > 0 && (
                                      <p><span className="font-medium text-red-600">Desconto:</span> -R$ {item.desconto.toFixed(2)}</p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 mt-3">
                                    <button
                                      onClick={() => alterarQuantidadeItem(item.produto.id, item.quantidade - 1, item.codigoBarrasUsado)}
                                      className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold transition-colors"
                                    >
                                      -
                                    </button>
                                    <span className={`px-3 py-1 rounded-lg font-bold ${modoNoturno ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                      {item.quantidade}
                                    </span>
                                    <button
                                      onClick={() => alterarQuantidadeItem(item.produto.id, item.quantidade + 1, item.codigoBarrasUsado)}
                                      className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold transition-colors"
                                      disabled={item.produto.id.indexOf('temp_') !== 0 && item.quantidade >= item.produto.estoque}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <button
                                  onClick={() => removerItemVenda(item.produto.id, item.codigoBarrasUsado)}
                                  className="ml-4 w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 🆕 LISTA DE ITENS DESKTOP ATUALIZADA */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className={modoNoturno ? 'bg-gray-700' : 'bg-gray-50'}>
                              <tr>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Produto
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Código Usado
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Preço Unit.
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Quantidade
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Desconto
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Subtotal
                                </th>
                                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Ações
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${modoNoturno ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                              {itensVenda.map((item, index) => (
                                <tr key={`${item.produto.id}-${item.codigoBarrasUsado || index}`} className={`hover:${modoNoturno ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{item.produto.nome}</div>
                                      <div className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>#{item.produto.codigo}</div>
                                      {item.codigoBarrasUsado === 'PRODUTO_AVULSO' && (
                                        <div className="text-xs text-yellow-600 font-medium">📝 Produto Avulso</div>
                                      )}
                                    </div>
                                  </td>
                                  
                                  {/* 🆕 COLUNA CÓDIGO USADO */}
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {item.codigoBarrasUsado === 'PRODUTO_AVULSO' ? (
                                      <span className="text-yellow-600 font-mono text-xs">📝 AVULSO</span>
                                    ) : item.codigoBarrasUsado ? (
                                      <span className="text-blue-600 font-mono text-xs">📱 {item.codigoBarrasUsado}</span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">Código principal</span>
                                    )}
                                  </td>
                                  
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                                    R$ {item.valorUnitario.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => alterarQuantidadeItem(item.produto.id, item.quantidade - 1, item.codigoBarrasUsado)}
                                        className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold transition-colors"
                                      >
                                        -
                                      </button>
                                      <span className={`px-3 py-1 rounded-lg font-bold min-w-[3rem] text-center ${modoNoturno ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                        {item.quantidade}
                                      </span>
                                      <button
                                        onClick={() => alterarQuantidadeItem(item.produto.id, item.quantidade + 1, item.codigoBarrasUsado)}
                                        className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold transition-colors"
                                        disabled={item.produto.id.indexOf('temp_') !== 0 && item.quantidade >= item.produto.estoque}
                                      >
                                        +
                                      </button>
                                    </div>
                                    <div className={`text-xs mt-1 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {item.produto.id.indexOf('temp_') === 0 ? 'Produto avulso' : `Estoque: ${item.produto.estoque}`}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={item.valorUnitario * item.quantidade}
                                      value={item.desconto || 0}
                                      onChange={(e) => aplicarDescontoItem(item.produto.id, parseFloat(e.target.value) || 0, item.codigoBarrasUsado)}
                                      className={`w-20 border rounded px-2 py-1 text-sm ${modoNoturno ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                    R$ {item.valorTotal.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                      onClick={() => removerItemVenda(item.produto.id, item.codigoBarrasUsado)}
                                      className="text-red-600 hover:text-red-900 transition-colors"
                                    >
                                      🗑️ Remover
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Total da venda */}
                        <div className={`px-6 py-4 border-t ${modoNoturno ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className={`text-base font-semibold ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                                Subtotal:
                              </div>
                              <div className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                R$ {calcularSubtotalVenda().toFixed(2)}
                              </div>
                            </div>
                            
                            {obterValorDesconto() > 0 && (
                              <div className="flex justify-between items-center">
                                <div className="text-base font-semibold text-red-600">
                                  Desconto {tipoDesconto === 'percentual' ? `(${descontoPercentual}%)` : 'Total'}:
                                </div>
                                <div className="text-lg font-bold text-red-600">
                                  -R$ {obterValorDesconto().toFixed(2)}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center border-t pt-2 border-gray-300">
                              <div className={`text-xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                                Total da Venda:
                              </div>
                              <div className="text-3xl font-bold text-green-600">
                                R$ {calcularTotalVenda().toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          <div className={`text-sm mt-3 flex justify-between items-center ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                            <div>
                              {itensVenda.length} {itensVenda.length === 1 ? 'item' : 'itens'} • {itensVenda.reduce((total, item) => total + item.quantidade, 0)} unidades
                              {vendaAtiva && <span className="ml-2 text-green-400 font-medium">• Venda Ativa 🔥</span>}
                              {mostrarProdutos && <span className="ml-2 text-blue-400 font-medium">• Filtro Ativo 📂</span>}
                              {mostrarProdutosSemCodigo && <span className="ml-2 text-yellow-400 font-medium">• Sem Código 📝</span>}
                              {clienteSelecionado && <span className="ml-2 font-medium">• Cliente: {clienteSelecionado.nome}</span>}
                              {obterValorDesconto() > 0 && (
                                <span className="ml-2 text-red-500 font-medium">
                                  • Desconto: {tipoDesconto === 'percentual' ? `${descontoPercentual}%` : `R$ ${descontoTotal.toFixed(2)}`}
                                </span>
                              )}
                            </div>
                            
                            <LoadingButton
                              onClick={imprimirCupom}
                              variant="secondary"
                              size="sm"
                              disabled={itensVenda.length === 0}
                            >
                              🖨️ Cupom
                            </LoadingButton>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* MODAIS MANTIDOS ORIGINAIS (Modal de pagamento e Scanner) */}
          {modalPagamentoAberto && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl transition-colors duration-300 ${
                modoNoturno ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className={`sticky top-0 px-6 py-4 border-b ${
                  modoNoturno ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                      💳 Finalizar Venda
                    </h2>
                    <button
                      onClick={() => setModalPagamentoAberto(false)}
                      className={`text-gray-400 hover:text-gray-600 transition-colors duration-200 ${
                        modoNoturno ? 'hover:text-gray-300' : 'hover:text-gray-600'
                      }`}
                    >
                      <span className="text-2xl">×</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Resumo da Venda */}
                  <div className={`p-4 rounded-lg border mb-6 ${
                    modoNoturno ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <h3 className={`font-bold mb-3 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      📋 Resumo da Venda com Múltiplos Códigos
                    </h3>
                    
                    {clienteSelecionado && (
                      <div className="mb-3 p-2 rounded bg-green-100 border border-green-300">
                        <p className="text-green-800 text-sm font-medium">
                          👤 Cliente: {clienteSelecionado.nome} ({clienteSelecionado.cpfCnpj})
                        </p>
                        <p className="text-green-700 text-xs">
                          Limite de crédito: R$ {clienteSelecionado.limiteCredito.toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={`${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>Itens:</span>
                        <span className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                          {itensVenda.reduce((total, item) => total + item.quantidade, 0)} unidades
                        </span>
                      </div>
                      
                      {/* 🆕 DETALHES DOS CÓDIGOS USADOS */}
                      <div className="text-xs space-y-1">
                        <div className={`${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>Códigos utilizados:</div>
                        {itensVenda.map((item, index) => (
                          <div key={index} className={`ml-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            • {item.produto.nome}: {item.codigoBarrasUsado === 'PRODUTO_AVULSO' ? '📝 Produto Avulso' : item.codigoBarrasUsado || 'Código principal'}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between">
                        <span className={`${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>Subtotal:</span>
                        <span className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                          R$ {calcularSubtotalVenda().toFixed(2)}
                        </span>
                      </div>
                      {obterValorDesconto() > 0 && (
                        <div className="flex justify-between">
                          <span className={`${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                            Desconto ({tipoDesconto === 'percentual' ? `${descontoPercentual}%` : 'valor'}):
                          </span>
                          <span className="font-medium text-red-600">
                            -R$ {obterValorDesconto().toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-300">
                        <span className={`font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>Total:</span>
                        <span className={`font-bold text-lg ${modoNoturno ? 'text-green-400' : 'text-green-600'}`}>
                          R$ {calcularTotalVenda().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Forma de Pagamento */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-3 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      💳 Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setFormaPagamento('dinheiro')}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          formaPagamento === 'dinheiro'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        💵 Dinheiro
                      </button>
                      <button
                        onClick={() => setFormaPagamento('cartao')}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          formaPagamento === 'cartao'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        💳 Cartão
                      </button>
                      <button
                        onClick={() => setFormaPagamento('pix')}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          formaPagamento === 'pix'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : modoNoturno 
                              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        📱 PIX
                      </button>
                      <button
                        onClick={() => setFormaPagamento('prazo')}
                        disabled={!clienteSelecionado}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          formaPagamento === 'prazo'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : !clienteSelecionado
                              ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : modoNoturno 
                                ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        📅 A Prazo
                      </button>
                    </div>
                    {formaPagamento === 'prazo' && !clienteSelecionado && (
                      <p className="text-red-600 text-sm mt-2">
                        ⚠️ Selecione um cliente para venda a prazo
                      </p>
                    )}
                  </div>

                  {/* Valor Pago (apenas para dinheiro) */}
                  {formaPagamento === 'dinheiro' && (
                    <div className="mb-6">
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        💰 Valor Pago (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valorPago}
                        onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                        className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="0.00"
                      />
                      {totaisVenda.troco > 0 && (
                        <p className={`text-sm mt-2 font-medium ${modoNoturno ? 'text-green-400' : 'text-green-600'}`}>
                          💸 Troco: R$ {totaisVenda.troco.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Alerta de limite excedido */}
                  {limiteExcedido && (
                    <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-300">
                      <p className="text-red-800 font-medium">
                        ⚠️ <strong>Limite de crédito excedido!</strong>
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        Total da venda (R$ {calcularTotalVenda().toFixed(2)}) excede o limite do cliente (R$ {clienteSelecionado?.limiteCredito.toFixed(2)})
                      </p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <LoadingButton
                      onClick={finalizarVenda}
                      isLoading={loading}
                      loadingText="Processando..."
                      variant="success"
                      size="lg"
                      className="flex-1"
                      disabled={
                        (formaPagamento === 'dinheiro' && valorPago < calcularTotalVenda()) ||
                        (formaPagamento === 'prazo' && !clienteSelecionado) ||
                        limiteExcedido
                      }
                    >
                      ✅ Confirmar Venda
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => setModalPagamentoAberto(false)}
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                    >
                      ❌ Cancelar
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scanner de Código de Barras */}
          {showScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
              <div className={`rounded-xl shadow-xl w-full max-w-md ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-4 border-b ${modoNoturno ? 'border-gray-600' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>📱 Scanner PDV Pro</h3>
                  <button
                    onClick={pararScanner}
                    className={`hover:${modoNoturno ? 'text-gray-300' : 'text-gray-600'} transition-colors ${modoNoturno ? 'text-gray-400' : 'text-gray-400'}`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 bg-black rounded-lg"
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-green-500 w-48 h-24 rounded-lg animate-pulse">
                        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-500"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-500"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-500"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-500"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <p className={`text-sm mb-4 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                      Sistema com múltiplos códigos ativo - Escaneie qualquer código cadastrado
                    </p>
                    <LoadingButton
                      onClick={simularLeituraCodigoBarras}
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={produtosComCodigoBarras.length === 0}
                    >
                      🎯 Simular Leitura (Teste)
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 INFORMAÇÕES FINAIS ATUALIZADAS */}
          {!loadingProdutos && !loadingClientes && !loadingCategorias && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🚀</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>
                    PDV Pro com Múltiplos Códigos de Barras e Produtos Avulsos
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-green-300' : 'text-green-700'}`}>
                    <p>• <strong>🏷️ Múltiplos códigos:</strong> Sistema reconhece todos os códigos cadastrados por produto</p>
                    <p>• <strong>📝 Produtos avulsos:</strong> F10 para adicionar balas soltas, cigarros avulsos, etc.</p>
                    <p>• <strong>🔍 Busca inteligente:</strong> Encontre produtos por nome ou códigos específicos</p>
                    <p>• <strong>📂 Filtros por categoria:</strong> F5-F9 para acesso rápido às categorias principais</p>
                    <p>• <strong>🎯 Controle granular:</strong> Sistema registra qual código específico foi usado na venda</p>
                    <p>• <strong>📱 Scanner híbrido:</strong> Câmera + leitor físico + busca manual integrados</p>
                    <p>• <strong>👥 Gestão completa:</strong> Clientes, descontos, formas de pagamento e relatórios</p>
                    <p>• <strong>🔥 Venda ativa:</strong> Modo contínuo para escaneamento automático de múltiplos códigos</p>
                    <p>• <strong>🧾 Cupom detalhado:</strong> Impressão com códigos específicos utilizados</p>
                    <p>• <strong>🔄 Integração total:</strong> Dados sincronizados com sistema de produtos e movimentações</p>
                    <p>• <strong>⌨️ Atalhos completos:</strong> F1-F10 para máxima produtividade</p>
                    <p>• <strong>🌙 Modo noturno:</strong> Interface adaptada para diferentes ambientes</p>
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