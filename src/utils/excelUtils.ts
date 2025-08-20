// src/utils/excelUtils.ts
import * as XLSX from 'xlsx'

// 📦 Interface para linha do Excel
export interface ProdutoExcel {
  codigo: string
  nome: string
  categoria: string
  marca?: string
  modelo?: string
  cor?: string
  tamanho?: string
  codigosBarras?: string // Formato: "codigo1:qtd1,codigo2:qtd2"
  temCodigoBarras: string // "SIM" ou "NÃO"
  isDestilado: string // "SIM" ou "NÃO"
  estoqueAtual: number
  estoqueMinimo: number
  valorCompra: number
  valorVenda: number
  temValidade: string // "SIM" ou "NÃO"
  dataValidade?: string // DD/MM/AAAA
  diasAlerta?: number
  ativo: string // "SIM" ou "NÃO"
  observacoes?: string
}

// 🎨 Configurações das colunas
export const COLUNAS_EXCEL = [
  { key: 'codigo', label: 'Código*', width: 12 },
  { key: 'nome', label: 'Nome do Produto*', width: 30 },
  { key: 'categoria', label: 'Categoria*', width: 20 },
  { key: 'marca', label: 'Marca', width: 15 },
  { key: 'modelo', label: 'Modelo', width: 15 },
  { key: 'cor', label: 'Cor', width: 12 },
  { key: 'tamanho', label: 'Tamanho', width: 12 },
  { key: 'codigosBarras', label: 'Códigos de Barras', width: 25 },
  { key: 'temCodigoBarras', label: 'Tem Código*', width: 12 },
  { key: 'isDestilado', label: 'É Destilado', width: 12 },
  { key: 'estoqueAtual', label: 'Estoque Atual*', width: 15 },
  { key: 'estoqueMinimo', label: 'Estoque Mínimo*', width: 15 },
  { key: 'valorCompra', label: 'Valor Compra*', width: 15 },
  { key: 'valorVenda', label: 'Valor Venda*', width: 15 },
  { key: 'temValidade', label: 'Tem Validade', width: 12 },
  { key: 'dataValidade', label: 'Data Validade', width: 15 },
  { key: 'diasAlerta', label: 'Dias Alerta', width: 12 },
  { key: 'ativo', label: 'Status*', width: 10 },
  { key: 'observacoes', label: 'Observações', width: 30 }
]

// 📝 Dados de exemplo para o template - CORRIGIDOS
export const EXEMPLO_PRODUTOS: ProdutoExcel[] = [
  {
    codigo: '001',
    nome: 'Coca-Cola 350ml',
    categoria: 'Bebidas',
    marca: 'Coca-Cola',
    modelo: 'Lata',
    cor: 'Vermelho',
    tamanho: '350ml',
    codigosBarras: '7894900011517:24,7894900011518:12',
    temCodigoBarras: 'SIM',
    isDestilado: 'NÃO',
    estoqueAtual: 100,
    estoqueMinimo: 20,
    valorCompra: 2.50,
    valorVenda: 4.00,
    temValidade: 'SIM',
    dataValidade: '31/12/2024',
    diasAlerta: 30,
    ativo: 'SIM',
    observacoes: 'Produto com boa saída'
  },
  {
    codigo: '002',
    nome: 'Whisky Johnnie Walker Red Label',
    categoria: 'Bebidas',
    marca: 'Johnnie Walker',
    modelo: 'Red Label',
    cor: 'Âmbar',
    tamanho: '1L',
    codigosBarras: '5000267014130:6',
    temCodigoBarras: 'SIM',
    isDestilado: 'SIM',
    estoqueAtual: 15,
    estoqueMinimo: 5,
    valorCompra: 85.00,
    valorVenda: 120.00,
    temValidade: 'NÃO', // ✅ CORRIGIDO
    dataValidade: '', // ✅ CORRIGIDO - Campo vazio para destilados
    diasAlerta: 0, // ✅ CORRIGIDO
    ativo: 'SIM',
    observacoes: 'Destilado - sem validade'
  },
  {
    codigo: '003',
    nome: 'Bala Halls Menta',
    categoria: 'Alimentos',
    marca: 'Halls',
    modelo: 'Original',
    cor: 'Verde',
    tamanho: 'Unidade',
    codigosBarras: '', // ✅ CORRIGIDO - Produto sem código
    temCodigoBarras: 'NÃO',
    isDestilado: 'NÃO',
    estoqueAtual: 200,
    estoqueMinimo: 50,
    valorCompra: 0.15,
    valorVenda: 0.25,
    temValidade: 'SIM',
    dataValidade: '15/06/2025',
    diasAlerta: 60,
    ativo: 'SIM',
    observacoes: 'Produto avulso - sem código'
  }
]

// 🎯 Gerar modelo Excel
export const gerarModeloExcel = (): void => {
  // Criar workbook
  const wb = XLSX.utils.book_new()

  // Criar planilha de instruções
  const wsInstrucoes = XLSX.utils.aoa_to_sheet([
    ['📋 INSTRUÇÕES PARA PREENCHIMENTO DO MODELO DE PRODUTOS'],
    [''],
    ['🔹 CAMPOS OBRIGATÓRIOS (marcados com *):'],
    ['  • Código: Use números sequenciais (001, 002, 003...)'],
    ['  • Nome do Produto: Nome completo e descritivo'],
    ['  • Categoria: Alimentos, Bebidas, Roupas e Acessórios, etc.'],
    ['  • Tem Código: SIM ou NÃO'],
    ['  • Estoque Atual: Quantidade atual em estoque'],
    ['  • Estoque Mínimo: Quantidade mínima para alertas'],
    ['  • Valor Compra: Preço de custo do produto'],
    ['  • Valor Venda: Preço de venda do produto'],
    ['  • Status: SIM (ativo) ou NÃO (inativo)'],
    [''],
    ['🔹 CÓDIGOS DE BARRAS:'],
    ['  • Formato: codigo1:quantidade1,codigo2:quantidade2'],
    ['  • Exemplo: 7894900011517:24,7894900011518:12'],
    ['  • Deixe vazio se não tiver código de barras'],
    [''],
    ['🔹 CAMPOS SIM/NÃO:'],
    ['  • Tem Código: SIM ou NÃO'],
    ['  • É Destilado: SIM (bebidas sem validade) ou NÃO'],
    ['  • Tem Validade: SIM ou NÃO'],
    ['  • Status: SIM (ativo) ou NÃO (inativo)'],
    [''],
    ['🔹 DATA DE VALIDADE:'],
    ['  • Formato: DD/MM/AAAA (exemplo: 31/12/2024)'],
    ['  • Deixe vazio se não tiver validade'],
    [''],
    ['🔹 DICAS IMPORTANTES:'],
    ['  • ✅ Preencha todos os campos obrigatórios'],
    ['  • ✅ Use o formato correto para datas'],
    ['  • ✅ Códigos devem ser únicos'],
    ['  • ✅ Valores devem usar ponto (.) para decimais'],
    ['  • ✅ Não altere os cabeçalhos das colunas'],
    [''],
    ['📞 Em caso de dúvidas, consulte o manual do sistema.']
  ])

  // Criar planilha com dados de exemplo
  const dadosParaExcel = [
    COLUNAS_EXCEL.map(col => col.label), // Cabeçalhos
    ...EXEMPLO_PRODUTOS.map(produto => 
      COLUNAS_EXCEL.map(col => produto[col.key as keyof ProdutoExcel] || '')
    )
  ]

  const wsDados = XLSX.utils.aoa_to_sheet(dadosParaExcel)

  // Configurar larguras das colunas
  wsDados['!cols'] = COLUNAS_EXCEL.map(col => ({ width: col.width }))

  // Aplicar estilo ao cabeçalho
  const range = XLSX.utils.decode_range(wsDados['!ref']!)
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!wsDados[cellAddress]) continue
    
    // Estilo do cabeçalho
    wsDados[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } }, // Roxo
      alignment: { horizontal: "center", vertical: "center" }
    }
  }

  // Adicionar planilhas ao workbook
  XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'INSTRUÇÕES')
  XLSX.utils.book_append_sheet(wb, wsDados, 'PRODUTOS')

  // Fazer download
  const nomeArquivo = `Modelo_Produtos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(wb, nomeArquivo)
}

// �� Exportar produtos atuais
export const exportarProdutos = (produtos: any[]): void => {
  const dadosParaExportar = produtos.map(produto => ({
    codigo: produto.codigo,
    nome: produto.nome,
    categoria: produto.categoria,
    marca: produto.marca || '',
    modelo: produto.modelo || '',
    cor: produto.cor || '',
    tamanho: produto.tamanho || '',
    codigosBarras: produto.codigosBarras ? 
      Object.entries(produto.codigosBarras)
        .map(([codigo, qtd]) => `${codigo}:${qtd}`)
        .join(',') : '',
    temCodigoBarras: produto.temCodigoBarras ? 'SIM' : 'NÃO',
    isDestilado: produto.isDestilado ? 'SIM' : 'NÃO',
    estoqueAtual: produto.estoque,
    estoqueMinimo: produto.estoqueMinimo,
    valorCompra: produto.valorCompra,
    valorVenda: produto.valorVenda,
    temValidade: produto.temValidade ? 'SIM' : 'NÃO',
    dataValidade: produto.dataValidade ? 
      new Date(produto.dataValidade).toLocaleDateString('pt-BR') : '',
    diasAlerta: produto.diasAlerta || 30,
    ativo: produto.ativo ? 'SIM' : 'NÃO',
    observacoes: ''
  }))

  const dadosParaExcel = [
    COLUNAS_EXCEL.map(col => col.label),
    ...dadosParaExportar.map(produto => 
      COLUNAS_EXCEL.map(col => produto[col.key as keyof typeof produto] || '')
    )
  ]

  const ws = XLSX.utils.aoa_to_sheet(dadosParaExcel)
  ws['!cols'] = COLUNAS_EXCEL.map(col => ({ width: col.width }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'PRODUTOS')

  const nomeArquivo = `Backup_Produtos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(wb, nomeArquivo)
}

// 📥 Processar arquivo importado
export const processarArquivoExcel = (file: File): Promise<ProdutoExcel[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Usar a primeira planilha ou a chamada "PRODUTOS"
        let sheetName = workbook.SheetNames.find(name => name === 'PRODUTOS') || workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length < 2) {
          throw new Error('Arquivo deve conter pelo menos o cabeçalho e uma linha de dados')
        }

        // Mapear colunas
        const headers = jsonData[0] as string[]
        const produtos: ProdutoExcel[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const produto: any = {}
          
          COLUNAS_EXCEL.forEach((col, index) => {
            const value = row[index]
            if (value !== undefined && value !== null && value !== '') {
              produto[col.key] = value
            }
          })

          // Validações básicas
          if (!produto.codigo || !produto.nome || !produto.categoria) {
            throw new Error(`Linha ${i + 1}: Campos obrigatórios faltando (código, nome, categoria)`)
          }

          produtos.push(produto)
        }

        resolve(produtos)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

// ✅ Validar dados do Excel
export const validarDadosExcel = (produtos: ProdutoExcel[]): { validos: boolean; erros: string[] } => {
  const erros: string[] = []
  const codigosUsados = new Set<string>()

  produtos.forEach((produto, index) => {
    const linha = index + 2 // +2 porque começamos da linha 2 (depois do cabeçalho)

    // Validar campos obrigatórios
    if (!produto.codigo?.toString().trim()) {
      erros.push(`Linha ${linha}: Código é obrigatório`)
    }

    if (!produto.nome?.toString().trim()) {
      erros.push(`Linha ${linha}: Nome é obrigatório`)
    }

    if (!produto.categoria?.toString().trim()) {
      erros.push(`Linha ${linha}: Categoria é obrigatória`)
    }

    // Validar código único
    const codigo = produto.codigo?.toString().trim()
    if (codigo) {
      if (codigosUsados.has(codigo)) {
        erros.push(`Linha ${linha}: Código "${codigo}" duplicado`)
      }
      codigosUsados.add(codigo)
    }

    // Validar valores numéricos
    if (produto.estoqueAtual !== undefined && (isNaN(Number(produto.estoqueAtual)) || Number(produto.estoqueAtual) < 0)) {
      erros.push(`Linha ${linha}: Estoque atual deve ser um número positivo`)
    }

    if (produto.estoqueMinimo !== undefined && (isNaN(Number(produto.estoqueMinimo)) || Number(produto.estoqueMinimo) < 0)) {
      erros.push(`Linha ${linha}: Estoque mínimo deve ser um número positivo`)
    }

    if (produto.valorCompra !== undefined && (isNaN(Number(produto.valorCompra)) || Number(produto.valorCompra) < 0)) {
      erros.push(`Linha ${linha}: Valor de compra deve ser um número positivo`)
    }

    if (produto.valorVenda !== undefined && (isNaN(Number(produto.valorVenda)) || Number(produto.valorVenda) < 0)) {
      erros.push(`Linha ${linha}: Valor de venda deve ser um número positivo`)
    }

    // Validar campos SIM/NÃO
    const camposSimNao = [
      { field: 'temCodigoBarras', label: 'Tem Código' },
      { field: 'isDestilado', label: 'É Destilado' },
      { field: 'temValidade', label: 'Tem Validade' },
      { field: 'ativo', label: 'Status' }
    ]

    camposSimNao.forEach(campo => {
      const valor = produto[campo.field as keyof ProdutoExcel]?.toString().toUpperCase()
      if (valor && !['SIM', 'NÃO', 'NAO'].includes(valor)) {
        erros.push(`Linha ${linha}: ${campo.label} deve ser "SIM" ou "NÃO"`)
      }
    })

    // Validar formato de data
    if (produto.dataValidade) {
      const data = produto.dataValidade.toString()
      const regex = /^\d{2}\/\d{2}\/\d{4}$/
      if (!regex.test(data)) {
        erros.push(`Linha ${linha}: Data de validade deve estar no formato DD/MM/AAAA`)
      }
    }

    // Validar formato de códigos de barras
    if (produto.codigosBarras) {
      const codigosStr = produto.codigosBarras.toString()
      const regex = /^[^:,]+:\d+(,[^:,]+:\d+)*$/
      if (!regex.test(codigosStr)) {
        erros.push(`Linha ${linha}: Códigos de barras devem estar no formato "codigo1:qtd1,codigo2:qtd2"`)
      }
    }
  })

  return {
    validos: erros.length === 0,
    erros
  }
}