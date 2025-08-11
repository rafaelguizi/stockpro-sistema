// src/app/relatorios/page.tsx
'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
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
  categoriaId?: string // 🆕 INTEGRAÇÃO COM CATEGORIAS FIRESTORE
  estoqueMinimo: number
  valorCompra: number
  valorVenda: number
  estoque: number
  ativo: boolean
  dataCadastro: string
  userId: string
  // Campos de validade
  temValidade?: boolean
  dataValidade?: string
  diasAlerta?: number
  marca?: string
  modelo?: string
  camposEspecificos?: Record<string, any>
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

// 🆕 COMPONENTE DE GRÁFICO DE PIZZA ATUALIZADO COM CATEGORIAS
interface GraficoPizzaProps {
  dados: { [key: string]: number }
  titulo: string
  cores: string[]
  dadosCategorias?: { [key: string]: { nome: string, icone: string, cor: string } } // 🆕
}

function GraficoPizza({ dados, titulo, cores, dadosCategorias }: GraficoPizzaProps) {
  const total = Object.values(dados).reduce((sum, val) => sum + val, 0)
  if (total === 0) return null

  let anguloAtual = 0
  const raio = 80
  const centroX = 100
  const centroY = 100

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">{titulo}</h4>
      <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-6">
        <svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">
          {Object.entries(dados).map(([categoria, valor], index) => {
            const porcentagem = (valor / total) * 100
            const anguloSegmento = (valor / total) * 2 * Math.PI
            
            const x1 = centroX + raio * Math.cos(anguloAtual)
            const y1 = centroY + raio * Math.sin(anguloAtual)
            
            anguloAtual += anguloSegmento
            
            const x2 = centroX + raio * Math.cos(anguloAtual)
            const y2 = centroY + raio * Math.sin(anguloAtual)
            
            const largeArcFlag = anguloSegmento > Math.PI ? 1 : 0
            
            // 🆕 USAR COR DA CATEGORIA SE DISPONÍVEL
            const dadosCategoria = dadosCategorias?.[categoria]
            const cor = dadosCategoria?.cor || cores[index % cores.length]
            
            return (
              <g key={categoria}>
                <path
                  d={`M ${centroX} ${centroY} L ${x1} ${y1} A ${raio} ${raio} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={cor}
                  className="hover:opacity-80 transition-opacity cursor-pointer transform hover:scale-105"
                  style={{ transformOrigin: `${centroX}px ${centroY}px` }}
                >
                  <title>{categoria}: R$ {valor.toFixed(2)} ({porcentagem.toFixed(1)}%)</title>
                </path>
              </g>
            )
          })}
        </svg>
        
        <div className="flex-1 space-y-2">
          {Object.entries(dados).map(([categoria, valor], index) => {
            const porcentagem = (valor / total) * 100
            const dadosCategoria = dadosCategorias?.[categoria]
            const cor = dadosCategoria?.cor || cores[index % cores.length]
            
            return (
              <div key={categoria} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cor }}
                  ></div>
                  {/* 🆕 ÍCONE DA CATEGORIA */}
                  {dadosCategoria && (
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: cor }}
                    >
                      {dadosCategoria.icone}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">{categoria}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">R$ {valor.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{porcentagem.toFixed(1)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// COMPONENTE DE GRÁFICO DE LINHA MANTIDO ORIGINAL
interface GraficoLinhaProps {
  dados: { dia: string; vendas: number }[]
  titulo: string
  modoNoturno?: boolean
}

function GraficoLinha({ dados, titulo, modoNoturno = false }: GraficoLinhaProps) {
  if (dados.length === 0) return null

  const maxVenda = Math.max(...dados.map(d => d.vendas), 1)
  const altura = 200
  const largura = 400
  const padding = 40

  const pontos = dados.map((dado, index) => {
    const x = padding + (index * (largura - padding * 2)) / (dados.length - 1)
    const y = altura - padding - ((dado.vendas / maxVenda) * (altura - padding * 2))
    return { x, y, ...dado }
  })

  const linha = pontos.map((ponto, index) => 
    `${index === 0 ? 'M' : 'L'} ${ponto.x} ${ponto.y}`
  ).join(' ')

  return (
    <div className={`p-6 rounded-xl shadow-lg ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
      <h4 className={`text-lg font-bold mb-4 text-center ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
        {titulo}
      </h4>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full max-w-md">
          {/* Grid de fundo */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Linha principal */}
          <path
            d={linha}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            className="animate-pulse"
          />
          
          {/* Gradiente */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          
          {/* Pontos */}
          {pontos.map((ponto, index) => (
            <g key={index}>
              <circle
                cx={ponto.x}
                cy={ponto.y}
                r="6"
                fill="#ffffff"
                stroke="#3B82F6"
                strokeWidth="3"
                className="hover:r-8 transition-all cursor-pointer"
              >
                <title>{ponto.dia}: R$ {ponto.vendas.toFixed(2)}</title>
              </circle>
            </g>
          ))}
          
          {/* Labels do eixo X */}
          {pontos.map((ponto, index) => (
            <text
              key={index}
              x={ponto.x}
              y={altura - 10}
              textAnchor="middle"
              className={`text-xs ${modoNoturno ? 'fill-gray-300' : 'fill-gray-600'}`}
            >
              {ponto.dia.split(' ')[1]}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function Relatorios() {
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
  
  // 🆕 HOOKS DO FIRESTORE ATUALIZADOS
  const { 
    data: categorias, 
    loading: loadingCategorias 
  } = useFirestore<CategoriaFirestore>('categorias')
  
  const { 
    data: produtos, 
    loading: loadingProdutos
  } = useFirestore<Produto>('produtos')

  const { 
    data: movimentacoes, 
    loading: loadingMovimentacoes
  } = useFirestore<Movimentacao>('movimentacoes')
  
  const [periodoSelecionado, setPeriodoSelecionado] = useState('30')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroAplicado, setFiltroAplicado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'vendas' | 'validade' | 'estoque' | 'comparativo'>('vendas')
  const [modoNoturno, setModoNoturno] = useState(false)
  const [periodoComparacao, setPeriodoComparacao] = useState('30') // Para aba comparativa
  
  // 🆕 NOVOS FILTROS POR CATEGORIA
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  // Loading geral atualizado
  const isLoadingData = loadingProdutos || loadingMovimentacoes || loadingCategorias

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

  // Atalhos de teclado (MANTIDOS ORIGINAIS)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+1,2,3,4 - Trocar abas
      if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        const abas = ['vendas', 'validade', 'estoque', 'comparativo'] as const
        setAbaAtiva(abas[parseInt(e.key) - 1])
      }
      // Ctrl+E - Exportar
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        if (produtos && movimentacoes) {
          exportarRelatorio('excel')
        }
      }
      // Ctrl+P - Exportar PDF
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        if (produtos && movimentacoes) {
          exportarRelatorio('pdf')
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [produtos, movimentacoes])

  // FUNÇÃO MEMOIZADA PARA VERIFICAR VALIDADE (MANTIDA ORIGINAL)
  const verificarValidade = useCallback((produto: Produto) => {
    if (!produto.temValidade || !produto.dataValidade) return { status: 'sem_validade', diasRestantes: null }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const [ano, mes, dia] = produto.dataValidade.split('-').map(Number)
    const dataValidade = new Date(ano, mes - 1, dia)
    dataValidade.setHours(0, 0, 0, 0)
    
    const diasRestantes = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    const diasAlerta = produto.diasAlerta || 30

    if (diasRestantes < 0) return { status: 'vencido', diasRestantes }
    if (diasRestantes === 0) return { status: 'vence_hoje', diasRestantes }
    if (diasRestantes <= 7) return { status: 'vence_em_7_dias', diasRestantes }
    if (diasRestantes <= diasAlerta) return { status: 'proximo_vencimento', diasRestantes }
    
    return { status: 'valido', diasRestantes }
  }, [])

  // CALCULAR ESTATÍSTICAS DE VALIDADE MEMOIZADAS (MANTIDAS ORIGINAIS)
  const estatisticasValidade = useMemo(() => {
    if (!produtos) return {
      vencidos: [],
      vencendoHoje: [],
      vencendoEm7Dias: [],
      proximoVencimento: [],
      validos: [],
      semValidade: [],
      totalComValidade: 0,
      valorPerdido: 0
    }

    const vencidos: Produto[] = []
    const vencendoHoje: Produto[] = []
    const vencendoEm7Dias: Produto[] = []
    const proximoVencimento: Produto[] = []
    const validos: Produto[] = []
    const semValidade: Produto[] = []

    produtos.forEach(produto => {
      if (!produto.ativo) return

      const validadeInfo = verificarValidade(produto)
      
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
          proximoVencimento.push(produto)
          break
        case 'valido':
          validos.push(produto)
          break
        default:
          semValidade.push(produto)
      }
    })

    const valorPerdido = vencidos.reduce((total, produto) => {
      return total + (produto.estoque * produto.valorCompra)
    }, 0)

    return {
      vencidos,
      vencendoHoje,
      vencendoEm7Dias,
      proximoVencimento,
      validos,
      semValidade,
      totalComValidade: produtos.filter(p => p.temValidade && p.ativo).length,
      valorPerdido
    }
  }, [produtos, verificarValidade])

  // Aplicar filtro personalizado (MANTIDO ORIGINAL)
  const aplicarFiltroPersonalizado = useCallback(async () => {
    if (!dataInicio || !dataFim) {
      toast.warning('Datas obrigatórias', 'Selecione as datas de início e fim!')
      return
    }

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const inicio = new Date(dataInicio)
      const fim = new Date(dataFim)

      if (inicio > fim) {
        toast.error('Período inválido', 'Data de início deve ser anterior à data de fim!')
        return
      }

      if (inicio > new Date()) {
        toast.warning('Data futura', 'Data de início não pode ser no futuro!')
        return
      }

      const diffTime = Math.abs(fim.getTime() - inicio.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays > 365) {
        toast.warning('Período muito longo', 'Período máximo de 1 ano para melhor performance!')
        return
      }

      setFiltroAplicado(true)
      toast.success('Filtro aplicado!', `Analisando período de ${diffDays + 1} dias`)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim, toast])

  // Limpar filtro personalizado (MANTIDO ORIGINAL)
  const limparFiltroPersonalizado = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 400))
      
      setDataInicio('')
      setDataFim('')
      setFiltroAplicado(false)
      setPeriodoSelecionado('30')
      setCategoriaFiltro('') // 🆕 LIMPAR CATEGORIA TAMBÉM
      toast.info('Filtros limpos', 'Voltando para os últimos 30 dias')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Atualizar período (MANTIDO ORIGINAL)
  const atualizarPeriodo = useCallback(async (novoPeriodo: string) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      
      setPeriodoSelecionado(novoPeriodo)
      if (novoPeriodo !== 'personalizado') {
        setFiltroAplicado(false)
        setDataInicio('')
        setDataFim('')
      }
      
      toast.success('Período atualizado!', `Analisando ${novoPeriodo === 'personalizado' ? 'período personalizado' : `últimos ${novoPeriodo} dias`}`)
    } finally {
      setLoading(false)
    }
  }, [toast])

  // 🆕 CALCULAR ESTATÍSTICAS MEMOIZADAS COM FILTRO DE CATEGORIA
  const estatisticas = useMemo(() => {
    if (!movimentacoes || !produtos) {
      return {
        totalVendas: 0,
        totalCompras: 0,
        lucroReal: 0,
        quantidadeVendida: 0,
        rankingProdutos: [],
        vendasPorCategoria: {},
        dadosCategorias: {}, // 🆕 DADOS DAS CATEGORIAS PARA GRÁFICOS
        numeroVendas: 0,
        periodoTexto: 'Carregando...'
      }
    }

    const agora = new Date()
    let dataInicial: Date
    let dataFinal: Date = agora

    // Determinar período baseado na seleção
    if (periodoSelecionado === 'personalizado' && dataInicio && dataFim && filtroAplicado) {
      const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-').map(Number)
      const [anoFim, mesFim, diaFim] = dataFim.split('-').map(Number)
      
      dataInicial = new Date(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0)
      dataFinal = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999)
    } else {
      const diasAtras = new Date()
      diasAtras.setDate(agora.getDate() - parseInt(periodoSelecionado))
      dataInicial = diasAtras
    }

    // Filtrar movimentações do período
    const movimentacoesPeriodo = movimentacoes.filter(mov => {
      const [dia, mes, ano] = mov.data.split('/')
      const dataMovimentacao = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
      
      // Filtro de período
      const dentroPeríodo = dataMovimentacao >= dataInicial && dataMovimentacao <= dataFinal
      
      // 🆕 FILTRO DE CATEGORIA
      if (categoriaFiltro && dentroPeríodo) {
        const produto = produtos.find(p => p.id === mov.produtoId)
        if (!produto) return false
        
        if (categoriaFiltro === 'sem_categoria') {
          return !produto.categoriaId
        } else {
          return produto.categoriaId === categoriaFiltro
        }
      }
      
      return dentroPeríodo
    })

    // Vendas do período
    const vendas = movimentacoesPeriodo.filter(mov => mov.tipo === 'saida')
    const totalVendas = vendas.reduce((total, mov) => total + mov.valorTotal, 0)
    const quantidadeVendida = vendas.reduce((total, mov) => total + mov.quantidade, 0)

    // Compras do período
    const compras = movimentacoesPeriodo.filter(mov => mov.tipo === 'entrada')
    const totalCompras = compras.reduce((total, mov) => total + mov.valorTotal, 0)

    // Cálculo do lucro real
    const lucroReal = vendas.reduce((totalLucro, venda) => {
      const produto = produtos.find(p => p.codigo === venda.codigo)
      if (produto) {
        const lucroVenda = (venda.valorUnitario - produto.valorCompra) * venda.quantidade
        return totalLucro + lucroVenda
      }
      return totalLucro
    }, 0)

    // Produtos mais vendidos
    const produtosVendidos: { [key: string]: { nome: string, quantidade: number, valor: number } } = {}
    
    vendas.forEach(venda => {
      if (produtosVendidos[venda.codigo]) {
        produtosVendidos[venda.codigo].quantidade += venda.quantidade
        produtosVendidos[venda.codigo].valor += venda.valorTotal
      } else {
        produtosVendidos[venda.codigo] = {
          nome: venda.produto,
          quantidade: venda.quantidade,
          valor: venda.valorTotal
        }
      }
    })

    const rankingProdutos = Object.entries(produtosVendidos)
      .map(([codigo, dados]) => ({ codigo, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10) // Top 10

    // 🆕 VENDAS POR CATEGORIA COM DADOS VISUAIS
    const vendasPorCategoria: { [key: string]: number } = {}
    const dadosCategorias: { [key: string]: { nome: string, icone: string, cor: string } } = {}
    
    vendas.forEach(venda => {
      const produto = produtos.find(p => p.codigo === venda.codigo)
      if (produto) {
        const dadosCategoria = obterDadosCategoria(produto)
        const nomeCategoria = dadosCategoria.nome
        
        vendasPorCategoria[nomeCategoria] = (vendasPorCategoria[nomeCategoria] || 0) + venda.valorTotal
        
        // Armazenar dados da categoria para gráficos
        if (!dadosCategorias[nomeCategoria]) {
          dadosCategorias[nomeCategoria] = {
            nome: dadosCategoria.nome,
            icone: dadosCategoria.icone,
            cor: dadosCategoria.cor
          }
        }
      }
    })

    // Formatar o texto do período
    let periodoTexto: string
    if (periodoSelecionado === 'personalizado' && filtroAplicado) {
      const dataInicioFormatada = new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')
      const dataFimFormatada = new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')
      periodoTexto = `${dataInicioFormatada} até ${dataFimFormatada}`
    } else {
      periodoTexto = `Últimos ${periodoSelecionado} dias`
    }

    // 🆕 ADICIONAR FILTRO DE CATEGORIA AO TEXTO
    if (categoriaFiltro) {
      const categoria = categorias?.find(c => c.id === categoriaFiltro)
      if (categoria) {
        periodoTexto += ` • Categoria: ${categoria.icone} ${categoria.nome}`
      } else if (categoriaFiltro === 'sem_categoria') {
        periodoTexto += ` • Categoria: 📦 Sem categoria`
      }
    }

    return {
      totalVendas,
      totalCompras,
      lucroReal,
      quantidadeVendida,
      rankingProdutos,
      vendasPorCategoria,
      dadosCategorias, // 🆕 DADOS DAS CATEGORIAS
      numeroVendas: vendas.length,
      periodoTexto
    }
  }, [movimentacoes, produtos, periodoSelecionado, dataInicio, dataFim, filtroAplicado, categoriaFiltro, categorias, obterDadosCategoria])

  // GERAR DADOS DE VENDAS DIÁRIAS MEMOIZADOS (MANTIDO ORIGINAL)
  const dadosVendasDiarias = useMemo(() => {
    if (!movimentacoes) return []

    const dados = []
    const hoje = new Date()
    
    for (let i = 14; i >= 0; i--) { // Últimos 15 dias
      const data = new Date()
      data.setDate(hoje.getDate() - i)
      const dataStr = data.toLocaleDateString('pt-BR')
      
      const vendasDia = movimentacoes
        .filter(mov => mov.tipo === 'saida' && mov.data === dataStr)
        .reduce((total, mov) => total + mov.valorTotal, 0)
      
      dados.push({
        dia: data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        vendas: vendasDia
      })
    }
    
    return dados
  }, [movimentacoes])

  // CORES PARA GRÁFICOS (MANTIDAS ORIGINAIS)
  const coresPizza = [
    '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#6366F1', '#84CC16', '#F97316'
  ]

  // FUNÇÃO DE EXPORTAÇÃO OTIMIZADA (MANTIDA ORIGINAL COM PEQUENOS AJUSTES)
  const exportarRelatorio = useCallback(async (formato: 'pdf' | 'excel') => {
    if (!produtos || !movimentacoes) {
      toast.error('Dados não carregados', 'Aguarde o carregamento dos dados!')
      return
    }

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Preparar dados do relatório
      const dadosRelatorio = {
        titulo: 'Relatório Completo - StockPro Pro',
        periodo: estatisticas.periodoTexto,
        dataGeracao: new Date().toLocaleDateString('pt-BR'),
        resumo: {
          totalVendas: estatisticas.totalVendas,
          totalCompras: estatisticas.totalCompras,
          lucroReal: estatisticas.lucroReal,
          quantidadeVendida: estatisticas.quantidadeVendida,
          numeroVendas: estatisticas.numeroVendas,
          margemLucro: estatisticas.totalVendas > 0 ? ((estatisticas.lucroReal / estatisticas.totalVendas) * 100).toFixed(2) : '0.00'
        },
        estatisticas: {
          produtosCadastrados: produtos.length,
          produtosAtivos: produtos.filter(p => p.ativo).length,
          totalMovimentacoes: movimentacoes.length,
          valorEstoque: produtos.filter(p => p.ativo).reduce((total, produto) => {
            return total + (produto.estoque * produto.valorCompra)
          }, 0)
        },
        validade: {
          totalComValidade: estatisticasValidade.totalComValidade,
          vencidos: estatisticasValidade.vencidos.length,
          vencendoHoje: estatisticasValidade.vencendoHoje.length,
          vencendoEm7Dias: estatisticasValidade.vencendoEm7Dias.length,
          proximoVencimento: estatisticasValidade.proximoVencimento.length,
          valorPerdido: estatisticasValidade.valorPerdido,
          produtosVencidos: estatisticasValidade.vencidos.map(p => ({
            nome: p.nome,
            codigo: p.codigo,
            categoria: obterDadosCategoria(p).nome, // 🆕 USAR DADOS DA CATEGORIA
            estoque: p.estoque,
            dataValidade: p.dataValidade ? new Date(p.dataValidade).toLocaleDateString('pt-BR') : 'N/A',
            valorPerdido: p.estoque * p.valorCompra
          }))
        },
        topProdutos: estatisticas.rankingProdutos,
        vendasPorCategoria: estatisticas.vendasPorCategoria,
        dadosCategorias: estatisticas.dadosCategorias // 🆕 DADOS DAS CATEGORIAS
      }

      if (formato === 'pdf') {
        // HTML melhorado para PDF (MANTIDO ORIGINAL - muito extenso, mantenho a lógica)
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório Completo StockPro Pro</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
              }
              .container { 
                background: white; 
                max-width: 1200px; 
                margin: 0 auto; 
                border-radius: 15px; 
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center; 
                padding: 40px; 
                position: relative;
              }
              .header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #f093fb 0%, #f5576c 50%, #4facfe 100%);
              }
              .title { 
                font-size: 32px; 
                font-weight: 700; 
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              }
              .subtitle { 
                font-size: 18px; 
                opacity: 0.9; 
                margin: 5px 0;
              }
              .section { 
                margin: 40px; 
                page-break-inside: avoid; 
              }
              .section-title { 
                color: #2D3748; 
                font-size: 24px; 
                font-weight: 700; 
                border-bottom: 3px solid #4299E1; 
                padding-bottom: 10px; 
                margin-bottom: 25px;
                position: relative;
              }
              .section-title::after {
                content: '';
                position: absolute;
                bottom: -3px;
                left: 0;
                width: 50px;
                height: 3px;
                background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
              }
              .grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                gap: 20px; 
                margin: 25px 0; 
              }
              .card { 
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 1px solid #e2e8f0; 
                border-radius: 12px; 
                padding: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.07);
                transition: transform 0.2s;
              }
              .card:hover { transform: translateY(-2px); }
              .card-title { 
                font-size: 12px; 
                color: #718096; 
                text-transform: uppercase; 
                font-weight: 600;
                letter-spacing: 0.5px;
                margin-bottom: 8px; 
              }
              .card-value { 
                font-size: 28px; 
                font-weight: 800; 
                color: #2D3748; 
                margin: 8px 0; 
              }
              .card-subtitle { 
                font-size: 12px; 
                color: #a0aec0; 
                font-weight: 500;
              }
              .table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.07);
              }
              .table th, .table td { 
                border: 1px solid #e2e8f0; 
                padding: 12px; 
                text-align: left; 
              }
              .table th { 
                background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                color: white;
                font-weight: 600; 
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
              }
              .table tr:nth-child(even) { 
                background: #f7fafc; 
              }
              .table tr:hover { 
                background: #edf2f7; 
              }
              .footer { 
                text-align: center; 
                margin-top: 50px; 
                padding: 30px; 
                background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                color: #4a5568; 
                font-size: 12px;
                border-top: 1px solid #e2e8f0;
              }
              .positive { color: #38a169; font-weight: 600; }
              .negative { color: #e53e3e; font-weight: 600; }
              .warning { color: #d69e2e; font-weight: 600; }
              .critical { color: #e53e3e; font-weight: 700; }
              .alert-box { 
                background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
                border: 2px solid #fc8181; 
                border-radius: 12px; 
                padding: 20px; 
                margin: 20px 0;
                box-shadow: 0 4px 6px rgba(0,0,0,0.07);
              }
              .highlight { 
                background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #38b2ac;
                margin: 15px 0;
              }
              @media print { 
                body { margin: 0; background: white; } 
                .container { box-shadow: none; }
                .section { page-break-inside: avoid; } 
                .card:hover { transform: none; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="title">📊 StockPro - Relatório Executivo</h1>
                <p class="subtitle">Análise Completa de Performance com Categorias</p>
                <p class="subtitle">Período: ${dadosRelatorio.periodo}</p>
                <p class="subtitle">Gerado em: ${dadosRelatorio.dataGeracao}</p>
              </div>

              ${(dadosRelatorio.validade.vencidos > 0 || dadosRelatorio.validade.vencendoHoje > 0) ? `
              <div class="section">
                <div class="alert-box">
                  <h2 class="critical" style="font-size: 20px; margin-bottom: 15px;">🚨 ALERTAS CRÍTICOS DE VALIDADE</h2>
                  <ul style="list-style: none; padding: 0;">
                    ${dadosRelatorio.validade.vencidos > 0 ? `<li style="margin: 8px 0;" class="critical">❌ ${dadosRelatorio.validade.vencidos} produto(s) VENCIDO(S)</li>` : ''}
                    ${dadosRelatorio.validade.vencendoHoje > 0 ? `<li style="margin: 8px 0;" class="critical">⏰ ${dadosRelatorio.validade.vencendoHoje} produto(s) vencendo HOJE</li>` : ''}
                    ${dadosRelatorio.validade.valorPerdido > 0 ? `<li style="margin: 8px 0;" class="negative">💸 Valor perdido: R$ ${dadosRelatorio.validade.valorPerdido.toFixed(2)}</li>` : ''}
                  </ul>
                </div>
              </div>
              ` : ''}

              <div class="section">
                <h2 class="section-title">💰 Performance Financeira</h2>
                <div class="grid">
                  <div class="card">
                    <p class="card-title">💵 Faturamento Total</p>
                    <p class="card-value positive">R$ ${dadosRelatorio.resumo.totalVendas.toFixed(2)}</p>
                    <p class="card-subtitle">${dadosRelatorio.resumo.numeroVendas} transações realizadas</p>
                  </div>
                  <div class="card">
                    <p class="card-title">🛒 Investimento em Compras</p>
                    <p class="card-value">R$ ${dadosRelatorio.resumo.totalCompras.toFixed(2)}</p>
                    <p class="card-subtitle">Capital investido no período</p>
                  </div>
                  <div class="card">
                    <p class="card-title">📈 Lucro Líquido</p>
                    <p class="card-value ${dadosRelatorio.resumo.lucroReal >= 0 ? 'positive' : 'negative'}">R$ ${dadosRelatorio.resumo.lucroReal.toFixed(2)}</p>
                    <p class="card-subtitle">${dadosRelatorio.resumo.margemLucro}% de margem</p>
                  </div>
                  <div class="card">
                    <p class="card-title">🏦 Patrimônio em Estoque</p>
                    <p class="card-value">R$ ${dadosRelatorio.estatisticas.valorEstoque.toFixed(2)}</p>
                    <p class="card-subtitle">Valor total investido</p>
                  </div>
                </div>
                
                <div class="highlight">
                  <h3 style="color: #2d3748; margin-bottom: 10px;">🎯 Indicadores de Performance</h3>
                  <p><strong>ROI (Retorno sobre Investimento):</strong> ${dadosRelatorio.resumo.totalCompras > 0 ? ((dadosRelatorio.resumo.lucroReal / dadosRelatorio.resumo.totalCompras) * 100).toFixed(2) : '0.00'}%</p>
                  <p><strong>Ticket Médio:</strong> R$ ${dadosRelatorio.resumo.numeroVendas > 0 ? (dadosRelatorio.resumo.totalVendas / dadosRelatorio.resumo.numeroVendas).toFixed(2) : '0.00'}</p>
                  <p><strong>Giro de Estoque:</strong> ${dadosRelatorio.estatisticas.valorEstoque > 0 ? (dadosRelatorio.resumo.totalVendas / dadosRelatorio.estatisticas.valorEstoque).toFixed(2) : '0.00'}x</p>
                </div>
              </div>

              ${Object.keys(dadosRelatorio.vendasPorCategoria).length > 0 ? `
              <div class="section">
                <h2 class="section-title">📂 Análise por Categoria de Produtos</h2>
                <table class="table">
                  <thead>
                    <tr>
                      <th>📂 Categoria</th>
                      <th>💰 Faturamento</th>
                      <th>📊 Participação</th>
                      <th>📈 Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(dadosRelatorio.vendasPorCategoria)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([categoria, valor], index) => {
                        const participacao = ((valor as number) / dadosRelatorio.resumo.totalVendas * 100).toFixed(1)
                        const performance = index === 0 ? '🚀 Líder' : index === 1 ? '⭐ Forte' : participacao > '10' ? '✅ Boa' : '📊 Moderada'
                        const dadosCategoria = dadosRelatorio.dadosCategorias[categoria]
                        return `
                          <tr>
                            <td style="font-weight: 600;">${dadosCategoria ? dadosCategoria.icone : '📦'} ${categoria}</td>
                            <td class="positive">R$ ${(valor as number).toFixed(2)}</td>
                            <td>${participacao}%</td>
                            <td>${performance}</td>
                          </tr>
                        `
                      }).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}

              <div class="footer">
                <h3 style="color: #2d3748; margin-bottom: 15px;">📊 Resumo Executivo</h3>
                <p style="margin-bottom: 10px;"><strong>Relatório gerado automaticamente pelo StockPro Pro</strong></p>
                <p style="margin-bottom: 10px;">Sistema Inteligente de Gestão e Controle de Validade</p>
                <p style="margin-bottom: 10px;">© ${new Date().getFullYear()} - Tecnologia Avançada para Gestão Eficiente</p>
                <p style="color: #718096;">Inclui análises preditivas, alertas inteligentes e monitoramento em tempo real</p>
              </div>
            </div>
          </body>
          </html>
        `

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio-executivo-stockpro-${new Date().toISOString().split('T')[0]}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success(
          '📄 PDF exportado!', 
          'Arquivo HTML gerado - abra no navegador e imprima como PDF'
        )
      } else {
        // CSV melhorado para Excel (MANTIDO ORIGINAL COM PEQUENOS AJUSTES)
        let csvContent = '\uFEFF' // BOM para UTF-8
        
        csvContent += `StockPro Pro - Relatório Executivo Completo\n`
        csvContent += `Data de Geração,${dadosRelatorio.dataGeracao}\n`
        csvContent += `Período Analisado,${dadosRelatorio.periodo}\n`
        csvContent += `Sistema,StockPro Pro v2.0 com IA e Categorias\n\n`
        
        csvContent += `PERFORMANCE FINANCEIRA - INDICADORES CHAVE\n`
        csvContent += `Métrica,Valor,Observação\n`
        csvContent += `Faturamento Total,R$ ${dadosRelatorio.resumo.totalVendas.toFixed(2)},Receita bruta do período\n`
        csvContent += `Investimento em Compras,R$ ${dadosRelatorio.resumo.totalCompras.toFixed(2)},Capital aplicado\n`
        csvContent += `Lucro Líquido,R$ ${dadosRelatorio.resumo.lucroReal.toFixed(2)},Resultado líquido\n`
        csvContent += `Margem de Lucro,${dadosRelatorio.resumo.margemLucro}%,Percentual de rentabilidade\n`
        csvContent += `ROI (Retorno sobre Investimento),${dadosRelatorio.resumo.totalCompras > 0 ? ((dadosRelatorio.resumo.lucroReal / dadosRelatorio.resumo.totalCompras) * 100).toFixed(2) : '0.00'}%,Eficiência do investimento\n`
        csvContent += `Ticket Médio,R$ ${dadosRelatorio.resumo.numeroVendas > 0 ? (dadosRelatorio.resumo.totalVendas / dadosRelatorio.resumo.numeroVendas).toFixed(2) : '0.00'},Valor médio por venda\n`
        csvContent += `Volume de Vendas,${dadosRelatorio.resumo.quantidadeVendida} unidades,Quantidade total vendida\n`
        csvContent += `Número de Transações,${dadosRelatorio.resumo.numeroVendas},Total de vendas realizadas\n`
        csvContent += `Patrimônio em Estoque,R$ ${dadosRelatorio.estatisticas.valorEstoque.toFixed(2)},Valor total investido\n`
        csvContent += `Giro de Estoque,${dadosRelatorio.estatisticas.valorEstoque > 0 ? (dadosRelatorio.resumo.totalVendas / dadosRelatorio.estatisticas.valorEstoque).toFixed(2) : '0.00'}x,Eficiência do estoque\n\n`
        
        if (Object.keys(dadosRelatorio.vendasPorCategoria).length > 0) {
          csvContent += `ANÁLISE POR CATEGORIA DE PRODUTOS\n`
          csvContent += `Categoria,Ícone,Faturamento,Participação %,Performance,Classificação\n`
          Object.entries(dadosRelatorio.vendasPorCategoria)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .forEach(([categoria, valor], index) => {
              const participacao = ((valor as number) / dadosRelatorio.resumo.totalVendas * 100).toFixed(1)
              const performance = index === 0 ? '🚀 LÍDER' : index === 1 ? '⭐ FORTE' : participacao > '10' ? '✅ BOA' : '📊 MODERADA'
              const dadosCategoria = dadosRelatorio.dadosCategorias[categoria]
              csvContent += `${categoria},${dadosCategoria ? dadosCategoria.icone : '📦'},R$ ${(valor as number).toFixed(2)},${participacao}%,${performance},${index + 1}º lugar\n`
            })
          csvContent += `\n`
        }
        
        csvContent += `INFORMAÇÕES DO SISTEMA\n`
        csvContent += `Campo,Valor\n`
        csvContent += `Sistema,StockPro Pro\n`
        csvContent += `Versão,2.0 - IA e Controle de Validade com Categorias\n`
        csvContent += `Tecnologia,React + TypeScript + Firebase\n`
        csvContent += `Recursos,Análise Preditiva + Alertas Inteligentes + Categorias Visuais\n`
        csvContent += `Data/Hora de Geração,${new Date().toLocaleString('pt-BR')}\n`
        csvContent += `Usuário,${user?.email || 'Sistema'}\n`
        csvContent += `Status,✅ Relatório Completo Gerado com Sucesso\n`
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio-executivo-stockpro-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success(
          '📊 Excel exportado!', 
          'Arquivo CSV avançado gerado - abra no Excel para análises detalhadas'
        )
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error(
        'Erro na exportação', 
        `Não foi possível gerar o relatório em ${formato.toUpperCase()}`
      )
    } finally {
      setLoading(false)
    }
  }, [produtos, movimentacoes, estatisticas, estatisticasValidade, toast, user, obterDadosCategoria])

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="Relatórios e Análises" 
          currentPage="/relatorios" 
          userEmail={user?.email || undefined}
        />

        <main className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed 
           ? 'lg:ml-16 lg:mr-4' 
           : 'max-w-7xl mx-auto lg:ml-64'
        }`}>
          
          {/* Loading de carregamento inicial - ATUALIZADO */}
          {isLoadingData && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-blue-600 text-2xl">📊</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando relatórios...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Processando análises avançadas com categorias</p>
              </div>
            </div>
          )}

          {/* Header principal (MANTIDO ORIGINAL) */}
          {!isLoadingData && (
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                  📊 Relatórios e Análises
                </h1>
                <p className={`text-sm mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ctrl+1-4 para abas • Ctrl+E para Excel • Ctrl+P para PDF
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
              </div>
            </div>
          )}

          {/* ALERTAS CRÍTICOS DE VALIDADE (MANTIDOS ORIGINAIS) */}
          {!isLoadingData && (estatisticasValidade.vencidos.length > 0 || estatisticasValidade.vencendoHoje.length > 0) && (
            <div className={`border-l-4 border-red-400 p-4 mb-6 animate-pulse ${modoNoturno ? 'bg-red-900 border-red-600' : 'bg-red-50'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-red-200' : 'text-red-800'}`}>
                    Alertas Críticos de Validade Detectados!
                  </h3>
                  <div className={`mt-2 text-sm ${modoNoturno ? 'text-red-300' : 'text-red-700'}`}>
                    <ul className="list-disc list-inside space-y-1">
                      {estatisticasValidade.vencidos.length > 0 && (
                        <li><strong>{estatisticasValidade.vencidos.length} produto(s) VENCIDO(S)</strong> - Valor perdido: R$ {estatisticasValidade.valorPerdido.toFixed(2)}</li>
                      )}
                      {estatisticasValidade.vencendoHoje.length > 0 && (
                        <li><strong>{estatisticasValidade.vencendoHoje.length} produto(s) vencendo HOJE</strong></li>
                      )}
                    </ul>
                    <button
                      onClick={() => setAbaAtiva('validade')}
                      className={`mt-2 underline hover:no-underline font-medium transition-colors ${
                        modoNoturno ? 'text-red-200 hover:text-red-100' : 'text-red-800 hover:text-red-900'
                      }`}
                    >
                      Ver relatório detalhado de validade →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* NAVEGAÇÃO POR ABAS COM CONTADOR DE ALERTAS (MANTIDA ORIGINAL) */}
          {!isLoadingData && (
            <div className={`mb-6 rounded-xl shadow-lg overflow-hidden ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`border-b ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setAbaAtiva('vendas')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                      abaAtiva === 'vendas'
                        ? `border-blue-500 ${modoNoturno ? 'text-blue-400 bg-blue-900' : 'text-blue-600 bg-blue-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    💰 Vendas e Financeiro
                  </button>
                  <button
                    onClick={() => setAbaAtiva('validade')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 relative ${
                      abaAtiva === 'validade'
                        ? `border-orange-500 ${modoNoturno ? 'text-orange-400 bg-orange-900' : 'text-orange-600 bg-orange-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    📅 Controle de Validade
                    {(estatisticasValidade.vencidos.length + estatisticasValidade.vencendoHoje.length) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                        {estatisticasValidade.vencidos.length + estatisticasValidade.vencendoHoje.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setAbaAtiva('estoque')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                      abaAtiva === 'estoque'
                        ? `border-green-500 ${modoNoturno ? 'text-green-400 bg-green-900' : 'text-green-600 bg-green-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    📦 Análise de Estoque
                  </button>
                  <button
                    onClick={() => setAbaAtiva('comparativo')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                      abaAtiva === 'comparativo'
                        ? `border-purple-500 ${modoNoturno ? 'text-purple-400 bg-purple-900' : 'text-purple-600 bg-purple-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    📈 Análise Comparativa
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* 🆕 FILTRO DE PERÍODO ATUALIZADO COM CATEGORIA */}
          {!isLoadingData && abaAtiva === 'vendas' && (
            <div className={`mb-6 p-6 rounded-xl shadow-lg transition-colors duration-300 ${
              modoNoturno ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="space-y-4">
                <div className="flex flex-col space-y-4">
                  <label className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📅 Período de Análise:
                  </label>
                  
                  {/* Grid de filtros */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Período
                      </label>
                      <select
                        value={periodoSelecionado}
                        onChange={(e) => atualizarPeriodo(e.target.value)}
                        disabled={loading}
                        className={`w-full border-2 rounded-lg px-4 py-3 text-base font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm disabled:opacity-60 transition-all duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-600 bg-white text-gray-900'
                        }`}
                      >
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                        <option value="365">Último ano</option>
                        <option value="personalizado">📅 Personalizado</option>
                      </select>
                    </div>

                    {/* 🆕 FILTRO POR CATEGORIA */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Categoria
                      </label>
                      <select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        disabled={loading}
                        className={`w-full border-2 rounded-lg px-4 py-3 text-base font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm disabled:opacity-60 transition-all duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-600 bg-white text-gray-900'
                        }`}
                      >
                        <option value="">📂 Todas as categorias</option>
                        <option value="sem_categoria">📦 Sem categoria</option>
                        {categoriasParaFiltro.map(categoria => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.icone} {categoria.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Loading indicator para período */}
                  {loading && (
                    <div className="flex items-center space-x-2 text-purple-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                      <span className="text-sm font-medium">Atualizando dados...</span>
                    </div>
                  )}
                  
                  {/* Campos de data personalizados */}
                  {periodoSelecionado === 'personalizado' && (
                    <div className={`p-4 rounded-lg border-2 shadow-md space-y-4 ${
                      modoNoturno 
                        ? 'bg-purple-900 border-purple-600' 
                        : 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-400'
                    }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${
                            modoNoturno ? 'text-purple-200' : 'text-purple-900'
                          }`}>
                            📅 Data Início:
                          </label>
                          <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={loading}
                            className={`w-full border-2 rounded-md px-3 py-2 text-base font-bold focus:ring-2 focus:ring-purple-300 shadow-sm disabled:opacity-60 transition-all duration-200 ${
                              modoNoturno 
                                ? 'border-purple-500 bg-gray-700 text-white focus:border-purple-400' 
                                : 'border-purple-600 bg-white text-gray-900 focus:border-purple-700'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-bold mb-2 ${
                            modoNoturno ? 'text-purple-200' : 'text-purple-900'
                          }`}>
                            📅 Data Fim:
                          </label>
                          <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            min={dataInicio}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={loading}
                            className={`w-full border-2 rounded-md px-3 py-2 text-base font-bold focus:ring-2 focus:ring-purple-300 shadow-sm disabled:opacity-60 transition-all duration-200 ${
                              modoNoturno 
                                ? 'border-purple-500 bg-gray-700 text-white focus:border-purple-400' 
                                : 'border-purple-600 bg-white text-gray-900 focus:border-purple-700'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <LoadingButton
                          onClick={aplicarFiltroPersonalizado}
                          isLoading={loading}
                          loadingText="Aplicando..."
                          disabled={!dataInicio || !dataFim}
                          variant="primary"
                          size="md"
                          className="flex-1"
                        >
                          🔍 Aplicar Filtro
                        </LoadingButton>
                        {filtroAplicado && (
                          <LoadingButton
                            onClick={limparFiltroPersonalizado}
                            isLoading={loading}
                            loadingText="Limpando..."
                            variant="secondary"
                            size="md"
                            className="flex-1"
                          >
                            🧹 Limpar Filtro
                          </LoadingButton>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  <div className={`text-base px-4 py-2 rounded-lg font-medium border ${
                    modoNoturno 
                      ? 'text-gray-300 bg-gray-700 border-gray-600' 
                      : 'text-gray-800 bg-gray-200 border-gray-300'
                  }`}>
                    📊 {movimentacoes?.length || 0} movimentações registradas
                    {periodoSelecionado === 'personalizado' && filtroAplicado && (
                      <div className={`text-sm mt-1 ${
                        modoNoturno ? 'text-purple-400' : 'text-purple-600'
                      }`}>
                        📅 {estatisticas.periodoTexto}
                      </div>
                    )}
                    {/* 🆕 MOSTRAR FILTRO DE CATEGORIA ATIVO */}
                    {categoriaFiltro && (
                      <div className={`text-sm mt-1 ${
                        modoNoturno ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        📂 Filtro: {categoriaFiltro === 'sem_categoria' 
                          ? '📦 Sem categoria' 
                          : categorias?.find(c => c.id === categoriaFiltro)?.icone + ' ' + categorias?.find(c => c.id === categoriaFiltro)?.nome
                        }
                      </div>
                    )}
                  </div>
                  
                  {/* Botões de exportação */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                    <LoadingButton
                      onClick={() => exportarRelatorio('pdf')}
                      isLoading={loading}
                      loadingText="Gerando PDF..."
                      variant="danger"
                      size="md"
                      className="flex-1 sm:flex-none"
                      disabled={!produtos || !movimentacoes}
                    >
                      📄 Exportar PDF (Ctrl+P)
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => exportarRelatorio('excel')}
                      isLoading={loading}
                      loadingText="Gerando Excel..."
                      variant="success"
                      size="md"
                      className="flex-1 sm:flex-none"
                      disabled={!produtos || !movimentacoes}
                    >
                      📄 Exportar Excel (Ctrl+E)
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA DE VENDAS (MANTIDO ORIGINAL COM PEQUENOS AJUSTES) */}
          {!isLoadingData && abaAtiva === 'vendas' && produtos && movimentacoes && (
            <>
              {/* Cards de Resumo Financeiro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                
                {/* Total de Vendas */}
                <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-green-100 text-sm">Faturamento Total</p>
                      <p className="text-2xl font-bold">R$ {estatisticas.totalVendas.toFixed(2)}</p>
                      <p className="text-green-100 text-xs">{estatisticas.numeroVendas} transações</p>
                    </div>
                    <div className="text-3xl ml-2">💰</div>
                  </div>
                </div>

                {/* Total de Compras */}
                <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-blue-100 text-sm">Investimento</p>
                      <p className="text-2xl font-bold">R$ {estatisticas.totalCompras.toFixed(2)}</p>
                      <p className="text-blue-100 text-xs">Capital aplicado</p>
                    </div>
                    <div className="text-3xl ml-2">🛒</div>
                  </div>
                </div>

                {/* Valor do Estoque */}
                <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-indigo-100 text-sm">Patrimônio</p>
                      <p className="text-2xl font-bold">R$ {(() => {
                        const valorEstoque = produtos.filter(p => p.ativo).reduce((total, produto) => {
                          return total + (produto.estoque * produto.valorCompra)
                        }, 0)
                        return valorEstoque.toFixed(2)
                      })()}</p>
                      <p className="text-indigo-100 text-xs">Valor em estoque</p>
                    </div>
                    <div className="text-3xl ml-2">🏦</div>
                  </div>
                </div>

                {/* Lucro Real */}
                {estatisticas.totalVendas > 0 ? (
                  <div className={`bg-gradient-to-r ${estatisticas.lucroReal >= 0 ? 'from-purple-400 to-purple-600' : 'from-red-400 to-red-600'} p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-purple-100 text-sm">Lucro Líquido</p>
                        <p className="text-2xl font-bold">R$ {estatisticas.lucroReal.toFixed(2)}</p>
                        <p className="text-purple-100 text-xs">
                          {estatisticas.totalVendas > 0 ? ((estatisticas.lucroReal / estatisticas.totalVendas) * 100).toFixed(1) : '0.0'}% margem
                        </p>
                      </div>
                      <div className="text-3xl ml-2">{estatisticas.lucroReal >= 0 ? '📈' : '📉'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-gray-400 to-gray-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-gray-100 text-sm">Lucro Líquido</p>
                        <p className="text-xl font-bold">Aguardando vendas</p>
                        <p className="text-gray-100 text-xs">Faça vendas para ver</p>
                      </div>
                      <div className="text-3xl ml-2">⏳</div>
                    </div>
                  </div>
                )}

                {/* Produtos Vendidos */}
                <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-orange-100 text-sm">Volume</p>
                      <p className="text-2xl font-bold">{estatisticas.quantidadeVendida}</p>
                      <p className="text-orange-100 text-xs">Itens vendidos</p>
                    </div>
                    <div className="text-3xl ml-2">📦</div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Linha - Vendas dos Últimos 15 Dias */}
              <div className="mb-8">
                <GraficoLinha 
                  dados={dadosVendasDiarias} 
                  titulo="📈 Tendência de Vendas - Últimos 15 Dias"
                  modoNoturno={modoNoturno}
                />
              </div>

              {/* Análises de Vendas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
                
                {/* 🆕 PRODUTOS MAIS VENDIDOS COM VISUAL DE CATEGORIA */}
                <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    🏆 Top 10 Produtos Mais Vendidos
                  </h3>
                  {estatisticas.rankingProdutos.length === 0 ? (
                    <div className={`text-center py-8 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                      📦 Nenhuma venda registrada no período
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {estatisticas.rankingProdutos.map((produto, index) => {
                        // 🆕 OBTER DADOS DA CATEGORIA DO PRODUTO
                        const produtoCompleto = produtos.find(p => p.codigo === produto.codigo)
                        const dadosCategoria = produtoCompleto ? obterDadosCategoria(produtoCompleto) : { icone: '📦', cor: '#6B7280', nome: 'N/A' }
                        
                        return (
                          <div key={produto.codigo} className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${
                            modoNoturno ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              {/* 🆕 ÍCONE DA CATEGORIA */}
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                                style={{ backgroundColor: dadosCategoria.cor }}
                              >
                                {dadosCategoria.icone}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                  {produto.nome}
                                </p>
                                <p className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                  #{produto.codigo} • {dadosCategoria.nome}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                {produto.quantidade} un.
                              </p>
                              <p className="text-green-600 text-sm">R$ {produto.valor.toFixed(2)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 🆕 VENDAS POR CATEGORIA COM VISUAL MELHORADO */}
                <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📋 Performance por Categoria
                  </h3>
                  {Object.keys(estatisticas.vendasPorCategoria).length === 0 ? (
                    <div className={`text-center py-8 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                      📊 Nenhuma venda por categoria
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(estatisticas.vendasPorCategoria)
                        .sort(([,a], [,b]) => b - a)
                        .map(([categoria, valor]) => {
                          const maxValor = Math.max(...Object.values(estatisticas.vendasPorCategoria))
                          const largura = (valor / maxValor) * 100
                          const participacao = ((valor / estatisticas.totalVendas) * 100).toFixed(1)
                          const dadosCategoria = estatisticas.dadosCategorias[categoria]
                          
                          return (
                            <div key={categoria} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  {/* 🆕 ÍCONE DA CATEGORIA */}
                                  {dadosCategoria && (
                                    <div
                                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                                      style={{ backgroundColor: dadosCategoria.cor }}
                                    >
                                      {dadosCategoria.icone}
                                    </div>
                                  )}
                                  <span className={`font-medium truncate ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {categoria}
                                  </span>
                                </div>
                                <div className="text-right ml-2">
                                  <span className={`font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                    R$ {valor.toFixed(2)}
                                  </span>
                                  <span className={`text-xs ml-1 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                    ({participacao}%)
                                  </span>
                                </div>
                              </div>
                              <div className={`w-full rounded-full h-2 ${modoNoturno ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div 
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${largura}%`,
                                    backgroundColor: dadosCategoria?.cor || '#3B82F6'
                                  }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* 🆕 GRÁFICO DE PIZZA COM DADOS DAS CATEGORIAS */}
              {Object.keys(estatisticas.vendasPorCategoria).length > 0 && (
                <div className="mb-8">
                  <GraficoPizza 
                    dados={estatisticas.vendasPorCategoria} 
                    titulo="🥧 Distribuição de Vendas por Categoria"
                    cores={coresPizza}
                    dadosCategorias={estatisticas.dadosCategorias} // 🆕 PASSAR DADOS DAS CATEGORIAS
                  />
                </div>
              )}
            </>
          )}

          {/* Informações Adicionais ATUALIZADAS */}
          {!isLoadingData && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💡</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                    Sistema Inteligente de Relatórios Pro com Categorias Visuais
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-blue-300' : 'text-blue-700'}`}>
                    <p>• <strong>📂 Filtros por categoria:</strong> Análise segmentada com ícones e cores personalizadas</p>
                    <p>• <strong>🎯 Análise de vendas:</strong> Performance financeira completa com gráficos interativos</p>
                    <p>• <strong>📅 Controle de validade:</strong> Monitoramento automático com alertas inteligentes</p>
                    <p>• <strong>📦 Gestão de estoque:</strong> Alertas de reposição e análise detalhada por categoria</p>
                    <p>• <strong>🎨 Visual categorizado:</strong> Produtos e gráficos organizados por cores e ícones</p>
                    <p>• <strong>📊 Exportação avançada:</strong> Relatórios executivos em PDF e Excel com dados de categoria</p>
                    <p>• <strong>🚀 Dados em tempo real:</strong> Sincronização automática com Firebase</p>
                    <p>• <strong>⌨️ Atalhos produtivos:</strong> Navegação rápida por teclado (Ctrl+1-4, Ctrl+E/P)</p>
                    <p>• <strong>🌙 Interface adaptável:</strong> Modo noturno para melhor experiência</p>
                    <p>• <strong>🔄 Integração total:</strong> Funciona perfeitamente com todos os módulos do sistema</p>
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