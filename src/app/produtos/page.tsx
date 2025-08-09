// src/app/produtos/page.tsx - VERSÃO INTEGRADA E CORRIGIDA COM ADAPTAÇÃO AO MENU
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
  categoriaId?: string // 🆕 NOVA PROPRIEDADE
  codigoBarras: string
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
  // Campos específicos por categoria
  camposEspecificos?: Record<string, any>
  marca?: string
  modelo?: string
  cor?: string
  tamanho?: string
}

// Sistema de categorias inteligentes (MANTIDO ORIGINAL)
interface CampoEspecifico {
  nome: string
  tipo: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'volume' | 'peso'
  obrigatorio: boolean
  opcoes?: string[]
  placeholder?: string
}

interface CategoriaProduto {
  id: string
  nome: string
  icone: string
  temValidade: boolean
  campos: CampoEspecifico[]
}

// Categorias inteligentes atualizadas (MANTIDAS ORIGINAIS)
const CATEGORIAS_INTELIGENTES: CategoriaProduto[] = [
  {
    id: 'alimentos',
    nome: 'Alimentos',
    icone: '🍎',
    temValidade: true,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'lote', tipo: 'text', obrigatorio: false, placeholder: 'Número do lote' },
      { nome: 'fornecedor', tipo: 'text', obrigatorio: false, placeholder: 'Nome do fornecedor' },
      { nome: 'origem', tipo: 'text', obrigatorio: false, placeholder: 'País/região de origem' },
      { nome: 'peso', tipo: 'peso', obrigatorio: false, placeholder: 'Peso' },
    ]
  },
  {
    id: 'bebidas',
    nome: 'Bebidas',
    icone: '🍸',
    temValidade: true,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'lote', tipo: 'text', obrigatorio: false, placeholder: 'Número do lote' },
      { nome: 'fornecedor', tipo: 'text', obrigatorio: false, placeholder: 'Nome do fornecedor' },
      { nome: 'origem', tipo: 'text', obrigatorio: false, placeholder: 'País/região de origem' },
      { nome: 'volume', tipo: 'volume', obrigatorio: false, placeholder: 'Volume' },
      { nome: 'teorAlcoolico', tipo: 'number', obrigatorio: false, placeholder: 'Teor alcoólico (%)' }
    ]
  },
  {
    id: 'vestuario',
    nome: 'Roupas e Acessórios',
    icone: '👕',
    temValidade: false,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'genero', tipo: 'select', obrigatorio: false, opcoes: ['Masculino', 'Feminino', 'Unissex', 'Infantil'] },
      { nome: 'estacao', tipo: 'select', obrigatorio: false, opcoes: ['Verão', 'Inverno', 'Meia-estação', 'Atemporal'] },
      { nome: 'material', tipo: 'text', obrigatorio: false, placeholder: 'Ex: 100% algodão' },
      { nome: 'cuidados', tipo: 'text', obrigatorio: false, placeholder: 'Instruções de lavagem' }
    ]
  },
  {
    id: 'calcados',
    nome: 'Calçados',
    icone: '👟',
    temValidade: false,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'numeracao', tipo: 'text', obrigatorio: true, placeholder: 'Ex: 38, 39, 40...' },
      { nome: 'genero', tipo: 'select', obrigatorio: false, opcoes: ['Masculino', 'Feminino', 'Unissex', 'Infantil'] },
      { nome: 'tipo', tipo: 'select', obrigatorio: false, opcoes: ['Casual', 'Social', 'Esportivo', 'Sandália', 'Bota'] },
      { nome: 'material', tipo: 'text', obrigatorio: false, placeholder: 'Ex: Couro, Sintético...' }
    ]
  },
  {
    id: 'farmacia',
    nome: 'Farmácia e Saúde',
    icone: '💊',
    temValidade: true,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'principioAtivo', tipo: 'text', obrigatorio: false, placeholder: 'Princípio ativo' },
      { nome: 'dosagem', tipo: 'text', obrigatorio: false, placeholder: 'Ex: 500mg' },
      { nome: 'laboratorio', tipo: 'text', obrigatorio: false, placeholder: 'Laboratório fabricante' },
      { nome: 'prescricao', tipo: 'select', obrigatorio: false, opcoes: ['Livre', 'Receita Simples', 'Receita Especial'] },
      { nome: 'lote', tipo: 'text', obrigatorio: true, placeholder: 'Número do lote' },
      { nome: 'registro', tipo: 'text', obrigatorio: false, placeholder: 'Registro ANVISA' }
    ]
  },
  {
    id: 'beleza',
    nome: 'Beleza e Cuidados',
    icone: '💄',
    temValidade: true,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'tipo', tipo: 'select', obrigatorio: false, opcoes: ['Maquiagem', 'Skincare', 'Cabelo', 'Perfumaria', 'Unhas'] },
      { nome: 'genero', tipo: 'select', obrigatorio: false, opcoes: ['Masculino', 'Feminino', 'Unissex'] },
      { nome: 'tipoPele', tipo: 'select', obrigatorio: false, opcoes: ['Oleosa', 'Seca', 'Mista', 'Sensível', 'Todos os tipos'] },
      { nome: 'fragancia', tipo: 'text', obrigatorio: false, placeholder: 'Descrição da fragrância' }
    ]
  },
  {
    id: 'automotivo',
    nome: 'Automotivo',
    icone: '🔧',
    temValidade: false,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'aplicacao', tipo: 'text', obrigatorio: false, placeholder: 'Veículos compatíveis' },
      { nome: 'marca', tipo: 'text', obrigatorio: false, placeholder: 'Marca da peça' },
      { nome: 'codigoOriginal', tipo: 'text', obrigatorio: false, placeholder: 'Código original da peça' },
      { nome: 'garantia', tipo: 'number', obrigatorio: false, placeholder: 'Garantia em meses' },
      { nome: 'categoria', tipo: 'select', obrigatorio: false, opcoes: ['Motor', 'Suspensão', 'Freios', 'Elétrica', 'Carroceria', 'Filtros', 'Óleos'] }
    ]
  },
  {
    id: 'eletronicos',
    nome: 'Eletrônicos',
    icone: '📱',
    temValidade: false,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'voltagem', tipo: 'select', obrigatorio: false, opcoes: ['110V', '220V', 'Bivolt'] },
      { nome: 'garantia', tipo: 'number', obrigatorio: false, placeholder: 'Garantia em meses' },
      { nome: 'potencia', tipo: 'text', obrigatorio: false, placeholder: 'Ex: 1200W' },
      { nome: 'dimensoes', tipo: 'text', obrigatorio: false, placeholder: 'Altura x Largura x Profundidade' },
      { nome: 'peso', tipo: 'number', obrigatorio: false, placeholder: 'Peso em kg' }
    ]
  },
  {
    id: 'casa',
    nome: 'Casa e Decoração',
    icone: '🏠',
    temValidade: false,
    campos: [
      { nome: 'nome', tipo: 'text', obrigatorio: true, placeholder: 'Nome do produto' },
      { nome: 'ambiente', tipo: 'select', obrigatorio: false, opcoes: ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Área Externa', 'Escritório'] },
      { nome: 'material', tipo: 'text', obrigatorio: false, placeholder: 'Material principal' },
      { nome: 'dimensoes', tipo: 'text', obrigatorio: false, placeholder: 'Dimensões do produto' },
      { nome: 'estilo', tipo: 'select', obrigatorio: false, opcoes: ['Moderno', 'Clássico', 'Rústico', 'Industrial', 'Minimalista'] }
    ]
  }
]

// Função para buscar categoria (MANTIDA ORIGINAL)
function buscarCategoria(id: string): CategoriaProduto | undefined {
  return CATEGORIAS_INTELIGENTES.find(cat => cat.id === id)
}

// Componente para campos específicos (MANTIDO ORIGINAL)
interface CamposEspecificosProps {
  categoria: CategoriaProduto
  valores: Record<string, any>
  onChange: (campo: string, valor: any) => void
  disabled?: boolean
}

function CamposEspecificos({ categoria, valores, onChange, disabled }: CamposEspecificosProps) {
  const [unidadeVolume, setUnidadeVolume] = useState<'ml' | 'l'>('ml')
  const [unidadePeso, setUnidadePeso] = useState<'g' | 'kg'>('g')

  const renderCampo = (campo: CampoEspecifico) => {
    const valor = valores[campo.nome] || ''

    switch (campo.tipo) {
      case 'volume':
        return (
          <div className="flex space-x-2">
            <input
              type="number"
              value={valor}
              onChange={(e) => onChange(campo.nome, e.target.value)}
              className="flex-1 border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
              placeholder="Volume"
              required={campo.obrigatorio}
              disabled={disabled}
              min="0"
              step="0.1"
            />
            <select
              value={unidadeVolume}
              onChange={(e) => {
                setUnidadeVolume(e.target.value as 'ml' | 'l')
                if (valor) {
                  onChange(campo.nome + '_unidade', e.target.value)
                }
              }}
              className="border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
              disabled={disabled}
            >
              <option value="ml">ml</option>
              <option value="l">L</option>
            </select>
          </div>
        )

       case 'peso':
         return (
           <div className="flex space-x-2">
             <input
               type="number"
               value={valor}
               onChange={(e) => onChange(campo.nome, e.target.value)}
               className="flex-1 border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
               placeholder="Peso"
               required={campo.obrigatorio}
               disabled={disabled}
               min="0"
               step="0.1"
             />
             <select
               value={unidadePeso}
               onChange={(e) => {
                 setUnidadePeso(e.target.value as 'g' | 'kg')
                 if (valor) {
                   onChange(campo.nome + '_unidade', e.target.value)
                 }
               }}
               className="border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
               disabled={disabled}
             >
               <option value="g">g</option>
               <option value="kg">kg</option>
             </select>
           </div>
        )

      case 'select':
        return (
          <select
            value={valor}
            onChange={(e) => onChange(campo.nome, e.target.value)}
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
            required={campo.obrigatorio}
            disabled={disabled}
          >
            <option value="">Selecione...</option>
            {campo.opcoes?.map(opcao => (
              <option key={opcao} value={opcao}>{opcao}</option>
            ))}
          </select>
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={valor}
            onChange={(e) => onChange(campo.nome, e.target.value)}
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
            placeholder={campo.placeholder}
            required={campo.obrigatorio}
            disabled={disabled}
            min="0"
            step="0.1"
          />
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={valor}
            onChange={(e) => onChange(campo.nome, e.target.value)}
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
            required={campo.obrigatorio}
            disabled={disabled}
          />
        )
      
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={valor || false}
              onChange={(e) => onChange(campo.nome, e.target.checked)}
              className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-all duration-200"
              disabled={disabled}
            />
            <span className="text-sm text-gray-700">Sim</span>
          </div>
        )
      
      default: // text
        return (
          <input
            type="text"
            value={valor}
            onChange={(e) => onChange(campo.nome, e.target.value)}
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
            placeholder={campo.placeholder}
            required={campo.obrigatorio}
            disabled={disabled}
          />
        )
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-shadow duration-300">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-3xl mr-3">{categoria.icone}</span>
          <div>
            <div className="text-lg">Informações do Produto</div>
            <div className="text-sm text-gray-600">{categoria.nome}</div>
          </div>
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoria.campos.map(campo => (
            <div key={campo.nome} className={campo.nome === 'nome' ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {campo.nome === 'nome' ? 'Nome do Produto' : campo.nome.charAt(0).toUpperCase() + campo.nome.slice(1)}
                {campo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderCampo(campo)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Produtos() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()
  
  // 🆕 ESTADO PARA CONTROLE DO MENU (ADAPTAÇÃO RESPONSIVA)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 🆕 SINCRONIZAÇÃO COM LOCALSTORAGE (ADAPTAÇÃO RESPONSIVA)
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('stockpro_sidebar_collapsed')
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed))
    }

    // Listener para mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stockpro_sidebar_collapsed' && e.newValue !== null) {
        setSidebarCollapsed(JSON.parse(e.newValue))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  // 🆕 HOOK PARA CATEGORIAS FIRESTORE
  const { 
    data: categoriasFirestore,
    loading: loadingCategorias
  } = useFirestore<CategoriaFirestore>('categorias')
  
  // Hooks do Firestore
  const { 
    data: produtos, 
    loading: loadingProdutos, 
    addDocument, 
    updateDocument, 
    deleteDocument 
  } = useFirestore<Produto>('produtos')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Estados para categoria inteligente
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [camposEspecificos, setCamposEspecificos] = useState<Record<string, any>>({})

  // 🔧 ESTADOS DO FORMULÁRIO CORRIGIDOS
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    categoriaId: '', // ✅ String vazia ao invés de undefined
    codigoBarras: '',
    estoqueMinimo: '',
    valorCompra: '',
    valorVenda: '',
    estoque: '',
    marca: '',
    modelo: '',
    cor: '',
    tamanho: '',
    temValidade: false,
    dataValidade: '',
    diasAlerta: '30'
  })

  // Estados de filtro
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroValidade, setFiltroValidade] = useState('')

  // 🆕 CATEGORIAS ATIVAS FIRESTORE
  const categoriasAtivasFirestore = useMemo(() => {
    return categoriasFirestore?.filter(cat => cat.ativo) || []
  }, [categoriasFirestore])

  // 🆕 FUNÇÃO PARA OBTER DADOS DA CATEGORIA
  const obterDadosCategoria = useCallback((produto: Produto) => {
    if (produto.categoriaId && categoriasFirestore) {
      const categoria = categoriasFirestore.find(cat => cat.id === produto.categoriaId)
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
    
    // Fallback para produtos antigos ou categorias não encontradas
    return {
      id: '',
      nome: produto.categoria || 'Sem categoria',
      icone: '📦',
      cor: '#6B7280',
      descricao: 'Categoria não definida'
    }
  }, [categoriasFirestore])

  // Função para verificar validade (MANTIDA ORIGINAL)
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

  // Gerar próximo código automaticamente (MANTIDO ORIGINAL)
  const gerarProximoCodigo = () => {
    if (!produtos) return '001'
    const produtosAtivos = produtos.filter(p => p.ativo)
    const proximoNumero = produtosAtivos.length + 1
    return proximoNumero.toString().padStart(3, '0')
  }

  // 🆕 FUNÇÃO PARA LIDAR COM MUDANÇA DE CATEGORIA FIRESTORE
  const handleCategoriaFirestoreChange = (categoriaId: string) => {
    const categoria = categoriasFirestore?.find(cat => cat.id === categoriaId)
    
    if (categoria) {
      setFormData(prev => ({
        ...prev,
        categoria: categoria.nome,
        categoriaId: categoriaId,
        temValidade: false // Reset validade - será definida pela categoria inteligente se aplicável
      }))
      
      // Limpar categoria inteligente quando selecionar Firestore
      setCategoriaSelecionada('')
      setCamposEspecificos({})
    }
  }

  // Função para lidar com mudança de categoria inteligente (MANTIDA ORIGINAL)
  const handleCategoriaChange = (nomeCategoria: string) => {
    const categoriaInteligente = CATEGORIAS_INTELIGENTES.find(cat => cat.nome === nomeCategoria)
    
    setFormData(prev => ({
      ...prev,
      categoria: nomeCategoria,
      categoriaId: '', // Limpar categoria Firestore
      temValidade: categoriaInteligente?.temValidade || false
    }))
    
    setCategoriaSelecionada(categoriaInteligente?.id || '')
    setCamposEspecificos({})
  }

  // Função para lidar com campos específicos (MANTIDA ORIGINAL)
  const handleCampoEspecifico = (campo: string, valor: any) => {
    setCamposEspecificos(prev => ({
      ...prev,
      [campo]: valor
    }))

    // Se for o campo nome, atualizar também o formData.nome
    if (campo === 'nome') {
      setFormData(prev => ({
        ...prev,
        nome: valor
      }))
    }
  }

  const iniciarScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowScanner(true)
        toast.info('Scanner ativo', 'Aponte a câmera para o código de barras')
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error)
      toast.error('Erro na câmera', 'Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  const pararScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
    setShowScanner(false)
  }

  const simularLeituraCodigoBarras = () => {
    const codigoSimulado = Math.random().toString().substr(2, 13)
    setFormData({...formData, codigoBarras: codigoSimulado})
    pararScanner()
    toast.success('Código escaneado!', `Código: ${codigoSimulado}`)
  }

  // 🔧 FUNÇÃO resetForm CORRIGIDA
  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: '',
      categoriaId: '', // ✅ String vazia ao invés de undefined
      codigoBarras: '',
      estoqueMinimo: '',
      valorCompra: '',
      valorVenda: '',
      estoque: '',
      marca: '',
      modelo: '',
      cor: '',
      tamanho: '',
      temValidade: false,
      dataValidade: '',
      diasAlerta: '30'
    })
    setCategoriaSelecionada('')
    setCamposEspecificos({})
    setEditingId(null)
    setShowForm(false)
    setShowNovaCategoria(false)
    setNovaCategoria('')
    pararScanner()
  }

  const adicionarNovaCategoria = async () => {
    if (!novaCategoria.trim()) {
      toast.warning('Categoria vazia', 'Digite o nome da categoria!')
      return
    }

    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      handleCategoriaChange(novaCategoria)
      setShowNovaCategoria(false)
      setNovaCategoria('')
      toast.success('Categoria adicionada!', 'Nova categoria criada com sucesso!')
    } finally {
      setLoading(false)
    }
  }

  // 🚀 FUNÇÃO handleSubmit CORRIGIDA - SOLUÇÃO DO ERRO FIREBASE
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!user) {
      toast.error('Erro de autenticação', 'Usuário não encontrado!')
      return
    }

    setLoading(true)
    try {
      // Validações
      const nomeParaValidar = camposEspecificos.nome || formData.nome
      if (!nomeParaValidar || !formData.categoria) {
        toast.error('Campos obrigatórios', 'Preencha nome e categoria!')
        return
      }

      // Validar campos específicos obrigatórios
      const categoriaInteligente = buscarCategoria(categoriaSelecionada)
      if (categoriaInteligente) {
        const camposObrigatorios = categoriaInteligente.campos.filter(campo => campo.obrigatorio)
        for (const campo of camposObrigatorios) {
          if (!camposEspecificos[campo.nome]) {
            toast.error('Campo obrigatório', `O campo "${campo.nome}" é obrigatório para esta categoria!`)
            return
          }
        }
      }

      const estoqueMinimo = parseInt(formData.estoqueMinimo) || 0
      const valorCompra = parseFloat(formData.valorCompra) || 0
      const valorVenda = parseFloat(formData.valorVenda) || 0
      const estoque = parseInt(formData.estoque) || 0
      const diasAlerta = parseInt(formData.diasAlerta) || 30

      if (valorCompra < 0 || valorVenda < 0 || estoqueMinimo < 0 || estoque < 0) {
        toast.warning('Valores inválidos', 'Valores não podem ser negativos!')
        return
      }

      if (valorVenda > 0 && valorCompra > 0 && valorVenda < valorCompra) {
        toast.warning('Preço de venda baixo', 'Valor de venda deve ser maior que o de compra!')
        return
      }

      // Validação de data de validade
      if (formData.temValidade && formData.dataValidade) {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        
        const [ano, mes, dia] = formData.dataValidade.split('-').map(Number)
        const dataValidade = new Date(ano, mes - 1, dia)
        dataValidade.setHours(0, 0, 0, 0)
        
        if (dataValidade <= hoje) {
          toast.warning('Data de validade inválida', 'A data de validade deve ser futura!')
          return
        }
      }

      // Verificar código de barras duplicado
      if (formData.codigoBarras && produtos) {
        const codigoBarrasExiste = produtos.some(p =>
          p.codigoBarras === formData.codigoBarras && p.id !== editingId
        )

        if (codigoBarrasExiste) {
          toast.error('Código de barras já existe', 'Este código de barras já está sendo usado!')
          return
        }
      }

      // 🆕 OBJETO PRODUTO COM FILTRO DE UNDEFINED
      const dadosBasicos = {
        codigo: editingId ?
          produtos?.find(p => p.id === editingId)?.codigo || gerarProximoCodigo() :
          gerarProximoCodigo(),
        nome: nomeParaValidar,
        categoria: formData.categoria,
        estoqueMinimo,
        valorCompra,
        valorVenda,
        estoque,
        ativo: true,
        dataCadastro: editingId ?
          produtos?.find(p => p.id === editingId)?.dataCadastro || new Date().toLocaleDateString('pt-BR') :
          new Date().toLocaleDateString('pt-BR'),
        userId: user.uid
      }

      // 🆕 CAMPOS OPCIONAIS - SÓ ADICIONAR SE TIVEREM VALOR VÁLIDO
      const camposOpcionais: Partial<Produto> = {}

      // CategoriaId - só adicionar se não for vazio e não for undefined
      if (formData.categoriaId && formData.categoriaId.trim() !== '') {
        camposOpcionais.categoriaId = formData.categoriaId
      }

      // Código de barras
      if (formData.codigoBarras && formData.codigoBarras.trim() !== '') {
        camposOpcionais.codigoBarras = formData.codigoBarras
      }

      // Campos básicos opcionais (só se não tiver campos específicos)
      if (!categoriaSelecionada) {
        if (formData.marca && formData.marca.trim() !== '') {
          camposOpcionais.marca = formData.marca
        }
        if (formData.modelo && formData.modelo.trim() !== '') {
          camposOpcionais.modelo = formData.modelo
        }
        if (formData.cor && formData.cor.trim() !== '') {
          camposOpcionais.cor = formData.cor
        }
        if (formData.tamanho && formData.tamanho.trim() !== '') {
          camposOpcionais.tamanho = formData.tamanho
        }
      }

      // Campos de validade
      if (formData.temValidade) {
        camposOpcionais.temValidade = true
        if (formData.dataValidade && formData.dataValidade.trim() !== '') {
          camposOpcionais.dataValidade = formData.dataValidade
        }
        camposOpcionais.diasAlerta = diasAlerta
      }

      // Campos específicos
      if (Object.keys(camposEspecificos).length > 0) {
        // Filtrar campos específicos vazios
        const camposEspecificosFiltrados = Object.fromEntries(
          Object.entries(camposEspecificos).filter(([_, value]) => 
            value !== undefined && value !== null && value !== ''
          )
        )
        if (Object.keys(camposEspecificosFiltrados).length > 0) {
          camposOpcionais.camposEspecificos = camposEspecificosFiltrados
        }
      }

      // 🆕 COMBINAR DADOS E FILTRAR UNDEFINED
      const novoProduto = { ...dadosBasicos, ...camposOpcionais }

      // 🚀 FILTRO FINAL DE SEGURANÇA - REMOVER QUALQUER UNDEFINED
      const produtoLimpo = Object.fromEntries(
        Object.entries(novoProduto).filter(([_, value]) => value !== undefined)
      ) as Omit<Produto, 'id'>

      console.log('Produto a ser salvo:', produtoLimpo) // Debug

      if (editingId) {
        await updateDocument(editingId, produtoLimpo)
        toast.success('Produto atualizado!', 'Dados atualizados com sucesso!')
      } else {
        await addDocument(produtoLimpo)
        toast.success('Produto cadastrado!', `Código ${produtoLimpo.codigo} criado!`)
      }

      resetForm()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      toast.error('Erro ao salvar', 'Não foi possível salvar o produto!')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (produto: Produto) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 400))

      const categoriaInteligente = CATEGORIAS_INTELIGENTES.find(cat => cat.nome === produto.categoria)

      setFormData({
        nome: produto.nome,
        categoria: produto.categoria,
        categoriaId: produto.categoriaId || '', // 🆕 CARREGAR CATEGORIA ID
        codigoBarras: produto.codigoBarras || '',
        estoqueMinimo: produto.estoqueMinimo.toString(),
        valorCompra: produto.valorCompra.toString(),
        valorVenda: produto.valorVenda.toString(),
        estoque: produto.estoque.toString(),
        marca: produto.marca || '',
        modelo: produto.modelo || '',
        cor: produto.cor || '',
        tamanho: produto.tamanho || '',
        temValidade: produto.temValidade || false,
        dataValidade: produto.dataValidade || '',
        diasAlerta: produto.diasAlerta?.toString() || '30'
      })

      setCategoriaSelecionada(categoriaInteligente?.id || '')
      
      // Se tem campos específicos, incluir o nome neles
      const camposComNome = produto.camposEspecificos || {}
      if (categoriaInteligente && !camposComNome.nome) {
        camposComNome.nome = produto.nome
      }
      setCamposEspecificos(camposComNome)
      
      setEditingId(produto.id)
      setShowForm(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      setLoading(true)
      try {
        await deleteDocument(id)
        toast.success('Produto excluído!', 'Produto removido com sucesso!')
      } catch (error) {
        console.error('Erro ao excluir produto:', error)
        toast.error('Erro ao excluir', 'Não foi possível excluir o produto!')
      } finally {
        setLoading(false)
      }
    }
  }

  const toggleStatus = async (id: string) => {
    if (!produtos) return

    setLoading(true)
    try {
      const produto = produtos.find(p => p.id === id)
      if (!produto) return

      await updateDocument(id, { ativo: !produto.ativo })

      const novoStatus = !produto.ativo
      toast.success(
        `Produto ${novoStatus ? 'ativado' : 'desativado'}!`,
        `Status alterado com sucesso!`
      )
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status', 'Não foi possível alterar o status!')
    } finally {
      setLoading(false)
    }
  }

  // 🆕 FILTRAR PRODUTOS ATUALIZADO COM CATEGORIA FIRESTORE
  const produtosFiltrados = produtos ? produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.categoria.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.codigoBarras.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.marca?.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.modelo?.toLowerCase().includes(busca.toLowerCase())

    // 🆕 MATCH CATEGORIA ATUALIZADO
    const matchCategoria = filtroCategoria === '' || 
                          produto.categoria === filtroCategoria ||
                          produto.categoriaId === filtroCategoria

    const matchStatus = filtroStatus === '' ||
                       (filtroStatus === 'ativo' && produto.ativo) ||
                       (filtroStatus === 'inativo' && !produto.ativo)

    let matchValidade = true
    if (filtroValidade) {
      const validadeInfo = verificarValidade(produto)
      switch (filtroValidade) {
        case 'vencidos':
          matchValidade = validadeInfo.status === 'vencido'
          break
        case 'vencendo_hoje':
          matchValidade = validadeInfo.status === 'vence_hoje'
          break
        case 'vencendo_7_dias':
          matchValidade = validadeInfo.status === 'vence_em_7_dias'
          break
        case 'proximo_vencimento':
          matchValidade = validadeInfo.status === 'proximo_vencimento'
          break
        case 'com_validade':
          matchValidade = produto.temValidade === true
          break
        case 'sem_validade':
          matchValidade = !produto.temValidade
          break
      }
    }

    return matchBusca && matchCategoria && matchStatus && matchValidade
  }) : []

  // 🆕 CATEGORIAS PARA FILTRO COMBINADAS
  const categoriasParaFiltro = useMemo(() => {
    const categoriasProdutos = produtos ? [...new Set(produtos.map(p => p.categoria))].filter(Boolean) : []
    const categoriasFirestoreNomes = categoriasAtivasFirestore.map(cat => cat.nome)
    
    // Combinar e remover duplicatas
    const todasCategorias = [...new Set([...categoriasProdutos, ...categoriasFirestoreNomes])]
    return todasCategorias.sort()
  }, [produtos, categoriasAtivasFirestore])

  // Estatísticas de validade (MANTIDAS ORIGINAIS)
  const estatisticasValidade = produtos ? {
    vencidos: produtos.filter(p => verificarValidade(p).status === 'vencido').length,
    vencendoHoje: produtos.filter(p => verificarValidade(p).status === 'vence_hoje').length,
    vencendoEm7Dias: produtos.filter(p => verificarValidade(p).status === 'vence_em_7_dias').length,
    proximoVencimento: produtos.filter(p => verificarValidade(p).status === 'proximo_vencimento').length,
    comValidade: produtos.filter(p => p.temValidade).length
  } : { vencidos: 0, vencendoHoje: 0, vencendoEm7Dias: 0, proximoVencimento: 0, comValidade: 0 }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <MobileHeader 
          title="Gestão de Produtos" 
          currentPage="/produtos" 
          userEmail={user?.email || undefined}
        />

        {/* 🎯 MAIN COM ADAPTAÇÃO RESPONSIVA PARA O MENU */}
        <main className={`max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>

          {/* Loading inicial */}
          {(loadingProdutos || loadingCategorias) && (
            <div className="bg-white rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in">
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-purple-600 text-2xl">📦</span>
                  </div>
                </div>
                <p className="text-gray-700 font-bold text-lg">Carregando produtos...</p>
                <p className="text-gray-500 text-sm mt-2">Sincronizando dados do Firebase</p>
              </div>
            </div>
          )}

          {/* Alertas críticos de validade */}
          {!loadingProdutos && (estatisticasValidade.vencidos > 0 || estatisticasValidade.vencendoHoje > 0) && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 animate-slide-up">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Alertas de Validade Críticos!
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {estatisticasValidade.vencidos > 0 && (
                        <li><strong>{estatisticasValidade.vencidos} produto(s) vencido(s)</strong></li>
                      )}
                      {estatisticasValidade.vencendoHoje > 0 && (
                        <li><strong>{estatisticasValidade.vencendoHoje} produto(s) vencendo hoje</strong></li>
                      )}
                    </ul>
                    <button
                      onClick={() => setFiltroValidade('vencidos')}
                      className="mt-2 text-red-800 underline hover:text-red-900 font-medium transition-colors"
                    >
                      Filtrar produtos com problemas →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header com botões */}
          {!loadingProdutos && (
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Controle de Produtos</h1>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <LoadingButton
                  onClick={() => router.push('/categorias')}
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  📂 Categorias
                </LoadingButton>
                <LoadingButton
                  onClick={() => router.push('/pdv')}
                  variant="success"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  🛒 PDV (Vendas)
                </LoadingButton>
                <LoadingButton
                  onClick={() => setShowForm(true)}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  ➕ Novo Produto
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Filtros atualizados */}
          {!loadingProdutos && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Filtros</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Buscar</label>
                  <input
                    type="text"
                    placeholder="Nome, código, marca..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Categoria</label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all duration-200"
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasParaFiltro.map(categoria => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Status</label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all duration-200"
                  >
                    <option value="">Todos os status</option>
                    <option value="ativo">✅ Ativos</option>
                    <option value="inativo">❌ Inativos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Validade</label>
                  <select
                    value={filtroValidade}
                    onChange={(e) => setFiltroValidade(e.target.value)}
                    className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all duration-200"
                  >
                    <option value="">Todos os produtos</option>
                    <option value="vencidos">🚨 Vencidos</option>
                    <option value="vencendo_hoje">⏰ Vencendo hoje</option>
                    <option value="vencendo_7_dias">📅 Vencendo em 7 dias</option>
                    <option value="proximo_vencimento">⚠️ Próximo do vencimento</option>
                    <option value="com_validade">📆 Com validade</option>
                    <option value="sem_validade">♾️ Sem validade</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <LoadingButton
                    onClick={() => {
                      setBusca('')
                      setFiltroCategoria('')
                      setFiltroStatus('')
                      setFiltroValidade('')
                    }}
                    variant="secondary"
                    size="md"
                    className="w-full"
                  >
                    🧹 Limpar
                  </LoadingButton>
                </div>
              </div>
            </div>
          )}

          {/* Resumo dos filtros */}
          {!loadingProdutos && produtos && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <span className="text-blue-800 font-medium">
                  📊 {produtosFiltrados.length} de {produtos.length} produtos
                </span>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-blue-600">📱 {produtos.filter(p => p.codigoBarras).length} com código</span>
                  <span className="text-orange-600">📅 {estatisticasValidade.comValidade} com validade</span>
                  {(estatisticasValidade.vencidos + estatisticasValidade.vencendoHoje) > 0 && (
                    <span className="text-red-600 font-medium">
                      🚨 {estatisticasValidade.vencidos + estatisticasValidade.vencendoHoje} críticos
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 🆕 FORMULÁRIO ATUALIZADO COM CATEGORIAS FIRESTORE */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingId ? '✏️ Editar Produto' : '➕ Novo Produto'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                  {/* Código do produto */}
                  {editingId && produtos && (
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <label className="block text-sm font-bold text-gray-800 mb-1">Código do Produto</label>
                      <p className="text-lg font-bold text-purple-600">#{produtos.find(p => p.id === editingId)?.codigo}</p>
                    </div>
                  )}

                  {!editingId && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <label className="block text-sm font-bold text-green-800 mb-1">Código Automático</label>
                      <p className="text-lg font-bold text-green-600">#{gerarProximoCodigo()}</p>
                      <p className="text-xs text-green-600">Código gerado automaticamente</p>
                    </div>
                  )}

                  {/* 🆕 SELEÇÃO DE CATEGORIA ATUALIZADA COM FIRESTORE */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border-2 border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">🏷️ Categoria do Produto</h4>
                    
                    {/* 🆕 CATEGORIAS FIRESTORE PRIMEIRO */}
                    {categoriasAtivasFirestore.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-md font-bold text-gray-800 mb-3">📂 Categorias Personalizadas</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {categoriasAtivasFirestore.map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleCategoriaFirestoreChange(cat.id)}
                              className={`p-4 rounded-lg border-2 text-center transition-all duration-200 transform hover:scale-105 ${
                                formData.categoriaId === cat.id
                                  ? 'border-purple-500 text-white shadow-lg'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow-md'
                              }`}
                              style={{
                                backgroundColor: formData.categoriaId === cat.id ? cat.cor : 'transparent'
                              }}
                              disabled={loading}
                            >
                              <div className="text-3xl mb-2">{cat.icone}</div>
                              <div className="text-xs font-medium">{cat.nome}</div>
                              <div className="text-xs opacity-75">{cat.descricao}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CATEGORIAS INTELIGENTES MANTIDAS */}
                    <div className="mb-4">
                      <h5 className="text-md font-bold text-gray-800 mb-3">🧠 Categorias Inteligentes</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {CATEGORIAS_INTELIGENTES.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoriaChange(cat.nome)}
                            className={`p-4 rounded-lg border-2 text-center transition-all duration-200 transform hover:scale-105 ${
                              formData.categoria === cat.nome && !formData.categoriaId
                                ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow-md'
                            }`}
                            disabled={loading}
                          >
                            <div className="text-3xl mb-2">{cat.icone}</div>
                            <div className="text-xs font-medium">{cat.nome}</div>
                            {cat.temValidade && (
                              <div className="text-xs text-orange-600 mt-1">📅 Com validade</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opção para criar categoria personalizada */}
                    <div className="border-t pt-4">
                      {!showNovaCategoria ? (
                        <button
                          type="button"
                          onClick={() => setShowNovaCategoria(true)}
                          className="w-full p-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 transition-all duration-200 font-medium text-sm"
                          disabled={loading}
                        >
                          ➕ Criar nova categoria personalizada
                        </button>
                      ) : (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <label className="block text-sm font-bold text-green-800 mb-2">Nova Categoria:</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={novaCategoria}
                              onChange={(e) => setNovaCategoria(e.target.value)}
                              className="flex-1 border-2 border-green-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm text-sm"
                              placeholder="Nome da categoria"
                              disabled={loading}
                            />
                            <LoadingButton
                              type="button"
                              onClick={adicionarNovaCategoria}
                              isLoading={loading}
                              variant="success"
                              size="sm"
                            >
                              ✅
                            </LoadingButton>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNovaCategoria(false)
                                setNovaCategoria('')
                              }}
                              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                              disabled={loading}
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Categoria selecionada */}
                      {formData.categoria && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <span className="text-sm text-purple-800">Categoria selecionada: </span>
                          <span className="font-bold text-purple-900">{formData.categoria}</span>
                          {formData.categoriaId && categoriasFirestore && (
                            <div className="mt-2 flex items-center">
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-sm mr-2"
                                style={{ backgroundColor: categoriasFirestore.find(c => c.id === formData.categoriaId)?.cor }}
                              >
                                {categoriasFirestore.find(c => c.id === formData.categoriaId)?.icone}
                              </div>
                              <span className="text-xs text-purple-600">Categoria personalizada</span>
                            </div>
                          )}
                          {formData.temValidade && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              📅 Produto com validade
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campos específicos da categoria */}
                  {categoriaSelecionada && buscarCategoria(categoriaSelecionada) && (
                    <CamposEspecificos
                      categoria={buscarCategoria(categoriaSelecionada)!}
                      valores={camposEspecificos}
                      onChange={handleCampoEspecifico}
                      disabled={loading}
                    />
                  )}

                  {/* Informações básicas */}
                  {!categoriaSelecionada && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">📝 Informações Básicas</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-800 mb-2">
                            Nome do Produto *
                          </label>
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 text-sm transition-all duration-200"
                            placeholder="Digite o nome do produto"
                            required
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">Marca</label>
                          <input
                            type="text"
                            value={formData.marca}
                            onChange={(e) => setFormData({...formData, marca: e.target.value})}
                            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
                            placeholder="Ex: Nike, Samsung..."
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">Modelo</label>
                          <input
                            type="text"
                            value={formData.modelo}
                            onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
                            placeholder="Ex: Air Max, Galaxy S24..."
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">Cor</label>
                          <input
                            type="text"
                            value={formData.cor}
                            onChange={(e) => setFormData({...formData, cor: e.target.value})}
                            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
                            placeholder="Ex: Azul, Preto..."
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-800 mb-2">Tamanho</label>
                          <input
                            type="text"
                            value={formData.tamanho}
                            onChange={(e) => setFormData({...formData, tamanho: e.target.value})}
                            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
                            placeholder="Ex: M, 42, 500ml..."
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Controle de validade */}
                  {formData.temValidade && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 animate-fade-in">
                      <h4 className="text-lg font-bold text-orange-900 mb-4">📅 Controle de Validade</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-orange-800 mb-2">
                            Data de Validade *
                          </label>
                          <input
                           type="date"
                           value={formData.dataValidade}
                           onChange={(e) => setFormData({...formData, dataValidade: e.target.value})}
                           className="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm text-sm transition-all duration-200"
                           required={formData.temValidade}
                           min={new Date().toISOString().split('T')[0]}
                           disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-orange-800 mb-2">
                            Alertar quantos dias antes?
                          </label>
                          <input
                            type="number"
                            value={formData.diasAlerta}
                            onChange={(e) => setFormData({...formData, diasAlerta: e.target.value})}
                            className="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm text-sm transition-all duration-200"
                            placeholder="30"
                            min="1"
                            disabled={loading}
                          />
                        </div>
                      </div>
                       
                      {/* Preview de validade */}
                      {formData.dataValidade && (
                        <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                          <p className="text-sm text-orange-800">
                            ⚠️ <strong>Preview:</strong> {(() => {
                              const hoje = new Date()
                              hoje.setHours(0, 0, 0, 0)
                              
                              const [ano, mes, dia] = formData.dataValidade.split('-').map(Number)
                              const dataValidade = new Date(ano, mes - 1, dia)
                              dataValidade.setHours(0, 0, 0, 0)
                              
                              const diasRestantes = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                              
                              if (diasRestantes < 0) {
                                return `Data inválida - deve ser futura`
                              } else if (diasRestantes === 0) {
                                return 'Produto vencerá hoje'
                              } else if (diasRestantes === 1) {
                                return 'Produto vencerá amanhã'
                              } else {
                                return `Produto vencerá em ${diasRestantes} dias`
                              }
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Código de Barras */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">📱 Código de Barras</h4>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.codigoBarras}
                        onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
                        className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 text-sm transition-all duration-200"
                        placeholder="Digite ou escaneie o código de barras"
                        disabled={loading}
                      />
                      <div className="flex space-x-2">
                        <LoadingButton
                          type="button"
                          onClick={iniciarScanner}
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          disabled={loading}
                        >
                          📱 Escanear
                        </LoadingButton>
                        <LoadingButton
                          type="button"
                          onClick={simularLeituraCodigoBarras}
                          variant="warning"
                          size="sm"
                          className="flex-1"
                          disabled={loading}
                        >
                          🎲 Simular
                        </LoadingButton>
                      </div>
                      <p className="text-xs text-gray-500">
                        💡 O código de barras permite vendas rápidas no PDV
                      </p>
                    </div>
                  </div>

                  {/* Preços e Estoque */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">💰 Preços e Estoque</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Valor de Compra
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.valorCompra}
                          onChange={(e) => setFormData({...formData, valorCompra: e.target.value})}
                          className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 text-sm transition-all duration-200"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Valor de Venda
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.valorVenda}
                          onChange={(e) => setFormData({...formData, valorVenda: e.target.value})}
                          className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 text-sm transition-all duration-200"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Estoque Atual
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.estoque}
                          onChange={(e) => setFormData({...formData, estoque: e.target.value})}
                          className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 text-sm transition-all duration-200"
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Estoque Mínimo
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.estoqueMinimo}
                          onChange={(e) => setFormData({...formData, estoqueMinimo: e.target.value})}
                          className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm placeholder-gray-600 text-sm transition-all duration-200"
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Cálculo de margem */}
                    {formData.valorCompra && formData.valorVenda && (
                      <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200">
                        <h5 className="font-bold text-gray-800 mb-2 text-sm">💰 Análise de Margem:</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Margem de lucro:</span>
                            <span className="font-bold text-green-600 ml-1">
                              R$ {(parseFloat(formData.valorVenda) - parseFloat(formData.valorCompra)).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Percentual:</span>
                            <span className="font-bold text-blue-600 ml-1">
                              {(((parseFloat(formData.valorVenda) - parseFloat(formData.valorCompra)) / parseFloat(formData.valorCompra)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <LoadingButton
                      type="submit"
                      isLoading={loading}
                      loadingText="Salvando..."
                      variant="primary"
                      size="md"
                      className="flex-1"
                    >
                      {editingId ? '💾 Atualizar' : '➕ Cadastrar'}
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

          {/* Scanner de Código de Barras */}
          {showScanner && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-lg font-bold text-gray-900">📱 Scanner de Código de Barras</h3>
                  <button
                    onClick={pararScanner}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Overlay de mira */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-red-500 w-48 h-24 rounded-lg animate-pulse"></div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Aponte a câmera para o código de barras
                    </p>
                    <LoadingButton
                      onClick={simularLeituraCodigoBarras}
                      variant="primary"
                      size="md"
                      className="w-full"
                    >
                      🎲 Simular Leitura (Teste)
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Produtos Atualizada com Visual por Categoria */}
          {!loadingProdutos && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">📋 Lista de Produtos</h3>
              </div>

              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 animate-pulse">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                  <p className="text-gray-500 mb-4">
                    {!produtos || produtos.length === 0
                      ? 'Comece cadastrando seu primeiro produto.'
                      : 'Tente ajustar os filtros para encontrar os produtos desejados.'
                    }
                  </p>
                  <LoadingButton
                    onClick={() => setShowForm(true)}
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    ➕ Novo Produto
                  </LoadingButton>
                </div>
              ) : (
                <>
                  {/* Versão Mobile - Cards */}
                  <div className="block sm:hidden">
                    <div className="divide-y divide-gray-200">
                      {produtosFiltrados.map((produto) => {
                        const validadeInfo = verificarValidade(produto)
                        const dadosCategoria = obterDadosCategoria(produto)
                        
                        return (
                          <div key={produto.id} className="p-4 hover:bg-gray-50 transition-colors">
                            {/* Header com cor da categoria */}
                            <div 
                              className="p-3 rounded-t-lg mb-3 text-white"
                              style={{ backgroundColor: dadosCategoria.cor }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span className="text-2xl mr-3">{dadosCategoria.icone}</span>
                                  <div>
                                    <h4 className="text-sm font-bold truncate">{produto.nome}</h4>
                                    <p className="text-xs opacity-90">#{produto.codigo}</p>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  produto.ativo
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {produto.ativo ? '✅' : '❌'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="space-y-1 text-xs text-gray-600">
                                  <p><span className="font-medium">Categoria:</span> {dadosCategoria.nome}</p>
                                  {produto.codigoBarras && (
                                    <p><span className="font-medium">Código de Barras:</span> {produto.codigoBarras}</p>
                                  )}
                                  {produto.marca && (
                                    <p><span className="font-medium">Marca:</span> {produto.marca}</p>
                                  )}
                                  <p><span className="font-medium">Estoque:</span> {produto.estoque} unidades</p>
                                  <p><span className="font-medium">Compra:</span> R$ {produto.valorCompra.toFixed(2)}</p>
                                  <p><span className="font-medium">Venda:</span> R$ {produto.valorVenda.toFixed(2)}</p>
                                  
                                  {/* Informações de validade */}
                                  {produto.temValidade && produto.dataValidade && (
                                   <p>
                                    <span className="font-medium">Validade:</span> {(() => {
                                      const [ano, mes, dia] = produto.dataValidade.split('-')
                                      return `${dia}/${mes}/${ano}`
                                    })()}
                                    <span className="ml-1">({validadeInfo.textoVencimento})</span>
                                   </p>
                                  )}
                                </div>

                                {/* Status do estoque e validade */}
                                <div className="mt-2 flex flex-wrap items-center gap-1">
                                  {produto.estoque === 0 ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      🚫 Sem estoque
                                    </span>
                                  ) : produto.estoque <= produto.estoqueMinimo ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      ⚠️ Estoque baixo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✅ Estoque normal
                                    </span>
                                  )}

                                  {produto.codigoBarras && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      📱 Escaneável
                                    </span>
                                  )}

                                  {/* Badges de validade */}
                                  {produto.temValidade && (
                                    <>
                                      {validadeInfo.status === 'vencido' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          🚨 Vencido
                                        </span>
                                      )}
                                      {validadeInfo.status === 'vence_hoje' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          ⏰ Vence hoje
                                        </span>
                                      )}
                                      {validadeInfo.status === 'vence_em_7_dias' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          📅 {validadeInfo.textoVencimento}
                                        </span>
                                      )}
                                      {validadeInfo.status === 'proximo_vencimento' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          ⚠️ Próximo do vencimento
                                        </span>
                                      )}
                                      {validadeInfo.status === 'valido' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          📅 Válido
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Ações Mobile */}
                              <div className="flex flex-col space-y-2 ml-4">
                                <LoadingButton
                                  onClick={() => handleEdit(produto)}
                                  isLoading={loading}
                                  variant="primary"
                                  size="sm"
                                  className="text-xs px-2 py-1"
                                >
                                  ✏️
                                </LoadingButton>
                                <LoadingButton
                                  onClick={() => toggleStatus(produto.id)}
                                  isLoading={loading}
                                  variant={produto.ativo ? "warning" : "success"}
                                  size="sm"
                                  className="text-xs px-2 py-1"
                                >
                                  {produto.ativo ? '⏸️' : '▶️'}
                                </LoadingButton>
                                <LoadingButton
                                  onClick={() => handleDelete(produto.id)}
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

                  {/* Versão Desktop - Tabela */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>  
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código de Barras
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estoque
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valores
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Validade
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {produtosFiltrados.map((produto) => {
                          const validadeInfo = verificarValidade(produto)
                          const dadosCategoria = obterDadosCategoria(produto)
                          
                          return (
                            <tr key={produto.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{produto.nome}</div>
                                  <div className="text-sm text-gray-500">
                                    #{produto.codigo}
                                    {produto.marca && ` • ${produto.marca}`}
                                    {produto.modelo && ` • ${produto.modelo}`}
                                  </div>
                                </div>
                              </td>
                              
                              {/* Categoria com visual */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white mr-3"
                                    style={{ backgroundColor: dadosCategoria.cor }}
                                  >
                                    <span className="text-sm">{dadosCategoria.icone}</span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{dadosCategoria.nome}</div>
                                    {produto.categoriaId && (
                                      <div className="text-xs text-gray-500">Personalizada</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {produto.codigoBarras ? (
                                  <div>
                                    <div className="font-mono text-xs">{produto.codigoBarras}</div>
                                    <div className="text-xs text-blue-600">📱 Escaneável</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Não cadastrado</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <div className="font-medium">{produto.estoque} unidades</div>
                                  <div className="text-gray-500">Mín: {produto.estoqueMinimo}</div>
                                </div>
                                <div className="mt-1">
                                  {produto.estoque === 0 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      🚫 Sem estoque
                                    </span>
                                  ) : produto.estoque <= produto.estoqueMinimo ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      ⚠️ Estoque baixo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✅ Normal
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>Compra: R$ {produto.valorCompra.toFixed(2)}</div>
                                <div>Venda: R$ {produto.valorVenda.toFixed(2)}</div>
                              </td>
                              
                              {/* Coluna de validade */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {produto.temValidade && produto.dataValidade ? (
                                  <div>
                                    <div className="text-sm text-gray-900">
                                      {(() => {
                                        const [ano, mes, dia] = produto.dataValidade.split('-')
                                        return `${dia}/${mes}/${ano}`
                                      })()}
                                    </div>
                                    <div className="mt-1">
                                      {validadeInfo.status === 'vencido' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          🚨 Vencido
                                        </span>
                                      )}
                                      {validadeInfo.status === 'vence_hoje' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          ⏰ Vence hoje
                                        </span>
                                      )}
                                      {validadeInfo.status === 'vence_em_7_dias' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          📅 {validadeInfo.textoVencimento}
                                        </span>
                                      )}
                                      {validadeInfo.status === 'proximo_vencimento' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                          ⚠️ {validadeInfo.diasRestantes} dias
                                        </span>
                                      )}
                                      {validadeInfo.status === 'valido' && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          ✅ Válido
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Sem validade</span>
                                )}
                              </td>
                              
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  produto.ativo
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {produto.ativo ? '✅ Ativo' : '❌ Inativo'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <LoadingButton
                                    onClick={() => handleEdit(produto)}
                                    isLoading={loading}
                                    variant="primary"
                                    size="sm"
                                  >
                                    ✏️
                                  </LoadingButton>
                                  <LoadingButton
                                    onClick={() => toggleStatus(produto.id)}
                                    isLoading={loading}
                                    variant={produto.ativo ? "warning" : "success"}
                                    size="sm"
                                  >
                                    {produto.ativo ? '⏸️' : '▶️'}
                                  </LoadingButton>
                                  <LoadingButton
                                    onClick={() => handleDelete(produto.id)}
                                    isLoading={loading}
                                    variant="danger"
                                    size="sm"
                                  >
                                    🗑️
                                  </LoadingButton>
                                </div>
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

          {/* Estatísticas finais */}
          {!loadingProdutos && produtos && produtos.length > 0 && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-6">📊 Resumo dos Produtos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-blue-600">{produtos.filter(p => p.ativo).length}</div>
                  <div className="text-blue-600 text-sm font-medium">Produtos Ativos</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-green-600">{produtos.filter(p => p.codigoBarras).length}</div>
                  <div className="text-green-600 text-sm font-medium">Com Código de Barras</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-red-600">{produtos.filter(p => p.estoque === 0).length}</div>
                  <div className="text-red-600 text-sm font-medium">Sem Estoque</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-yellow-600">{produtos.filter(p => p.estoque <= p.estoqueMinimo && p.estoque > 0).length}</div>
                  <div className="text-yellow-600 text-sm font-medium">Estoque Baixo</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-orange-600">{estatisticasValidade.comValidade}</div>
                  <div className="text-orange-600 text-sm font-medium">Com Validade</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-lg font-bold text-purple-600">
                    R$ {produtos.filter(p => p.ativo).reduce((total, p) => total + (p.estoque * p.valorCompra), 0).toFixed(2)}
                  </div>
                  <div className="text-purple-600 text-sm font-medium">Valor Estoque</div>
                </div>
              </div>

              {/* Alertas de validade no resumo */}
              {(estatisticasValidade.vencidos > 0 || estatisticasValidade.vencendoHoje > 0 || estatisticasValidade.vencendoEm7Dias > 0) && (
                <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <h4 className="font-bold text-red-800 mb-3">🚨 Alertas de Validade:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {estatisticasValidade.vencidos > 0 && (
                      <div className="text-red-700 bg-white p-2 rounded">
                        <strong>{estatisticasValidade.vencidos}</strong> produto(s) vencido(s)
                      </div>
                    )}
                    {estatisticasValidade.vencendoHoje > 0 && (
                      <div className="text-orange-700 bg-white p-2 rounded">
                        <strong>{estatisticasValidade.vencendoHoje}</strong> vencendo hoje
                      </div>
                    )}
                    {estatisticasValidade.vencendoEm7Dias > 0 && (
                      <div className="text-yellow-700 bg-white p-2 rounded">
                        <strong>{estatisticasValidade.vencendoEm7Dias}</strong> vencendo em 7 dias
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Informações sobre sistema inteligente */}
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="text-3xl">📱</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-blue-800 mb-2">
                  Sistema de Código de Barras
                </h3>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>• <strong>Cadastre códigos de barras</strong> nos produtos para vendas mais rápidas</p>
                  <p>• <strong>Use a câmera</strong> do celular/computador para escanear códigos</p>
                  <p>• <strong>Compatível com leitores físicos</strong> quando conectados ao computador</p>
                  <p>• <strong>PDV otimizado</strong> para vendas com código de barras</p>
                  <p>• <strong>Busca inteligente</strong> por código de barras nos filtros</p>
                  <p>• <strong>Dados sincronizados</strong> em tempo real com o Firebase</p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  )
}