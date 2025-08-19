// src/app/produtos/page.tsx - VERSÃO FINAL CORRIGIDA COM CONTAGEM DE CÓDIGOS
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

// 🆕 INTERFACE PRODUTO CORRIGIDA
interface Produto {
  id: string
  codigo: string
  nome: string
  categoria: string
  categoriaId?: string
  codigosBarras: Record<string, number>  // 🆕 Objeto com código: quantidade
  temCodigoBarras: boolean
  isDestilado: boolean
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

// 🆕 INTERFACE MOVIMENTACAO PARA SINCRONIZAÇÃO
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
  codigoBarrasUsado?: string
  clienteId?: string
  clienteNome?: string
  clienteCpfCnpj?: string
  formaPagamento?: string
  valorPago?: number
  troco?: number
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

// 🆕 COMPONENTE GERENCIADOR DE CÓDIGOS CORRIGIDO
interface GerenciadorCodigosBarrasProps {
  codigos: Record<string, number>  // 🆕 Mudança aqui
  onChange: (codigos: Record<string, number>) => void  // 🆕 Mudança aqui
  disabled?: boolean
  onScanear?: () => void
  produtoId?: string
  ultimasMovimentacoes?: Movimentacao[]
}

function GerenciadorCodigosBarras({ 
  codigos, 
  onChange, 
  disabled, 
  onScanear,
  produtoId,
  ultimasMovimentacoes 
}: GerenciadorCodigosBarrasProps) {
  const [novoCodigo, setNovoCodigo] = useState('')
  const [quantidade, setQuantidade] = useState(1)

  // 🆕 VERIFICAR QUANTIDADE DE CÓDIGO ESPECÍFICO
  const verificarQuantidadeDisponivel = useCallback((codigo: string) => {
    return codigos[codigo] || 0
  }, [codigos])

  // 🆕 VERIFICAR SE CÓDIGO FOI USADO RECENTEMENTE
  const verificarUsoRecente = useCallback((codigo: string) => {
    if (!ultimasMovimentacoes || !produtoId) return null

    const usoRecente = ultimasMovimentacoes
      .filter(mov => mov.produtoId === produtoId && mov.codigoBarrasUsado === codigo)
      .sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime())[0]

    return usoRecente
  }, [ultimasMovimentacoes, produtoId])

  // 🆕 ADICIONAR COM QUANTIDADE
  const adicionarCodigo = () => {
    if (novoCodigo.trim()) {
      const novosCodigos = { ...codigos }
      novosCodigos[novoCodigo.trim()] = (novosCodigos[novoCodigo.trim()] || 0) + quantidade
      onChange(novosCodigos)
      setNovoCodigo('')
      setQuantidade(1)
    }
  }

  // 🆕 REMOVER CÓDIGO COMPLETAMENTE
  const removerCodigo = (codigo: string) => {
    const novosCodigos = { ...codigos }
    delete novosCodigos[codigo]
    onChange(novosCodigos)
  }

  // 🆕 ALTERAR QUANTIDADE DE UM CÓDIGO
  const alterarQuantidade = (codigo: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerCodigo(codigo)
    } else {
      const novosCodigos = { ...codigos }
      novosCodigos[codigo] = novaQuantidade
      onChange(novosCodigos)
    }
  }

  // 🆕 REPLICAR CÓDIGO
  const replicarCodigo = (codigo: string) => {
    const quantidadeAdicional = prompt('Quantas unidades adicionais?', '1')
    if (quantidadeAdicional && parseInt(quantidadeAdicional) > 0) {
      alterarQuantidade(codigo, verificarQuantidadeDisponivel(codigo) + parseInt(quantidadeAdicional))
    }
  }

  return (
    <div className="space-y-4">
      {/* Campo para adicionar novo código */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div className="sm:col-span-2">
          <input
            type="text"
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarCodigo()}
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
            placeholder="Digite ou escaneie um código de barras"
            disabled={disabled}
          />
        </div>
        <div>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm text-sm transition-all duration-200"
            placeholder="Qtd"
            disabled={disabled}
          />
        </div>
        <div className="flex space-x-1">
          <LoadingButton
            type="button"
            onClick={adicionarCodigo}
            variant="primary"
            size="sm"
            disabled={disabled || !novoCodigo.trim()}
            className="flex-1"
          >
            ➕
          </LoadingButton>
          {onScanear && (
            <LoadingButton
              type="button"
              onClick={onScanear}
              variant="secondary"
              size="sm"
              disabled={disabled}
            >
              📱
            </LoadingButton>
          )}
        </div>
      </div>

      {/* Lista de códigos com quantidades */}
      {Object.keys(codigos).length > 0 && (
        <div className="space-y-2">
          <h6 className="text-sm font-bold text-gray-800">
            Códigos cadastrados ({Object.keys(codigos).length} tipos, {Object.values(codigos).reduce((a, b) => a + b, 0)} unidades):
          </h6>
          <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded-lg border">
            {Object.entries(codigos).map(([codigo, qtd]) => {
              const usoRecente = verificarUsoRecente(codigo)
              
              return (
                <div key={codigo} className={`flex items-center justify-between p-3 rounded border ${
                  usoRecente ? 'bg-red-50 border-red-200' : 'bg-white'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-900">{codigo}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(codigo, qtd - 1)}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          disabled={disabled || qtd <= 1}
                        >
                          ➖
                        </button>
                        <span className="font-bold text-blue-600 min-w-[3rem] text-center bg-blue-50 px-2 py-1 rounded">
                          {qtd} un.
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(codigo, qtd + 1)}
                          className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50 transition-colors"
                          disabled={disabled}
                        >
                          ➕
                        </button>
                      </div>
                    </div>
                    {/* 🆕 ALERTA DE USO RECENTE */}
                    {usoRecente && (
                      <div className="text-xs text-red-600 mt-1 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {usoRecente.tipo === 'saida' ? 'Usado em venda' : 'Usado em entrada'} em {usoRecente.data}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-3">
                    <button
                      type="button"
                      onClick={() => replicarCodigo(codigo)}
                      className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      disabled={disabled}
                      title="Adicionar mais unidades"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      onClick={() => removerCodigo(codigo)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      disabled={disabled}
                      title="Remover código completamente"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dicas atualizadas */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Sistema de contagem:</strong> Cada código registra quantas unidades existem</p>
        <p>🔄 <strong>Vendas:</strong> Cada venda remove apenas 1 unidade do código específico</p>
        <p>📋 <strong>Gestão:</strong> Use ➕/➖ para ajustar quantidades ou 📋 para adicionar mais</p>
        {produtoId && (
          <p>🔄 <strong>Sincronização:</strong> Quantidades são atualizadas automaticamente quando usadas em vendas</p>
        )}
      </div>
    </div>
  )
}

// Categorias inteligentes (MANTIDAS ORIGINAIS)
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
  
  // Margem dinâmica baseada no estado da sidebar
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
  
  // Hook para categorias Firestore
  const { 
    data: categoriasFirestore,
    loading: loadingCategorias
  } = useFirestore<CategoriaFirestore>('categorias')
  
  // Hook para movimentações (para sincronização)
  const { 
    data: movimentacoes,
    loading: loadingMovimentacoes
  } = useFirestore<Movimentacao>('movimentacoes')
  
  // Hooks do Firestore
  const { 
    data: produtos, 
    loading: loadingProdutos, 
    addDocument, 
    updateDocument, 
    deleteDocument,
    refetch: refetchProdutos
  } = useFirestore<Produto>('produtos')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date>(new Date())
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Estados para categoria inteligente
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')
  const [camposEspecificos, setCamposEspecificos] = useState<Record<string, any>>({})

  // 🆕 ESTADOS DO FORMULÁRIO CORRIGIDOS
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    categoriaId: '',
    codigosBarras: {} as Record<string, number>,  // 🆕 Objeto em vez de array
    temCodigoBarras: true,
    isDestilado: false,
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

  // ✅ VERSÃO CORRIGIDA - SEM LOOP INFINITO
useEffect(() => {
  if (movimentacoes && produtos && produtos.length > 0) {
    const agora = new Date()
    const diferencaMs = agora.getTime() - ultimaSincronizacao.getTime()
    const diferencaMinutos = diferencaMs / (1000 * 60)

    // Só sincroniza se passou mais de 5 minutos (evita spam)
    if (diferencaMinutos > 5) {
      console.log('🔄 Sincronização programada (5+ minutos desde a última)')
      
      // 🆕 USE UM TIMEOUT PARA EVITAR LOOP
      setTimeout(() => {
        refetchProdutos()
      }, 1000)
      
      setUltimaSincronizacao(agora)
    }
  }
}, [movimentacoes]) // ✅ REMOVIDO: produtos, ultimaSincronizacao, refetchProdutos

  // Alertas de códigos removidos
  useEffect(() => {
    if (movimentacoes && produtos) {
      const movimentacoesRecentes = movimentacoes
        .filter(mov => {
          const dataMovimentacao = new Date(mov.data.split('/').reverse().join('-'))
          const ontem = new Date()
          ontem.setDate(ontem.getDate() - 1)
          return dataMovimentacao >= ontem && mov.tipo === 'saida' && mov.codigoBarrasUsado
        })

      if (movimentacoesRecentes.length > 0) {
        const codigosRemovidos = movimentacoesRecentes.length
        if (codigosRemovidos > 0) {
          console.log(`📱 ${codigosRemovidos} códigos foram utilizados em movimentações recentes`)
        }
      }
    }
  }, [movimentacoes, produtos])

  // Categorias ativas Firestore
  const categoriasAtivasFirestore = useMemo(() => {
    return categoriasFirestore?.filter(cat => cat.ativo) || []
  }, [categoriasFirestore])

  // Função para obter dados da categoria
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

  // Gerar próximo código automaticamente
  const gerarProximoCodigo = () => {
    if (!produtos) return '001'
    const produtosAtivos = produtos.filter(p => p.ativo)
    const proximoNumero = produtosAtivos.length + 1
    return proximoNumero.toString().padStart(3, '0')
  }

  // Função para lidar com mudança de categoria Firestore
  const handleCategoriaFirestoreChange = (categoriaId: string) => {
    const categoria = categoriasFirestore?.find(cat => cat.id === categoriaId)
    
    if (categoria) {
      setFormData(prev => ({
        ...prev,
        categoria: categoria.nome,
        categoriaId: categoriaId,
        temValidade: false,
        isDestilado: false
      }))
      
      setCategoriaSelecionada('')
      setCamposEspecificos({})
    }
  }

  // Função para lidar com mudança de categoria inteligente
  const handleCategoriaChange = (nomeCategoria: string) => {
    const categoriaInteligente = CATEGORIAS_INTELIGENTES.find(cat => cat.nome === nomeCategoria)
    
    setFormData(prev => ({
      ...prev,
      categoria: nomeCategoria,
      categoriaId: '',
      temValidade: categoriaInteligente?.temValidade || false,
      isDestilado: false
    }))
    
    setCategoriaSelecionada(categoriaInteligente?.id || '')
    setCamposEspecificos({})
  }

  // Função para lidar com campos específicos
  const handleCampoEspecifico = (campo: string, valor: any) => {
    setCamposEspecificos(prev => ({
      ...prev,
      [campo]: valor
    }))

    if (campo === 'nome') {
      setFormData(prev => ({
        ...prev,
        nome: valor
      }))
    }
  }

  // 🆕 FUNÇÃO PARA VALIDAR CÓDIGOS ÚNICOS CORRIGIDA
  const validarCodigosUnicos = (novoscodigos: Record<string, number>, produtoEditando?: string) => {
    if (!produtos) return true

    for (const codigo of Object.keys(novoscodigos)) {
      const produtoExistente = produtos.find(p => 
        p.codigosBarras && Object.keys(p.codigosBarras).includes(codigo) && p.id !== produtoEditando
      )
      
      if (produtoExistente) {
        toast.error(
          'Código duplicado!', 
          `O código "${codigo}" já está sendo usado no produto "${produtoExistente.nome}"`
        )
        return false
      }
    }
    return true
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

  // 🆕 FUNÇÃO SIMULAR LEITURA CORRIGIDA
  const simularLeituraCodigoBarras = () => {
    const codigoSimulado = Math.random().toString().substr(2, 13)
    const novoscodigos = { ...formData.codigosBarras }
    novoscodigos[codigoSimulado] = (novoscodigos[codigoSimulado] || 0) + 1
    
    if (validarCodigosUnicos({ [codigoSimulado]: 1 }, editingId || undefined)) {
      setFormData({...formData, codigosBarras: novoscodigos})
      pararScanner()
      toast.success('Código escaneado!', `Código: ${codigoSimulado} adicionado`)
    }
  }

  // 🆕 FUNÇÃO resetForm CORRIGIDA
  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: '',
      categoriaId: '',
      codigosBarras: {},  // 🆕 Objeto vazio
      temCodigoBarras: true,
      isDestilado: false,
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

  // 🆕 FUNÇÃO handleSubmit CORRIGIDA
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!user) {
      toast.error('Erro de autenticação', 'Usuário não encontrado!')
      return
    }

    setLoading(true)
    try {
      const nomeParaValidar = camposEspecificos.nome || formData.nome
      if (!nomeParaValidar || !formData.categoria) {
        toast.error('Campos obrigatórios', 'Preencha nome e categoria!')
        return
      }

      // 🆕 VALIDAÇÃO DE CÓDIGOS CORRIGIDA
      if (formData.temCodigoBarras && Object.keys(formData.codigosBarras).length === 0) {
        toast.warning('Código de barras obrigatório', 'Adicione pelo menos um código de barras ou desmarque a opção!')
        return
      }

      if (formData.temCodigoBarras && !validarCodigosUnicos(formData.codigosBarras, editingId || undefined)) {
        return
      }

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

      const temValidadeReal = formData.temValidade && !formData.isDestilado
      
      if (temValidadeReal && formData.dataValidade) {
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

      const dadosBasicos = {
        codigo: editingId ?
          produtos?.find(p => p.id === editingId)?.codigo || gerarProximoCodigo() :
          gerarProximoCodigo(),
        nome: nomeParaValidar,
        categoria: formData.categoria,
        codigosBarras: formData.temCodigoBarras ? formData.codigosBarras : {},  // 🆕 Objeto em vez de array
        temCodigoBarras: formData.temCodigoBarras,
        isDestilado: formData.isDestilado,
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

      const camposOpcionais: Partial<Produto> = {}

      if (formData.categoriaId && formData.categoriaId.trim() !== '') {
        camposOpcionais.categoriaId = formData.categoriaId
      }

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

      if (temValidadeReal) {
        camposOpcionais.temValidade = true
        if (formData.dataValidade && formData.dataValidade.trim() !== '') {
          camposOpcionais.dataValidade = formData.dataValidade
        }
        camposOpcionais.diasAlerta = diasAlerta
      } else {
        camposOpcionais.temValidade = false
      }

      if (Object.keys(camposEspecificos).length > 0) {
        const camposEspecificosFiltrados = Object.fromEntries(
          Object.entries(camposEspecificos).filter(([_, value]) => 
            value !== undefined && value !== null && value !== ''
          )
        )
        if (Object.keys(camposEspecificosFiltrados).length > 0) {
          camposOpcionais.camposEspecificos = camposEspecificosFiltrados
        }
      }

      const novoProduto = { ...dadosBasicos, ...camposOpcionais }

      const produtoLimpo = Object.fromEntries(
        Object.entries(novoProduto).filter(([_, value]) => value !== undefined)
      ) as Omit<Produto, 'id'>

      console.log('Produto a ser salvo:', produtoLimpo)

      if (editingId) {
        await updateDocument(editingId, produtoLimpo)
        toast.success('Produto atualizado!', 'Dados atualizados com sucesso!')
      } else {
        await addDocument(produtoLimpo)
        toast.success('Produto cadastrado!', `Código ${produtoLimpo.codigo} criado!`)
      }

      setTimeout(() => {
        refetchProdutos()
        setUltimaSincronizacao(new Date())
      }, 500)

      resetForm()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      toast.error('Erro ao salvar', 'Não foi possível salvar o produto!')
    } finally {
      setLoading(false)
    }
  }

  // 🆕 FUNÇÃO handleEdit CORRIGIDA
  const handleEdit = async (produto: Produto) => {
    setLoading(true)
    try {
      if (movimentacoes) {
        const movimentacoesRecentes = movimentacoes
          .filter(mov => mov.produtoId === produto.id && mov.tipo === 'saida' && mov.codigoBarrasUsado)
          .sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime())

        if (movimentacoesRecentes.length > 0) {
          const codigosUtilizados = movimentacoesRecentes.map(mov => mov.codigoBarrasUsado).filter(Boolean)
          if (codigosUtilizados.length > 0) {
            toast.info(
              'Códigos foram utilizados', 
              `${codigosUtilizados.length} código(s) foram utilizados em vendas recentes. Os dados serão atualizados.`
            )
            await refetchProdutos()
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 400))

      const categoriaInteligente = CATEGORIAS_INTELIGENTES.find(cat => cat.nome === produto.categoria)

      setFormData({
        nome: produto.nome,
        categoria: produto.categoria,
        categoriaId: produto.categoriaId || '',
        codigosBarras: produto.codigosBarras || {},  // 🆕 Objeto em vez de array
        temCodigoBarras: produto.temCodigoBarras ?? true,
        isDestilado: produto.isDestilado || false,
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
        
        setTimeout(() => {
          refetchProdutos()
          setUltimaSincronizacao(new Date())
        }, 500)
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

      setTimeout(() => {
        refetchProdutos()
        setUltimaSincronizacao(new Date())
      }, 500)
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status', 'Não foi possível alterar o status!')
    } finally {
      setLoading(false)
    }
  }

  // 🆕 FILTRAR PRODUTOS CORRIGIDO
  const produtosFiltrados = produtos ? produtos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.categoria.toLowerCase().includes(busca.toLowerCase()) ||
                      // 🆕 BUSCAR EM CÓDIGOS CORRIGIDO
                      Object.keys(produto.codigosBarras || {}).some(codigo => 
                        codigo.toLowerCase().includes(busca.toLowerCase())
                      ) ||
                      produto.marca?.toLowerCase().includes(busca.toLowerCase()) ||
                      produto.modelo?.toLowerCase().includes(busca.toLowerCase())

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

  // Categorias para filtro combinadas
  const categoriasParaFiltro = useMemo(() => {
    const categoriasProdutos = produtos ? [...new Set(produtos.map(p => p.categoria))].filter(Boolean) : []
    const categoriasFirestoreNomes = categoriasAtivasFirestore.map(cat => cat.nome)
    
    const todasCategorias = [...new Set([...categoriasProdutos, ...categoriasFirestoreNomes])]
    return todasCategorias.sort()
  }, [produtos, categoriasAtivasFirestore])

  // Estatísticas de validade
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

        <main className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed
           ? 'lg:ml-16 lg:mr-4'
           : 'max-w-7xl mx-auto lg:ml-64'
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
                <p className="text-gray-500 text-sm mt-2">Sincronizando dados com movimentações</p>
              </div>
            </div>
          )}

          {/* Alerta de sincronização ativa */}
          {!loadingProdutos && !loadingMovimentacoes && movimentacoes && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 animate-slide-up">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🔄</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Sistema Sincronizado com Contagem de Códigos
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>✅ Produtos atualizados automaticamente com sistema de contagem por código</p>
                    <p>📱 {movimentacoes.filter(m => m.codigoBarrasUsado).length} movimentações com códigos específicos registradas</p>
                    <p>🕒 Última sincronização: {ultimaSincronizacao.toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>
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
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Controle de Produtos</h1>
                <p className="text-sm text-gray-600 mt-1">Sistema com contagem inteligente de códigos múltiplos</p>
              </div>
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
                  onClick={() => router.push('/movimentacoes')}
                  variant="success"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  📋 Movimentações
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

          {/* Filtros */}
          {!loadingProdutos && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Filtros</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Buscar</label>
                  <input
                    type="text"
                    placeholder="Nome, código, marca, código de barras..."
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
                    <option value="com_validade">📅 Com validade</option>
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
                  <span className="text-blue-600">📱 {produtos.filter(p => p.codigosBarras && Object.keys(p.codigosBarras).length > 0).length} com código</span>
                  <span className="text-green-600">🔢 {produtos.reduce((total, p) => total + Object.values(p.codigosBarras || {}).reduce((a, b) => a + b, 0), 0)} unidades</span>
                  <span className="text-orange-600">📅 {estatisticasValidade.comValidade} com validade</span>
                  <span className="text-purple-600">🥃 {produtos.filter(p => p.isDestilado).length} destilados</span>
                </div>
              </div>
            </div>
          )}

          {/* FORMULÁRIO COM GERENCIADOR CORRIGIDO */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingId ? '✏️ Editar Produto' : '➕ Novo Produto'}
                    {editingId && movimentacoes && (
                      <span className="text-sm font-normal text-gray-600 block">
                        🔄 Sistema de contagem de códigos ativo
                      </span>
                    )}
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

                  {/* Seleção de categoria */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border-2 border-blue-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">🏷️ Categoria do Produto</h4>
                    
                    {/* Categorias Firestore */}
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

                    {/* Categorias Inteligentes */}
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

                    {/* Categoria selecionada */}
                    {formData.categoria && (
                      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <span className="text-sm text-purple-800">Categoria selecionada: </span>
                        <span className="font-bold text-purple-900">{formData.categoria}</span>
                        
                        {/* Checkbox destilado para bebidas */}
                        {formData.categoria === 'Bebidas' && (
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.isDestilado}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  isDestilado: e.target.checked,
                                  temValidade: e.target.checked ? false : prev.temValidade
                                }))}
                                disabled={loading}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <div className="flex items-center">
                                <span className="text-2xl mr-2">🥃</span>
                                <div>
                                  <span className="text-sm font-bold text-orange-800">É destilado ou bebida sem validade</span>
                                  <p className="text-xs text-orange-600">Whisky, vodka, cachaça, etc. não precisam de validade</p>
                                </div>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
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
                  {formData.categoria && !formData.isDestilado && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-orange-900">📅 Controle de Validade</h4>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.temValidade}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              temValidade: e.target.checked,
                              dataValidade: e.target.checked ? prev.dataValidade : '',
                            }))}
                            disabled={loading || formData.isDestilado}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-bold text-orange-800">Este produto tem validade</span>
                        </label>
                      </div>
                      
                      {formData.temValidade && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
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
                      )}
                       
                      {/* Preview de validade */}
                      {formData.temValidade && formData.dataValidade && (
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

                      {formData.isDestilado && (
                        <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800">
                            🥃 <strong>Produto destilado:</strong> A validade está desabilitada automaticamente para este tipo de bebida.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🆕 GERENCIADOR DE CÓDIGOS CORRIGIDO */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">📱 Códigos de Barras</h4>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.temCodigoBarras}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            temCodigoBarras: e.target.checked,
                            codigosBarras: e.target.checked ? prev.codigosBarras : {}  // 🆕 Objeto vazio
                          }))}
                          disabled={loading}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-bold text-gray-800">Este produto possui códigos de barras</span>
                      </label>
                    </div>
                    
                    {formData.temCodigoBarras ? (
                      <GerenciadorCodigosBarras
                        codigos={formData.codigosBarras}
                        onChange={(novoscodigos) => setFormData(prev => ({
                          ...prev,
                          codigosBarras: novoscodigos
                        }))}
                        disabled={loading}
                        onScanear={iniciarScanner}
                        produtoId={editingId || undefined}
                        ultimasMovimentacoes={movimentacoes || undefined}  // 🆕 CORRIGIDO
                      />
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-4xl mb-2">📝</div>
                        <h5 className="text-lg font-bold text-gray-700 mb-2">Produto sem código de barras</h5>
                        <p className="text-sm text-gray-600">
                          Ideal para produtos avulsos como: bala avulsa, cigarro solto, copo de 700ml, etc.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 No PDV haverá um campo especial para adicionar estes produtos rapidamente
                        </p>
                      </div>
                    )}
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

          {/* Lista de Produtos */}
          {!loadingProdutos && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">📋 Lista de Produtos com Contagem</h3>
              </div>

              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 animate-pulse">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                  <p className="text-gray-500 mb-4">
                    {!produtos || produtos.length === 0
                      ? 'Comece cadastrando produtos com sistema de contagem de códigos.'
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
                        const totalUnidades = Object.values(produto.codigosBarras || {}).reduce((a, b) => a + b, 0)
                        
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
                                  
                                  {/* 🆕 CÓDIGOS COM CONTAGEM */}
                                  {Object.keys(produto.codigosBarras || {}).length > 0 ? (
                                    <p>
                                      <span className="font-medium">Códigos:</span> 
                                      <span className="ml-1 text-blue-600">
                                        {Object.keys(produto.codigosBarras).length} tipo(s), {totalUnidades} unidades
                                      </span>
                                    </p>
                                  ) : (
                                    <p>
                                      <span className="font-medium">Códigos:</span> 
                                      <span className="text-gray-400">Sem código</span>
                                    </p>
                                  )}
                                  
                                  {produto.marca && (
                                    <p><span className="font-medium">Marca:</span> {produto.marca}</p>
                                  )}
                                  <p><span className="font-medium">Estoque:</span> {produto.estoque} unidades</p>
                                  <p><span className="font-medium">Compra:</span> R$ {produto.valorCompra.toFixed(2)}</p>
                                  <p><span className="font-medium">Venda:</span> R$ {produto.valorVenda.toFixed(2)}</p>
                                  
                                  {/* Informações de validade */}
                                  {produto.isDestilado ? (
                                    <p>
                                      <span className="font-medium">Validade:</span> 
                                      <span className="text-blue-600 ml-1">🥃 Destilado (sem validade)</span>
                                    </p>
                                  ) : produto.temValidade && produto.dataValidade ? (
                                   <p>
                                    <span className="font-medium">Validade:</span> {(() => {
                                      const [ano, mes, dia] = produto.dataValidade.split('-')
                                      return `${dia}/${mes}/${ano}`
                                    })()}
                                    <span className="ml-1">({validadeInfo.textoVencimento})</span>
                                   </p>
                                  ) : (
                                    <p>
                                      <span className="font-medium">Validade:</span> 
                                      <span className="text-gray-400 ml-1">Sem validade</span>
                                    </p>
                                  )}
                                </div>

                                {/* Status badges */}
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

                                  {/* Badge para códigos */}
                                  {Object.keys(produto.codigosBarras || {}).length > 0 ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      📱 {totalUnidades} un.
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      📝 Sem código
                                    </span>
                                  )}

                                  {/* Badge destilado */}
                                  {produto.isDestilado && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      🥃 Destilado
                                    </span>
                                  )}

                                  {/* Badges de validade */}
                                  {produto.temValidade && !produto.isDestilado && (
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
                            Códigos (Contagem)
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
                          const totalUnidades = Object.values(produto.codigosBarras || {}).reduce((a, b) => a + b, 0)
                          
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
                              
                              {/* 🆕 COLUNA CÓDIGOS COM CONTAGEM */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {Object.keys(produto.codigosBarras || {}).length > 0 ? (
                                  <div>
                                    <div className="font-bold text-blue-600 mb-1 flex items-center">
                                      📱 {Object.keys(produto.codigosBarras).length} código(s)
                                      <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                                        {totalUnidades} unidades
                                      </span>
                                    </div>
                                    <div className="space-y-1 max-h-20 overflow-y-auto">
                                      {Object.entries(produto.codigosBarras).slice(0, 3).map(([codigo, quantidade]) => (
                                        <div key={codigo} className="font-mono text-xs bg-gray-100 px-2 py-1 rounded flex justify-between">
                                          <span>{codigo}</span>
                                          <span className="font-bold text-blue-600">{quantidade}x</span>
                                        </div>
                                      ))}
                                      {Object.keys(produto.codigosBarras).length > 3 && (
                                        <div className="text-xs text-gray-500">
                                          +{Object.keys(produto.codigosBarras).length - 3} códigos mais...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-gray-400 mb-1">📝</div>
                                    <div className="text-xs text-gray-500">Sem código</div>
                                  </div>
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
                                {produto.isDestilado ? (
                                  <div className="text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      🥃 Destilado
                                    </span>
                                    <div className="text-xs text-gray-500 mt-1">Sem validade</div>
                                  </div>
                                ) : produto.temValidade && produto.dataValidade ? (
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
                                  <div className="text-center">
                                    <span className="text-gray-400 text-sm">♾️</span>
                                    <div className="text-xs text-gray-500">Sem validade</div>
                                  </div>
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

          {/* Estatísticas finais atualizadas */}
          {!loadingProdutos && produtos && produtos.length > 0 && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-6">📊 Resumo dos Produtos com Contagem</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-blue-600">{produtos.filter(p => p.ativo).length}</div>
                  <div className="text-blue-600 text-sm font-medium">Produtos Ativos</div>
                </div>

                {/* 🆕 ESTATÍSTICA DE CÓDIGOS COM CONTAGEM */}
                <div className="text-center p-4 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-2xl font-bold text-green-600">
                    {produtos.filter(p => p.codigosBarras && Object.keys(p.codigosBarras).length > 0).length}
                  </div>
                  <div className="text-green-600 text-sm font-medium">Com Códigos</div>
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

              {/* 🆕 RESUMO DE CÓDIGOS COM CONTAGEM DETALHADA */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xl font-bold text-blue-600">
                    {produtos.reduce((total, p) => total + Object.values(p.codigosBarras || {}).reduce((a, b) => a + b, 0), 0)}
                  </div>
                  <div className="text-blue-600 text-sm font-medium">Total de Unidades</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xl font-bold text-green-600">
                    {produtos.reduce((total, p) => total + Object.keys(p.codigosBarras || {}).length, 0)}
                  </div>
                  <div className="text-green-600 text-sm font-medium">Códigos Únicos</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-xl font-bold text-orange-600">
                    {produtos.filter(p => p.isDestilado).length}
                  </div>
                  <div className="text-orange-600 text-sm font-medium">Destilados</div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xl font-bold text-gray-600">
                    {produtos.filter(p => !p.temCodigoBarras).length}
                  </div>
                  <div className="text-gray-600 text-sm font-medium">Sem Código</div>
                </div>
              </div>

              {/* 🆕 ESTATÍSTICA DE SINCRONIZAÇÃO COM MOVIMENTAÇÕES */}
              {movimentacoes && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      {movimentacoes.filter(m => m.codigoBarrasUsado).length}
                    </div>
                    <div className="text-green-600 text-sm font-medium">Códigos Utilizados</div>
                  </div>

                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {movimentacoes.filter(m => m.tipo === 'entrada' && m.codigoBarrasUsado).length}
                    </div>
                    <div className="text-blue-600 text-sm font-medium">Entradas com Código</div>
                  </div>

                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">
                      {movimentacoes.filter(m => m.tipo === 'saida' && m.codigoBarrasUsado).length}
                    </div>
                    <div className="text-red-600 text-sm font-medium">Saídas com Código</div>
                  </div>
                </div>
              )}

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

          {/* 🆕 INFORMAÇÕES SOBRE SISTEMA COMPLETAMENTE INTEGRADO */}
          <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-xl p-6 animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="text-3xl">🎯</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  Sistema Avançado: Contagem Inteligente de Códigos
                </h3>
                <div className="text-sm text-green-700 space-y-2">
                  <p>• <strong>🔢 Contagem por código:</strong> Cada código registra quantas unidades existem</p>
                  <p>• <strong>📱 Scanner integrado:</strong> Adicione códigos diretamente com câmera ou digitação</p>
                  <p>• <strong>➕/➖ Controle granular:</strong> Ajuste quantidades individualmente por código</p>
                  <p>• <strong>🔄 Sincronização automática:</strong> Movimentações atualizam contagens em tempo real</p>
                  <p>• <strong>🛒 Integração PDV:</strong> Vendas decrementam unidades específicas do código usado</p>
                  <p>• <strong>📊 Relatórios detalhados:</strong> Veja quantas unidades há de cada código</p>
                  <p>• <strong>🥃 Destilados inteligentes:</strong> Bebidas destiladas automaticamente sem validade</p>
                  <p>• <strong>📝 Produtos sem código:</strong> Suporte a itens avulsos e personalizados</p>
                  <p>• <strong>🎨 Interface visual:</strong> Cores por categoria e indicadores claros</p>
                  <p>• <strong>✅ Validação robusta:</strong> Impede códigos duplicados entre produtos</p>
                  <p>• <strong>⚡ Performance otimizada:</strong> Sistema eficiente para grandes volumes</p>
                  <p>• <strong>🔔 Alertas inteligentes:</strong> Notificações quando códigos são utilizados</p>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  )
}