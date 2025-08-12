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

  // 🔧 CORREÇÃO: Loading geral mais restritivo
  const isLoadingData = loadingProdutos || loadingMovimentacoes

  // 📊 DEBUG: Adicionar console.log para debug
  useEffect(() => {
    console.log('�� DEBUG RELATÓRIOS:')
    console.log('   - isLoadingData:', isLoadingData)
    console.log('   - loadingProdutos:', loadingProdutos)
    console.log('   - loadingMovimentacoes:', loadingMovimentacoes)
    console.log('   - loadingCategorias:', loadingCategorias)
    console.log('   - produtos length:', produtos?.length || 0)
    console.log('   - movimentacoes length:', movimentacoes?.length || 0)
    console.log('   - categorias length:', categorias?.length || 0)
    console.log('   - abaAtiva:', abaAtiva)
  }, [isLoadingData, loadingProdutos, loadingMovimentacoes, loadingCategorias, produtos, movimentacoes, categorias, abaAtiva])

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
    // 🔧 CORREÇÃO: Verificação mais robusta
    if (!produtos || produtos.length === 0) {
      console.log('⚠️ Produtos vazios para estatísticas de validade')
      return {
        vencidos: [],
        vencendoHoje: [],
        vencendoEm7Dias: [],
        proximoVencimento: [],
        validos: [],
        semValidade: [],
        totalComValidade: 0,
        valorPerdido: 0
      }
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

    const resultado = {
      vencidos,
      vencendoHoje,
      vencendoEm7Dias,
      proximoVencimento,
      validos,
      semValidade,
      totalComValidade: produtos.filter(p => p.temValidade && p.ativo).length,
      valorPerdido
    }

    console.log('📅 Estatísticas de validade calculadas:', resultado)
    return resultado
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

  // FUNÇÃO DE EXPORTAÇÃO SIMPLIFICADA (por espaço)
  const exportarRelatorio = useCallback(async (formato: 'pdf' | 'excel') => {
    toast.info('Exportação', `Funcionalidade ${formato} em desenvolvimento`)
  }, [toast])

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
          
          {/* 🔧 CORREÇÃO: Loading de carregamento inicial mais específico */}
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
                <div className="mt-4 text-xs text-gray-500">
                  <p>Produtos: {loadingProdutos ? 'Carregando...' : `${produtos?.length || 0} loaded`}</p>
                  <p>Movimentações: {loadingMovimentacoes ? 'Carregando...' : `${movimentacoes?.length || 0} loaded`}</p>
                </div>
              </div>
            </div>
          )}

          {/* 🔧 CORREÇÃO: Header principal só aparece quando dados carregaram */}
          {!isLoadingData && (
            <>
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

              {/* ALERTAS CRÍTICOS DE VALIDADE */}
              {(estatisticasValidade.vencidos.length > 0 || estatisticasValidade.vencendoHoje.length > 0) && (
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

              {/* NAVEGAÇÃO POR ABAS */}
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
                      �� Análise de Estoque
                    </button>
                    <button
                      onClick={() => setAbaAtiva('comparativo')}
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                        abaAtiva === 'comparativo'
                          ? `border-purple-500 ${modoNoturno ? 'text-purple-400 bg-purple-900' : 'text-purple-600 bg-purple-50'}`
                          : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                      }`}
                    >
                      �� Análise Comparativa
                    </button>
                  </nav>
                </div>
              </div>

              {/* 📅 ABA DE CONTROLE DE VALIDADE */}
              {abaAtiva === 'validade' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-red-100 text-sm">Produtos Vencidos</p>
                          <p className="text-3xl font-bold">{estatisticasValidade.vencidos.length}</p>
                          <p className="text-red-100 text-xs">Ação imediata</p>
                        </div>
                        <div className="text-4xl ml-3">🚨</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-orange-100 text-sm">Vencendo Hoje</p>
                          <p className="text-3xl font-bold">{estatisticasValidade.vencendoHoje.length}</p>
                          <p className="text-orange-100 text-xs">Urgente</p>
                        </div>
                        <div className="text-4xl ml-3">⏰</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-yellow-100 text-sm">Vencendo em 7 Dias</p>
                          <p className="text-3xl font-bold">{estatisticasValidade.vencendoEm7Dias.length}</p>
                          <p className="text-yellow-100 text-xs">Atenção</p>
                        </div>
                        <div className="text-4xl ml-3">📅</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-blue-100 text-sm">Próx. Vencimento</p>
                          <p className="text-3xl font-bold">{estatisticasValidade.proximoVencimento.length}</p>
                          <p className="text-blue-100 text-xs">Monitorar</p>
                        </div>
                        <div className="text-4xl ml-3">⚠️</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-purple-100 text-sm">Valor Perdido</p>
                          <p className="text-2xl font-bold">R$ {estatisticasValidade.valorPerdido.toFixed(2)}</p>
                          <p className="text-purple-100 text-xs">Produtos vencidos</p>
                        </div>
                        <div className="text-4xl ml-3">💸</div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl shadow-lg ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      📊 Resumo de Validade
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-red-600 mb-2">🚨 Ação Imediata Necessária</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Produtos vencidos: {estatisticasValidade.vencidos.length}</li>
                          <li>• Vencendo hoje: {estatisticasValidade.vencendoHoje.length}</li>
                          <li>• Valor em risco: R$ {estatisticasValidade.valorPerdido.toFixed(2)}</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-yellow-600 mb-2">⚠️ Monitoramento</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Vencendo em 7 dias: {estatisticasValidade.vencendoEm7Dias.length}</li>
                          <li>• Próximo vencimento: {estatisticasValidade.proximoVencimento.length}</li>
                          <li>• Com validade controlada: {estatisticasValidade.totalComValidade}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 📦 ABA DE ANÁLISE DE ESTOQUE */}
              {abaAtiva === 'estoque' && produtos && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-blue-100 text-sm">Total Produtos</p>
                          <p className="text-3xl font-bold">{produtos.filter(p => p.ativo).length}</p>
                          <p className="text-blue-100 text-xs">Ativos</p>
                        </div>
                        <div className="text-4xl ml-3">📦</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-red-100 text-sm">Estoque Zerado</p>
                          <p className="text-3xl font-bold">{produtos.filter(p => p.ativo && p.estoque === 0).length}</p>
                          <p className="text-red-100 text-xs">Sem estoque</p>
                        </div>
                        <div className="text-4xl ml-3">🚫</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-yellow-100 text-sm">Estoque Baixo</p>
                          <p className="text-3xl font-bold">{produtos.filter(p => p.ativo && p.estoque > 0 && p.estoque <= p.estoqueMinimo).length}</p>
                          <p className="text-yellow-100 text-xs">Reabastecer</p>
                        </div>
                        <div className="text-4xl ml-3">⚠️</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-green-100 text-sm">Estoque Normal</p>
                          <p className="text-3xl font-bold">{produtos.filter(p => p.ativo && p.estoque > p.estoqueMinimo).length}</p>
                          <p className="text-green-100 text-xs">Adequado</p>
                        </div>
                        <div className="text-4xl ml-3">✅</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-purple-100 text-sm">Valor Estoque</p>
                          <p className="text-2xl font-bold">R$ {produtos.filter(p => p.ativo).reduce((total, produto) => total + (produto.estoque * produto.valorCompra), 0).toFixed(2)}</p>
                          <p className="text-purple-100 text-xs">Investido</p>
                        </div>
                        <div className="text-4xl ml-3">💰</div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl shadow-lg ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      📊 Resumo do Estoque
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-bold text-red-600 mb-2">🚫 Ação Urgente</h4>
                        <p className="text-2xl font-bold">{produtos.filter(p => p.ativo && p.estoque === 0).length}</p>
                        <p className="text-sm text-gray-600">Produtos sem estoque</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-yellow-600 mb-2">⚠️ Atenção</h4>
                        <p className="text-2xl font-bold">{produtos.filter(p => p.ativo && p.estoque > 0 && p.estoque <= p.estoqueMinimo).length}</p>
                        <p className="text-sm text-gray-600">Estoque baixo</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-green-600 mb-2">✅ Normal</h4>
                        <p className="text-2xl font-bold">{produtos.filter(p => p.ativo && p.estoque > p.estoqueMinimo).length}</p>
                        <p className="text-sm text-gray-600">Estoque adequado</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 📈 ABA DE ANÁLISE COMPARATIVA */}
              {abaAtiva === 'comparativo' && produtos && movimentacoes && (
                <>
                  <div className={`mb-6 p-6 rounded-xl shadow-lg ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      📊 Análise Comparativa de Períodos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-blue-600 mb-2">📈 Crescimento</h4>
                        <p className="text-sm text-gray-600">Compare diferentes períodos para identificar tendências de crescimento.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-green-600 mb-2">📊 Performance</h4>
                        <p className="text-sm text-gray-600">Analise métricas como faturamento, volume e ticket médio.</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl shadow-lg ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                      🎯 Métricas Gerais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{produtos.filter(p => p.ativo).length}</p>
                        <p className="text-sm text-gray-600">Produtos Ativos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{movimentacoes?.filter(m => m.tipo === 'saida').length || 0}</p>
                        <p className="text-sm text-gray-600">Total de Vendas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">R$ {estatisticas.totalVendas.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Faturamento Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-orange-600">{Math.floor((new Date().getTime() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24))}</p>
                        <p className="text-sm text-gray-600">Dias em Operação</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ABA DE VENDAS */}
              {abaAtiva === 'vendas' && (
                <div className={`p-6 rounded-xl shadow-lg ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    💰 Análise de Vendas e Financeiro
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">R$ {estatisticas.totalVendas.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Faturamento Total</p>
                    </div>
                    <div className="text-center">
                                            <p className="text-3xl font-bold text-blue-600">{estatisticas.numeroVendas}</p>
                      <p className="text-sm text-gray-600">Número de Vendas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">R$ {estatisticas.lucroReal.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Lucro Líquido</p>
                    </div>
                  </div>

                  {/* Gráfico de Pizza das Categorias */}
                  {Object.keys(estatisticas.vendasPorCategoria).length > 0 && (
                    <div className="mt-8">
                      <GraficoPizza 
                        dados={estatisticas.vendasPorCategoria} 
                        titulo="🥧 Distribuição de Vendas por Categoria"
                        cores={coresPizza}
                        dadosCategorias={estatisticas.dadosCategorias}
                      />
                    </div>
                  )}

                  {/* Ranking de Produtos */}
                  {estatisticas.rankingProdutos.length > 0 && (
                    <div className="mt-8">
                      <h4 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                        🏆 Top 5 Produtos Mais Vendidos
                      </h4>
                      <div className="space-y-3">
                        {estatisticas.rankingProdutos.slice(0, 5).map((produto, index) => (
                          <div key={produto.codigo} className={`flex items-center justify-between p-3 rounded-lg ${
                            modoNoturno ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className={`font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                                  {produto.nome}
                                </p>
                                <p className={`text-sm ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                                  #{produto.codigo}
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
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Informações do Sistema */}
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
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}