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

// 🆕 INTERFACE PRODUTO ATUALIZADA
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
  // Campos para validade
  temValidade?: boolean
  dataValidade?: string
  diasAlerta?: number
}

// 🆕 INTERFACE MOVIMENTACAO ATUALIZADA
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
  clienteId?: string           // 🆕 Dados do cliente
  clienteNome?: string
  clienteCpfCnpj?: string
  formaPagamento?: string
  valorPago?: number
  troco?: number
}

// 🆕 COMPONENTE GERENCIADOR DE CÓDIGOS DE BARRAS PARA ENTRADA
interface GerenciadorCodigosBarrasProps {
  codigosBarras: string[]
  onCodigosChange: (codigos: string[]) => void
  disabled?: boolean
}

function GerenciadorCodigosBarras({ codigosBarras, onCodigosChange, disabled }: GerenciadorCodigosBarrasProps) {
  const [novoCodigoInput, setNovoCodigoInput] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [quantidadeReplicacao, setQuantidadeReplicacao] = useState(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const adicionarCodigo = () => {
    const codigo = novoCodigoInput.trim()
    if (!codigo) return

    // Verificar se código já existe
    if (codigosBarras.includes(codigo)) {
      alert('Este código já foi adicionado!')
      return
    }

    // Adicionar o código (ou múltiplos se for replicação)
    const novosCodigos = []
    for (let i = 0; i < quantidadeReplicacao; i++) {
      if (quantidadeReplicacao === 1) {
        novosCodigos.push(codigo)
      } else {
        novosCodigos.push(`${codigo}_${i + 1}`)
      }
    }

    // Verificar duplicatas nos novos códigos
    const codigosUnicos = novosCodigos.filter(c => !codigosBarras.includes(c))
    
    onCodigosChange([...codigosBarras, ...codigosUnicos])
    setNovoCodigoInput('')
    setQuantidadeReplicacao(1)
    
    // Focar de volta no input
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const removerCodigo = (codigo: string) => {
    onCodigosChange(codigosBarras.filter(c => c !== codigo))
  }

  const limparTodosCodigos = () => {
    if (confirm('Tem certeza que deseja remover todos os códigos?')) {
      onCodigosChange([])
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
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error)
      alert('Não foi possível acessar a câmera')
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
    const codigoSimulado = `${Date.now()}`
    setNovoCodigoInput(codigoSimulado)
    pararScanner()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    adicionarCodigo()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-800">📱 Códigos de Barras da Entrada</h4>
        <div className="text-sm text-gray-600">
          {codigosBarras.length} código(s) adicionado(s)
        </div>
      </div>

      {/* Formulário para adicionar código */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              ref={inputRef}
              type="text"
              value={novoCodigoInput}
              onChange={(e) => setNovoCodigoInput(e.target.value)}
              placeholder="Digite ou escaneie o código de barras..."
              className="w-full border-2 border-gray-400 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
              disabled={disabled}
            />
          </div>
          
          <div className="flex space-x-2">
            <LoadingButton
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={!novoCodigoInput.trim() || disabled}
            >
              ➕ Adicionar
            </LoadingButton>
            <LoadingButton
              type="button"
              onClick={iniciarScanner}
              variant="secondary"
              size="md"
              disabled={disabled}
            >
              📷
            </LoadingButton>
          </div>
        </div>

        {/* Replicação de códigos iguais */}
        <div className="flex items-center space-x-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="text-sm font-medium text-blue-800">
            🔄 Replicar código para múltiplas unidades:
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={quantidadeReplicacao}
            onChange={(e) => setQuantidadeReplicacao(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 border border-blue-300 rounded px-2 py-1 text-center font-medium"
            disabled={disabled}
          />
          <span className="text-sm text-blue-700">unidades</span>
        </div>
      </form>

      {/* Lista de códigos adicionados */}
      {codigosBarras.length > 0 && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-bold text-gray-700">Códigos Adicionados:</h5>
            <LoadingButton
              onClick={limparTodosCodigos}
              variant="danger"
              size="sm"
              disabled={disabled}
            >
              🗑️ Limpar Todos
            </LoadingButton>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {codigosBarras.map((codigo, index) => (
              <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                <span className="font-mono text-sm text-gray-800">{codigo}</span>
                <button
                  onClick={() => removerCodigo(codigo)}
                  className="text-red-600 hover:text-red-800 transition-colors ml-2"
                  disabled={disabled}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl shadow-xl w-full max-w-md bg-white">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">📱 Scanner de Código</h3>
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
                <p className="text-sm mb-4 text-gray-600">
                  Aponte a câmera para o código de barras
                </p>
                <LoadingButton
                  onClick={simularLeituraCodigoBarras}
                  variant="primary"
                  size="md"
                  className="w-full"
                >
                  🎯 Simular Leitura (Teste)
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 🆕 COMPONENTE DE BUSCA INTELIGENTE ATUALIZADO COM MÚLTIPLOS CÓDIGOS
interface ProdutoSelectorProps {
  produtos: Produto[]
  categorias?: CategoriaFirestore[]
  onSelect: (produto: Produto | null, codigoEspecifico?: string) => void
  produtoSelecionado?: Produto | null
  codigoSelecionado?: string
  disabled?: boolean
}

function ProdutoSelector({ produtos, categorias, onSelect, produtoSelecionado, codigoSelecionado, disabled }: ProdutoSelectorProps) {
  const [busca, setBusca] = useState('')
  const [mostrarLista, setMostrarLista] = useState(false)
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>(produtos)
  const inputRef = useRef<HTMLInputElement>(null)

  // Função para obter dados da categoria
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
      produto.categoria?.toLowerCase().includes(termoBusca.toLowerCase()) ||
      // 🆕 BUSCAR EM CÓDIGOS DE BARRAS
      produto.codigosBarras?.some(codigo => 
        codigo.toLowerCase().includes(termoBusca.toLowerCase())
      )
    ).sort((a, b) => {
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
    
    if (!valor.trim()) {
      onSelect(null)
    }
  }

  const handleSelect = (produto: Produto, codigoEspecifico?: string) => {
    onSelect(produto, codigoEspecifico)
    setBusca(produto.nome)
    setMostrarLista(false)
  }

  const limparSelecao = () => {
    setBusca('')
    onSelect(null)
    setMostrarLista(false)
    setProdutosFiltrados(produtos)
  }

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
          placeholder="🔍 Busque por nome, código ou código de barras..."
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

      {/* 🆕 LISTA DE PRODUTOS COM CÓDIGOS MÚLTIPLOS */}
      {mostrarLista && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in">
          {produtosFiltrados.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {busca ? (
                <>
                  <div className="text-2xl mb-2">😔</div>
                  <div>Nenhum produto encontrado para "<strong>{busca}</strong>"</div>
                  <div className="text-xs text-gray-400 mt-1">Tente buscar por nome, código ou código de barras</div>
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
                const dadosCategoria = obterDadosCategoria(produto)
                
                return (
                  <div key={produto.id} className="border-b border-gray-100 last:border-b-0">
                    {/* Produto principal */}
                    <button
                      type="button"
                      onClick={() => handleSelect(produto)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-100 focus:outline-none transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
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
                            
                            {/* 🆕 MOSTRAR CÓDIGOS DE BARRAS DISPONÍVEIS */}
                            {produto.temCodigoBarras && produto.codigosBarras.length > 0 && (
                              <div className="text-xs text-blue-600 mt-1">
                                📱 {produto.codigosBarras.length} código(s) de barras
                              </div>
                            )}
                            {!produto.temCodigoBarras && (
                              <div className="text-xs text-yellow-600 mt-1">
                                📝 Sem código de barras
                              </div>
                            )}
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
                          {produto.isDestilado && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              🥃 Destilado
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

                    {/* 🆕 CÓDIGOS ESPECÍFICOS PARA SELEÇÃO */}
                    {produto.temCodigoBarras && produto.codigosBarras.length > 1 && (
                      <div className="px-4 pb-2 bg-gray-50">
                        <div className="text-xs text-gray-600 mb-2 font-medium">Selecionar código específico:</div>
                        <div className="grid grid-cols-1 gap-1">
                          {produto.codigosBarras.slice(0, 4).map((codigo, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSelect(produto, codigo)}
                              className="text-left p-2 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-blue-600">📱 {codigo}</span>
                                <span className="text-gray-500">Código {index + 1}</span>
                              </div>
                            </button>
                          ))}
                          {produto.codigosBarras.length > 4 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{produto.codigosBarras.length - 4} códigos adicionais
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              
              <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                {produtosFiltrados.length} produto(s) • ESC para fechar
              </div>
            </>
          )}
        </div>
      )}

      {/* 🆕 PRODUTO SELECIONADO COM CÓDIGO ESPECÍFICO */}
      {produtoSelecionado && !mostrarLista && (
        <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg animate-slide-down">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3 flex-1">
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
                  
                  {/* 🆕 CÓDIGO ESPECÍFICO SELECIONADO */}
                  {codigoSelecionado && (
                    <div className="flex items-center space-x-4 flex-wrap">
                      <span className="text-blue-800 font-medium">
                        <strong>Código selecionado:</strong> 
                        <span className="font-mono bg-blue-100 px-2 py-1 rounded ml-2">📱 {codigoSelecionado}</span>
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 flex-wrap">
                    <span><strong>Estoque atual:</strong> {produtoSelecionado.estoque} unidades</span>
                    <span><strong>Estoque mínimo:</strong> {produtoSelecionado.estoqueMinimo}</span>
                  </div>
                  <div className="flex items-center space-x-4 flex-wrap">
                    <span><strong>Preço compra:</strong> R$ {produtoSelecionado.valorCompra.toFixed(2)}</span>
                    <span><strong>Preço venda:</strong> R$ {produtoSelecionado.valorVenda.toFixed(2)}</span>
                  </div>

                  {/* 🆕 INFORMAÇÕES DE CÓDIGOS */}
                  {produtoSelecionado.temCodigoBarras && produtoSelecionado.codigosBarras.length > 0 && (
                    <div className="bg-blue-100 p-2 rounded border-l-4 border-blue-400">
                      <div className="text-xs text-blue-800">
                        <strong>📱 Códigos de barras ({produtoSelecionado.codigosBarras.length}):</strong>
                        <div className="mt-1 space-y-1">
                          {produtoSelecionado.codigosBarras.slice(0, 3).map((codigo, index) => (
                            <div key={index} className="font-mono text-xs">
                              • {codigo} {codigo === codigoSelecionado && <span className="text-green-600">(selecionado)</span>}
                            </div>
                          ))}
                          {produtoSelecionado.codigosBarras.length > 3 && (
                            <div className="text-xs text-blue-600">
                              +{produtoSelecionado.codigosBarras.length - 3} códigos adicionais
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!produtoSelecionado.temCodigoBarras && (
                    <div className="bg-yellow-100 p-2 rounded border-l-4 border-yellow-400">
                      <div className="text-xs text-yellow-800">
                        <strong>📝 Produto sem código de barras</strong>
                      </div>
                    </div>
                  )}

                  {produtoSelecionado.isDestilado && (
                    <div className="bg-purple-100 p-2 rounded border-l-4 border-purple-400">
                      <div className="text-xs text-purple-800">
                        <strong>🥃 Produto destilado - Sem controle de validade</strong>
                      </div>
                    </div>
                  )}
                  
                  {/* Validade do produto */}
                  {produtoSelecionado.temValidade && produtoSelecionado.dataValidade && !produtoSelecionado.isDestilado && (
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
  
  // Hooks do Firestore
  const { 
    data: categorias, 
    loading: loadingCategorias 
  } = useFirestore<CategoriaFirestore>('categorias')
  
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
  
  // 🆕 ESTADOS DO PRODUTO E CÓDIGO SELECIONADO
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [codigoSelecionado, setCodigoSelecionado] = useState<string>('')
  
  // 🆕 ESTADOS PARA CÓDIGOS DA ENTRADA
  const [novosCodigosEntrada, setNovosCodigosEntrada] = useState<string[]>([])
  
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
  const [filtroCategoria, setFiltroCategoria] = useState('')
  // 🆕 NOVO FILTRO POR CÓDIGO DE BARRAS
  const [filtroCodigoBarras, setFiltroCodigoBarras] = useState('')
  
  // Estados de ordenação
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'produto_asc' | 'valor_desc'>('data_desc')
  
  // Estados extras
  const [modoNoturno, setModoNoturno] = useState(false)
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([])
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false)

  // Função para obter dados da categoria
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

  // Categorias para filtro
  const categoriasParaFiltro = useMemo(() => {
    if (!categorias) return []
    return categorias.filter(cat => cat.ativo).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categorias])

  const produtosAtivos = produtos ? produtos.filter(p => p.ativo) : []
  const isLoadingData = loadingProdutos || loadingMovimentacoes || loadingCategorias

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        if (produtosAtivos.length > 0) {
          setShowForm(true)
        }
      }
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        document.getElementById('busca-movimentacoes')?.focus()
      }
      if (e.key === 'Escape' && showForm) {
        resetForm()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showForm, produtosAtivos.length])

  // 🆕 FUNÇÃO PARA SELECIONAR PRODUTO E CÓDIGO
  const handleProdutoSelect = (produto: Produto | null, codigoEspecifico?: string) => {
    setProdutoSelecionado(produto)
    setCodigoSelecionado(codigoEspecifico || '')
  }

  // 🆕 LIMPAR CÓDIGOS QUANDO TROCAR TIPO
  useEffect(() => {
    if (formData.tipo === 'saida') {
      setNovosCodigosEntrada([])
    }
  }, [formData.tipo])

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      quantidade: '',
      observacao: ''
    })
    setProdutoSelecionado(null)
    setCodigoSelecionado('')
    setNovosCodigosEntrada([])
    setShowForm(false)
  }

  // 🆕 FUNÇÃO handleSubmit TOTALMENTE ATUALIZADA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Erro de autenticação', 'Usuário não encontrado!')
      return
    }

    setLoading(true)
    try {
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

      // 🆕 VALIDAÇÃO ESPECÍFICA PARA SAÍDA COM CÓDIGO SELECIONADO
      if (formData.tipo === 'saida' && codigoSelecionado) {
        // Verificar se o código específico ainda existe no produto
        if (!produtoSelecionado.codigosBarras.includes(codigoSelecionado)) {
          toast.error('Código não encontrado', 'Este código de barras não está mais disponível no produto!')
          return
        }
      }

      if (formData.tipo === 'saida' && produtoSelecionado.estoque < quantidade) {
        toast.error('Estoque insuficiente', `Estoque atual: ${produtoSelecionado.estoque} unidades`)
        return
      }

      const novoEstoque = formData.tipo === 'entrada' 
        ? produtoSelecionado.estoque + quantidade 
        : produtoSelecionado.estoque - quantidade

      if (novoEstoque < 0) {
        toast.error('Erro no cálculo', 'Estoque não pode ficar negativo!')
        return
      }

      const valorUnitario = formData.tipo === 'entrada' ? produtoSelecionado.valorCompra : produtoSelecionado.valorVenda

      // 🆕 OBSERVAÇÃO COM CÓDIGO ESPECÍFICO E NOVOS CÓDIGOS
      let observacao = formData.observacao
      if (codigoSelecionado && codigoSelecionado !== produtoSelecionado.codigo) {
        observacao = `${observacao ? observacao + ' - ' : ''}Código usado: ${codigoSelecionado}`.trim()
      }
      if (formData.tipo === 'entrada' && novosCodigosEntrada.length > 0) {
        observacao = `${observacao ? observacao + ' - ' : ''}Novos códigos: ${novosCodigosEntrada.length}`.trim()
      }

      // 🆕 CAMPOS OBRIGATÓRIOS
      const novaMovimentacaoBase = {
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
        observacao,
        userId: user.uid
      }

      // 🆕 CAMPOS OPCIONAIS
      const camposOpcionais: Partial<Movimentacao> = {}

      if (codigoSelecionado && codigoSelecionado.trim() !== '') {
        camposOpcionais.codigoBarrasUsado = codigoSelecionado
      }

      // 🆕 COMBINAR E FILTRAR UNDEFINED
      const novaMovimentacao = { ...novaMovimentacaoBase, ...camposOpcionais }
      const movimentacaoLimpa = Object.fromEntries(
        Object.entries(novaMovimentacao).filter(([_, value]) => value !== undefined)
      ) as Omit<Movimentacao, 'id'>

      console.log('Movimentação a ser salva:', movimentacaoLimpa)

      // 🆕 ATUALIZAÇÃO DO PRODUTO COM LÓGICA DE CÓDIGOS
      let produtoAtualizado = { ...produtoSelecionado, estoque: novoEstoque }

      if (formData.tipo === 'entrada') {
        // 🆕 ENTRADA: ADICIONAR NOVOS CÓDIGOS AO PRODUTO
        if (novosCodigosEntrada.length > 0) {
          const codigosExistentes = produtoAtualizado.codigosBarras || []
          const novosCodigosLimpos = novosCodigosEntrada.filter(codigo => !codigosExistentes.includes(codigo))
          
          produtoAtualizado.codigosBarras = [...codigosExistentes, ...novosCodigosLimpos]
          produtoAtualizado.temCodigoBarras = true
          
          console.log('Códigos adicionados ao produto:', novosCodigosLimpos)
        }
      } else if (formData.tipo === 'saida' && codigoSelecionado) {
        // 🆕 SAÍDA: REMOVER CÓDIGO ESPECÍFICO DO PRODUTO
        const codigosAtualizados = produtoAtualizado.codigosBarras.filter(codigo => codigo !== codigoSelecionado)
        
        produtoAtualizado.codigosBarras = codigosAtualizados
        
        // Se não sobrou nenhum código, marcar como sem código
        if (codigosAtualizados.length === 0) {
          produtoAtualizado.temCodigoBarras = false
        }
        
        console.log('Código removido do produto:', codigoSelecionado)
        console.log('Códigos restantes:', codigosAtualizados)
      }

      // Salvar movimentação e atualizar produto
      await addMovimentacao(movimentacaoLimpa)
      await updateProduto(produtoSelecionado.id, produtoAtualizado)

      const tipoTexto = formData.tipo === 'entrada' ? 'Entrada' : 'Saída'
      const codigoTexto = codigoSelecionado ? ` (Código: ${codigoSelecionado})` : ''
      const codigosEntradaTexto = formData.tipo === 'entrada' && novosCodigosEntrada.length > 0 
        ? ` + ${novosCodigosEntrada.length} novos códigos` 
        : ''
      
      toast.success(
        `${tipoTexto} registrada!`, 
        `${quantidade} unidades de ${produtoSelecionado.nome}${codigoTexto}${codigosEntradaTexto}`
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

      const produto = produtos.find(p => p.id === movimentacao.produtoId)
      if (produto) {
        const estoqueRevertido = movimentacao.tipo === 'entrada' 
          ? produto.estoque - movimentacao.quantidade 
          : produto.estoque + movimentacao.quantidade
        
        if (estoqueRevertido >= 0) {
          // 🆕 REVERTER CÓDIGOS TAMBÉM SE NECESSÁRIO
          let produtoRevertido = { ...produto, estoque: estoqueRevertido }
          
          // Se foi uma entrada que adicionou códigos, tentar remover (complexo, por isso mantemos simples)
          // Se foi uma saída que removeu código, tentar re-adicionar (complexo, por isso mantemos simples)
          // Por simplicidade, apenas revertemos o estoque, mas poderíamos implementar lógica mais complexa
          
          await updateProduto(produto.id, produtoRevertido)
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

  // 🆕 FILTRAR MOVIMENTAÇÕES ATUALIZADO
  const movimentacoesFiltradas = movimentacoes ? movimentacoes.filter(mov => {
    const matchBusca = mov.produto.toLowerCase().includes(busca.toLowerCase()) ||
                      mov.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                      mov.observacao.toLowerCase().includes(busca.toLowerCase()) ||
                      // 🆕 BUSCAR POR CÓDIGO DE BARRAS USADO
                      (mov.codigoBarrasUsado && mov.codigoBarrasUsado.toLowerCase().includes(busca.toLowerCase()))
    
    const matchTipo = filtroTipo === '' || mov.tipo === filtroTipo
    const matchData = filtroData === '' || mov.data === filtroData
    const matchProduto = filtroProduto === '' || mov.codigo === filtroProduto
    
    // 🆕 FILTRO POR CÓDIGO DE BARRAS
    const matchCodigoBarras = filtroCodigoBarras === '' || 
                             (mov.codigoBarrasUsado && mov.codigoBarrasUsado.includes(filtroCodigoBarras))
    
    // Filtro por categoria
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
    
    return matchBusca && matchTipo && matchData && matchProduto && matchCategoria && matchPeriodo && matchCodigoBarras
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

  const datasUnicas = movimentacoes ? 
    [...new Set(movimentacoes.map(m => m.data))].sort().reverse() : []

  // 🆕 EXPORTAR DADOS ATUALIZADO
  const exportarDados = () => {
    if (movimentacoesFiltradas.length === 0) {
      toast.warning('Nenhum dado', 'Não há movimentações para exportar')
      return
    }

    const csv = [
      'Data,Hora,Produto,Código,Categoria,Tipo,Quantidade,Valor Unitário,Valor Total,Código de Barras Usado,Observação',
      ...movimentacoesFiltradas.map(mov => {
        const produto = produtos?.find(p => p.id === mov.produtoId)
        const categoria = produto ? obterDadosCategoria(produto).nome : 'N/A'
        const codigoBarrasUsado = mov.codigoBarrasUsado || 'N/A'
        
        return `${mov.data},${mov.hora},${mov.produto},${mov.codigo},${categoria},${mov.tipo},${mov.quantidade},${mov.valorUnitario.toFixed(2)},${mov.valorTotal.toFixed(2)},${codigoBarrasUsado},"${mov.observacao}"`
      })
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `movimentacoes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
    link.click()

    toast.success('Dados exportados!', 'Arquivo CSV baixado com múltiplos códigos')
  }

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
                  📋 Movimentações + Entrada de Códigos
                </h1>
                <p className={`text-sm mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Sistema completo com entrada e remoção automática de códigos
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

          {/* FILTROS (MANTIDOS IGUAIS) */}
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
                    placeholder="Produto, código ou código de barras..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                      modoNoturno 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-400 bg-white text-gray-900 placeholder-gray-600'
                    }`}
                  />
                </div>

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
                      setFiltroCategoria('')
                      setFiltroCodigoBarras('')
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200 animate-slide-down">
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
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>Código de Barras</label>
                    <input
                      type="text"
                      value={filtroCodigoBarras}
                      onChange={(e) => setFiltroCodigoBarras(e.target.value)}
                      placeholder="Digite o código de barras..."
                      className={`w-full border-2 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm transition-all duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-400 bg-white text-gray-900 placeholder-gray-600'
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
                  {(busca || filtroTipo || filtroData || filtroProduto || filtroDataInicio || filtroDataFim || filtroCategoria || filtroCodigoBarras) && (
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

          {/* 🆕 FORMULÁRIO COMPLETO COM ENTRADA DE CÓDIGOS */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className={`rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                    ➕ {formData.tipo === 'entrada' ? 'Entrada com Novos Códigos' : 'Saída com Remoção de Código'}
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
                  
                  {/* Busca de produto */}
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-800'}`}>
                      Produto *
                    </label>
                    <ProdutoSelector
                      produtos={produtosAtivos}
                      categorias={categorias || undefined}
                      onSelect={handleProdutoSelect}
                      produtoSelecionado={produtoSelecionado}
                      codigoSelecionado={codigoSelecionado}
                      disabled={loading}
                    />
                  </div>

                  {/* Tipo de movimentação */}
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
                        📥 Entrada + Códigos
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
                        📤 Saída - Remove Código
                      </button>
                    </div>
                  </div>

                  {/* 🆕 GERENCIADOR DE CÓDIGOS PARA ENTRADA */}
                  {formData.tipo === 'entrada' && produtoSelecionado && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
                      <GerenciadorCodigosBarras
                        codigosBarras={novosCodigosEntrada}
                        onCodigosChange={setNovosCodigosEntrada}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {/* Quantidade */}
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
                    
                    {produtoSelecionado && formData.tipo === 'saida' && formData.quantidade && (
                      <div className="mt-2">
                        {parseInt(formData.quantidade) > produtoSelecionado.estoque ? (
                          <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                            ⚠️ Quantidade maior que estoque disponível ({produtoSelecionado.estoque} unidades)
                          </div>
                        ) : (
                          <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">
                            ✅ Estoque suficiente. Restará {produtoSelecionado.estoque - parseInt(formData.quantidade)} unidades
                            {codigoSelecionado && (
                              <span className="block mt-1">📱 Código {codigoSelecionado} será removido do produto</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Observação */}
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

                  {/* 🆕 RESUMO COMPLETO DA MOVIMENTAÇÃO */}
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
                              <span className="text-gray-800 font-medium">Tipo:</span>
                              <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                                formData.tipo === 'entrada' 
                                  ? 'bg-green-200 text-green-800' 
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {formData.tipo === 'entrada' ? '📥 Entrada' : '�� Saída'}
                              </span>
                            </div>

                            {/* 🆕 CÓDIGOS DA ENTRADA */}
                            {formData.tipo === 'entrada' && novosCodigosEntrada.length > 0 && (
                              <div className="p-3 bg-blue-50 bg-opacity-70 rounded-lg border border-blue-200">
                                <span className="text-blue-800 font-medium block mb-2">📱 Novos códigos a serem adicionados:</span>
                                <div className="grid grid-cols-2 gap-1">
                                  {novosCodigosEntrada.slice(0, 6).map((codigo, index) => (
                                    <span key={index} className="font-mono text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
                                      {codigo}
                                    </span>
                                  ))}
                                  {novosCodigosEntrada.length > 6 && (
                                    <span className="text-xs text-blue-600">
                                      +{novosCodigosEntrada.length - 6} códigos
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 🆕 CÓDIGO ESPECÍFICO DA SAÍDA */}
                            {formData.tipo === 'saida' && codigoSelecionado && (
                              <div className="p-2 bg-red-50 bg-opacity-70 rounded-lg border border-red-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-red-800 font-medium">🗑️ Código a ser removido:</span>
                                  <span className="font-mono text-red-600 bg-red-100 px-2 py-1 rounded">📱 {codigoSelecionado}</span>
                                </div>
                              </div>
                            )}
                            
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
                                💡 <strong>Sistema automatizado:</strong> 
                                {formData.tipo === 'entrada' 
                                  ? ` Códigos serão adicionados ao produto automaticamente`
                                  : ` Código específico será removido do produto automaticamente`
                                }
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
                      loadingText="Processando..."
                      variant="primary"
                      size="md"
                      className="flex-1"
                      disabled={!produtoSelecionado || !formData.quantidade}
                    >
                      ✅ Registrar {formData.tipo === 'entrada' ? 'Entrada' : 'Saída'}
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

          {/* Lista de movimentações (VERSÃO REDUZIDA - MANTIDA ORIGINAL) */}
          {!isLoadingData && (
            <div className={`rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>📋 Histórico Completo</h3>
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
                      ? 'Comece registrando movimentações com entrada e remoção automática de códigos.'
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
                  {/* Versão Mobile - Cards Simplificada */}
                  <div className="block sm:hidden">
                    <div className={`divide-y ${modoNoturno ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {movimentacoesFiltradas.slice(0, 20).map((mov) => {
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
                                    <span className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>{mov.data}</span>
                                  </div>
                                  
                                  <h4 className={`text-sm font-bold truncate mb-1 ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{mov.produto}</h4>
                                  
                                  <div className={`space-y-1 text-xs ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {mov.codigoBarrasUsado && (
                                      <p className="flex items-center">
                                        <span className="font-medium mr-2">Código:</span>
                                        <span className="font-mono text-blue-600 bg-blue-100 px-1 py-0.5 rounded text-xs">
                                          📱 {mov.codigoBarrasUsado}
                                        </span>
                                      </p>
                                    )}
                                    <p><span className="font-medium">Qtd:</span> {mov.quantidade} • <span className="font-medium">Total:</span> R$ {mov.valorTotal.toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>

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

                  {/* Versão Desktop - Tabela Resumida */}
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
                            Data
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Produto
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Tipo
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Código Usado
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Quantidade
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Total
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${modoNoturno ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {movimentacoesFiltradas.slice(0, 50).map((mov) => (
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
                              {mov.data}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>{mov.produto}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                mov.tipo === 'entrada' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {mov.tipo === 'entrada' ? '��' : '��'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                              {mov.codigoBarrasUsado ? (
                                <span className="font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                                  📱 {mov.codigoBarrasUsado}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-900'}`}>
                              {mov.quantidade}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                              R$ {mov.valorTotal.toFixed(2)}
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
                        ))}
                      </tbody>
                    </table>
                    
                    {movimentacoesFiltradas.length > 50 && (
                      <div className={`text-center py-4 ${modoNoturno ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="text-sm">Mostrando 50 de {movimentacoesFiltradas.length} movimentações</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 🆕 INFORMAÇÕES FINAIS ATUALIZADAS */}
          {!isLoadingData && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🚀</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>
                    Sistema Completo: Entrada com Códigos + Remoção Automática
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-green-300' : 'text-green-700'}`}>
                    <p>• <strong>📥 Entrada inteligente:</strong> Cadastre múltiplos códigos de barras durante a entrada</p>
                    <p>• <strong>📱 Scanner integrado:</strong> Bipagem e replicação de códigos para múltiplas unidades</p>
                    <p>• <strong>🗑️ Remoção automática:</strong> Códigos específicos são removidos do produto na saída</p>
                    <p>• <strong>🔄 Controle granular:</strong> Rastreamento completo de qual código foi usado</p>
                    <p>• <strong>🎯 Validação inteligente:</strong> Sistema verifica disponibilidade dos códigos</p>
                    <p>• <strong>📊 Relatórios detalhados:</strong> Histórico completo com códigos específicos</p>
                    <p>• <strong>⚡ Automatização total:</strong> Sem trabalho manual para gerenciar códigos</p>
                    <p>• <strong>🔍 Filtros avançados:</strong> Busque por códigos específicos utilizados</p>
                    <p>• <strong>📋 Exportação completa:</strong> CSV com dados detalhados dos códigos</p>
                    <p>• <strong>🏆 Controle perfeito:</strong> Solução completa para múltiplos códigos de barras</p>
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