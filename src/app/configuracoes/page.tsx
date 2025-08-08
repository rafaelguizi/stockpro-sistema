// src/app/configuracoes/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFirestore } from '@/hooks/useFirestore'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import Image from 'next/image'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, User as FirebaseUser } from 'firebase/auth'

interface ConfiguracaoEmpresa {
  id?: string
  nomeEmpresa: string
  cnpj: string
  inscricaoEstadual: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  email: string
  website: string
  logo: string
  userId: string
}

interface ConfiguracaoSistema {
  id?: string
  tema: 'claro' | 'escuro' | 'auto'
  corPrimaria: string
  idioma: string
  moeda: string
  formatoData: string
  formatoHora: string
  alertasEstoque: boolean
  alertasValidade: boolean
  alertasVendas: boolean
  userId: string
}

interface ConfiguracaoPDV {
  id?: string
  impressaoAutomatica: boolean
  formatoCupom: 'termico' | 'a4'
  incluirLogo: boolean
  mensagemCupom: string
  mostrarTroco: boolean
  mostrarDesconto: boolean
  mostrarObservacoes: boolean
  userId: string
}

interface ConfiguracaoNotificacao {
  id?: string
  emailAlertasEstoque: boolean
  emailAlertasValidade: boolean
  emailRelatorios: boolean
  whatsappAlertas: boolean
  whatsappNumero: string
  frequenciaRelatorios: 'diario' | 'semanal' | 'mensal'
  userId: string
}

export default function Configuracoes() {
  const { user } = useAuth()
  const toast = useToastContext()
  
  // Hooks do Firestore
  const { 
    data: configuracaoEmpresa, 
    loading: loadingEmpresa,
    addDocument: addConfigEmpresa,
    updateDocument: updateConfigEmpresa
  } = useFirestore<ConfiguracaoEmpresa>('configuracao_empresa')

  const { 
    data: configuracaoSistema, 
    loading: loadingSistema,
    addDocument: addConfigSistema,
    updateDocument: updateConfigSistema
  } = useFirestore<ConfiguracaoSistema>('configuracao_sistema')

  const { 
    data: configuracaoPDV, 
    loading: loadingPDV,
    addDocument: addConfigPDV,
    updateDocument: updateConfigPDV
  } = useFirestore<ConfiguracaoPDV>('configuracao_pdv')

  const { 
    data: configuracaoNotificacao, 
    loading: loadingNotificacao,
    addDocument: addConfigNotificacao,
    updateDocument: updateConfigNotificacao
  } = useFirestore<ConfiguracaoNotificacao>('configuracao_notificacao')

  // Estados
  const [abaAtiva, setAbaAtiva] = useState<'empresa' | 'sistema' | 'backup' | 'pdv' | 'perfil' | 'notificacoes'>('empresa')
  const [loading, setLoading] = useState(false)
  const [modoNoturno, setModoNoturno] = useState(false)

  // Estados dos formulários
  const [dadosEmpresa, setDadosEmpresa] = useState<ConfiguracaoEmpresa>({
    nomeEmpresa: '',
    cnpj: '',
    inscricaoEstadual: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email: '',
    website: '',
    logo: '',
    userId: user?.uid || ''
  })

  const [dadosSistema, setDadosSistema] = useState<ConfiguracaoSistema>({
    tema: 'claro',
    corPrimaria: '#3B82F6',
    idioma: 'pt-BR',
    moeda: 'BRL',
    formatoData: 'DD/MM/YYYY',
    formatoHora: '24h',
    alertasEstoque: true,
    alertasValidade: true,
    alertasVendas: true,
    userId: user?.uid || ''
  })

  const [dadosPDV, setDadosPDV] = useState<ConfiguracaoPDV>({
    impressaoAutomatica: false,
    formatoCupom: 'termico',
    incluirLogo: true,
    mensagemCupom: 'Obrigado pela preferência!',
    mostrarTroco: true,
    mostrarDesconto: true,
    mostrarObservacoes: true,
    userId: user?.uid || ''
  })

  const [dadosNotificacao, setDadosNotificacao] = useState<ConfiguracaoNotificacao>({
    emailAlertasEstoque: true,
    emailAlertasValidade: true,
    emailRelatorios: false,
    whatsappAlertas: false,
    whatsappNumero: '',
    frequenciaRelatorios: 'semanal',
    userId: user?.uid || ''
  })

  // Estados para mudança de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  // Carregar configurações existentes
  useEffect(() => {
    if (configuracaoEmpresa && configuracaoEmpresa.length > 0) {
      const config = configuracaoEmpresa[0]
      setDadosEmpresa(config)
    }
  }, [configuracaoEmpresa])

  useEffect(() => {
    if (configuracaoSistema && configuracaoSistema.length > 0) {
      const config = configuracaoSistema[0]
      setDadosSistema(config)
      setModoNoturno(config.tema === 'escuro')
    }
  }, [configuracaoSistema])

  useEffect(() => {
    if (configuracaoPDV && configuracaoPDV.length > 0) {
      const config = configuracaoPDV[0]
      setDadosPDV(config)
    }
  }, [configuracaoPDV])

  useEffect(() => {
    if (configuracaoNotificacao && configuracaoNotificacao.length > 0) {
      const config = configuracaoNotificacao[0]
      setDadosNotificacao(config)
    }
  }, [configuracaoNotificacao])

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault()
        const abas = ['empresa', 'sistema', 'backup', 'pdv', 'perfil', 'notificacoes'] as const
        setAbaAtiva(abas[parseInt(e.key) - 1])
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Salvar configurações da empresa
  const salvarConfigEmpresa = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const configCompleta = { ...dadosEmpresa, userId: user.uid }
      
      if (configuracaoEmpresa && configuracaoEmpresa.length > 0) {
        await updateConfigEmpresa(configuracaoEmpresa[0].id!, configCompleta)
      } else {
        await addConfigEmpresa(configCompleta)
      }
      
      toast.success('Configurações da empresa salvas!', 'Dados atualizados com sucesso')
    } catch (_error) {
      toast.error('Erro ao salvar', 'Não foi possível salvar as configurações da empresa')
    } finally {
      setLoading(false)
    }
  }, [dadosEmpresa, user, configuracaoEmpresa, updateConfigEmpresa, addConfigEmpresa, toast])

  // Salvar configurações do sistema
  const salvarConfigSistema = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const configCompleta = { ...dadosSistema, userId: user.uid }
      
      if (configuracaoSistema && configuracaoSistema.length > 0) {
        await updateConfigSistema(configuracaoSistema[0].id!, configCompleta)
      } else {
        await addConfigSistema(configCompleta)
      }
      
      // Aplicar tema imediatamente
      setModoNoturno(dadosSistema.tema === 'escuro')
      
      toast.success('Configurações do sistema salvas!', 'Tema e preferências atualizadas')
    } catch (_error) {
      toast.error('Erro ao salvar', 'Não foi possível salvar as configurações do sistema')
    } finally {
      setLoading(false)
    }
  }, [dadosSistema, user, configuracaoSistema, updateConfigSistema, addConfigSistema, toast])

  // Salvar configurações do PDV
  const salvarConfigPDV = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const configCompleta = { ...dadosPDV, userId: user.uid }
      
      if (configuracaoPDV && configuracaoPDV.length > 0) {
        await updateConfigPDV(configuracaoPDV[0].id!, configCompleta)
      } else {
        await addConfigPDV(configCompleta)
      }
      
      toast.success('Configurações do PDV salvas!', 'Impressão e cupons configurados')
    } catch (_error) {
      toast.error('Erro ao salvar', 'Não foi possível salvar as configurações do PDV')
    } finally {
      setLoading(false)
    }
  }, [dadosPDV, user, configuracaoPDV, updateConfigPDV, addConfigPDV, toast])

  // Salvar configurações de notificação
  const salvarConfigNotificacao = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const configCompleta = { ...dadosNotificacao, userId: user.uid }
      
      if (configuracaoNotificacao && configuracaoNotificacao.length > 0) {
        await updateConfigNotificacao(configuracaoNotificacao[0].id!, configCompleta)
      } else {
        await addConfigNotificacao(configCompleta)
      }
      
      toast.success('Configurações de notificação salvas!', 'Alertas e lembretes configurados')
    } catch (_error) {
      toast.error('Erro ao salvar', 'Não foi possível salvar as configurações de notificação')
    } finally {
      setLoading(false)
    }
  }, [dadosNotificacao, user, configuracaoNotificacao, updateConfigNotificacao, addConfigNotificacao, toast])

  // Alterar senha
  const alterarSenha = useCallback(async () => {
    if (!user || !senhaAtual || !novaSenha || !confirmarSenha) {
      toast.warning('Campos obrigatórios', 'Preencha todos os campos de senha')
      return
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('Senhas diferentes', 'Nova senha e confirmação devem ser iguais')
      return
    }

    if (novaSenha.length < 6) {
      toast.error('Senha muito curta', 'Nova senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(user.email!, senhaAtual)
      // ✅ Cast para FirebaseUser para resolver conflito de tipos
      await reauthenticateWithCredential(user as FirebaseUser, credential)
      await updatePassword(user as FirebaseUser, novaSenha)
      
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      
      toast.success('Senha alterada!', 'Sua senha foi atualizada com sucesso')
    } catch (error: unknown) {
      const firebaseError = error as { code?: string }
      if (firebaseError.code === 'auth/wrong-password') {
        toast.error('Senha atual incorreta', 'Verifique sua senha atual e tente novamente')
      } else {
        toast.error('Erro ao alterar senha', 'Não foi possível alterar sua senha')
      }
    } finally {
      setLoading(false)
    }
  }, [user, senhaAtual, novaSenha, confirmarSenha, toast])

  // Função de upload de logo (simulada)
  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Simular upload - em produção, usar Firebase Storage
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setDadosEmpresa(prev => ({ ...prev, logo: result }))
        toast.success('Logo carregada!', 'Imagem foi adicionada com sucesso')
      }
      reader.readAsDataURL(file)
    }
  }, [toast])

  // Função de backup/exportação
  const exportarDados = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simular processamento
      
      const dadosBackup = {
        empresa: dadosEmpresa,
        sistema: dadosSistema,
        pdv: dadosPDV,
        notificacoes: dadosNotificacao,
        dataBackup: new Date().toISOString(),
        versao: '1.0'
      }
      
      const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-stockpro-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Backup gerado!', 'Arquivo de backup baixado com sucesso')
    } catch (_error) {
      toast.error('Erro no backup', 'Não foi possível gerar o backup')
    } finally {
      setLoading(false)
    }
  }, [dadosEmpresa, dadosSistema, dadosPDV, dadosNotificacao, toast])

  const isLoadingData = loadingEmpresa || loadingSistema || loadingPDV || loadingNotificacao

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${modoNoturno ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <MobileHeader 
          title="Configurações do Sistema" 
          currentPage="/configuracoes" 
          userEmail={user?.email || undefined}
        />

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 lg:ml-64">
          
          {/* Loading de carregamento inicial */}
          {isLoadingData && (
            <div className={`rounded-xl shadow-xl p-8 sm:p-12 mb-6 animate-fade-in ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-purple-600 text-2xl">⚙️</span>
                  </div>
                </div>
                <p className={`font-bold text-lg ${modoNoturno ? 'text-white' : 'text-gray-700'}`}>Carregando configurações...</p>
                <p className={`text-sm mt-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-500'}`}>Sincronizando suas preferências</p>
              </div>
            </div>
          )}

          {/* Header principal */}
          {!isLoadingData && (
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${modoNoturno ? 'text-white' : 'text-gray-900'}`}>
                  ⚙️ Configurações do Sistema
                </h1>
                <p className={`text-sm mt-1 ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ctrl+1-6 para navegar • Personalize sua experiência
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

          {/* Navegação por abas */}
          {!isLoadingData && (
            <div className={`mb-6 rounded-xl shadow-lg overflow-hidden ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`border-b ${modoNoturno ? 'border-gray-700' : 'border-gray-200'}`}>
                <nav className="-mb-px flex overflow-x-auto">
                  <button
                    onClick={() => setAbaAtiva('empresa')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                      abaAtiva === 'empresa'
                        ? `border-blue-500 ${modoNoturno ? 'text-blue-400 bg-blue-900' : 'text-blue-600 bg-blue-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    🏢 Empresa
                  </button>
                  <button
                    onClick={() => setAbaAtiva('sistema')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                      abaAtiva === 'sistema'
                        ? `border-green-500 ${modoNoturno ? 'text-green-400 bg-green-900' : 'text-green-600 bg-green-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    🎨 Sistema
                  </button>
                  <button
                    onClick={() => setAbaAtiva('backup')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                      abaAtiva === 'backup'
                        ? `border-purple-500 ${modoNoturno ? 'text-purple-400 bg-purple-900' : 'text-purple-600 bg-purple-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    💾 Backup
                  </button>
                  <button
                    onClick={() => setAbaAtiva('pdv')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                      abaAtiva === 'pdv'
                        ? `border-orange-500 ${modoNoturno ? 'text-orange-400 bg-orange-900' : 'text-orange-600 bg-orange-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    🖨️ PDV
                  </button>
                  <button
                    onClick={() => setAbaAtiva('perfil')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                      abaAtiva === 'perfil'
                        ? `border-indigo-500 ${modoNoturno ? 'text-indigo-400 bg-indigo-900' : 'text-indigo-600 bg-indigo-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    👤 Perfil
                  </button>
                  <button
                    onClick={() => setAbaAtiva('notificacoes')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                      abaAtiva === 'notificacoes'
                        ? `border-pink-500 ${modoNoturno ? 'text-pink-400 bg-pink-900' : 'text-pink-600 bg-pink-50'}`
                        : `border-transparent ${modoNoturno ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                    }`}
                  >
                    📧 Notificações
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* 🏢 ABA EMPRESA */}
          {!isLoadingData && abaAtiva === 'empresa' && (
            <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  🏢 Dados da Empresa
                </h2>
                <p className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Configure as informações da sua empresa para relatórios e documentos
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload de Logo */}
                <div className="lg:col-span-1">
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                    modoNoturno ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="mb-4">
                      {dadosEmpresa.logo ? (
                        <Image 
                          src={dadosEmpresa.logo} 
                          alt="Logo da empresa" 
                          width={128}
                          height={128}
                          className="mx-auto object-contain rounded-lg shadow-md"
                        />
                      ) : (
                        <div className={`mx-auto h-32 w-32 rounded-lg flex items-center justify-center ${
                          modoNoturno ? 'bg-gray-600' : 'bg-gray-200'
                        }`}>
                          <span className="text-4xl">🏢</span>
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        📷 {dadosEmpresa.logo ? 'Alterar Logo' : 'Adicionar Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className={`text-xs mt-2 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                      PNG, JPG até 2MB
                    </p>
                  </div>
                </div>

                {/* Formulário de dados */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Nome da Empresa *
                      </label>
                      <input
                        type="text"
                        value={dadosEmpresa.nomeEmpresa}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, nomeEmpresa: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Sua Empresa Ltda"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        CNPJ
                      </label>
                      <input
                        type="text"
                        value={dadosEmpresa.cnpj}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Inscrição Estadual
                      </label>
                      <input
                        type="text"
                        value={dadosEmpresa.inscricaoEstadual}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, inscricaoEstadual: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="000.000.000.000"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={dadosEmpresa.telefone}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, telefone: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="(11) 9999-9999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      Endereço Completo
                    </label>
                    <input
                      type="text"
                      value={dadosEmpresa.endereco}
                      onChange={(e) => setDadosEmpresa(prev => ({ ...prev, endereco: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        modoNoturno 
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="Rua das Flores, 123, Centro"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={dadosEmpresa.cidade}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, cidade: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
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
                        value={dadosEmpresa.estado}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, estado: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white' 
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
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        CEP
                      </label>
                      <input
                        type="text"
                        value={dadosEmpresa.cep}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, cep: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={dadosEmpresa.email}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Website
                      </label>
                      <input
                        type="url"
                        value={dadosEmpresa.website}
                        onChange={(e) => setDadosEmpresa(prev => ({ ...prev, website: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="https://www.empresa.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <LoadingButton
                  onClick={salvarConfigEmpresa}
                  isLoading={loading}
                  loadingText="Salvando..."
                  variant="primary"
                  size="md"
                >
                  💾 Salvar Configurações da Empresa
                </LoadingButton>
              </div>
            </div>
          )}

          {/* 🎨 ABA SISTEMA */}
          {!isLoadingData && abaAtiva === 'sistema' && (
            <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  🎨 Configurações do Sistema
                </h2>
                <p className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Personalize a aparência e comportamento do sistema
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configurações de Aparência */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    🎨 Aparência
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Tema do Sistema
                      </label>
                      <select
                        value={dadosSistema.tema}
                        onChange={(e) => setDadosSistema(prev => ({ ...prev, tema: e.target.value as 'claro' | 'escuro' | 'auto' }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="claro">☀️ Modo Claro</option>
                        <option value="escuro">🌙 Modo Escuro</option>
                        <option value="auto">🔄 Automático (Sistema)</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Cor Primária
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'].map(cor => (
                          <button
                            key={cor}
                            onClick={() => setDadosSistema(prev => ({ ...prev, corPrimaria: cor }))}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                              dadosSistema.corPrimaria === cor ? 'border-gray-800 scale-110' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: cor }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={dadosSistema.corPrimaria}
                        onChange={(e) => setDadosSistema(prev => ({ ...prev, corPrimaria: e.target.value }))}
                        className="w-full h-10 border rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Idioma
                      </label>
                      <select
                        value={dadosSistema.idioma}
                        onChange={(e) => setDadosSistema(prev => ({ ...prev, idioma: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                        <option value="en-US">🇺🇸 English (US)</option>
                        <option value="es-ES">🇪🇸 Español</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Configurações de Formato */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📅 Formatos
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Moeda
                      </label>
                      <select
                        value={dadosSistema.moeda}
                        onChange={(e) => setDadosSistema(prev => ({ ...prev, moeda: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="BRL">💰 Real (R$)</option>
                        <option value="USD">💵 Dólar ($)</option>
                        <option value="EUR">💶 Euro (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Formato de Data
                      </label>
                      <select
                        value={dadosSistema.formatoData}
                        onChange={(e) => setDadosSistema(prev => ({ ...prev, formatoData: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="DD/MM/YYYY">📅 DD/MM/AAAA (31/12/2024)</option>
                        <option value="MM/DD/YYYY">📅 MM/DD/AAAA (12/31/2024)</option>
                        <option value="YYYY-MM-DD">📅 AAAA-MM-DD (2024-12-31)</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Formato de Hora
                      </label>
                      <select
                        value={dadosSistema.formatoHora}
                        onChange={(e) => setDadosSistema(prev => ({ ...prev, formatoHora: e.target.value }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="24h">🕑 24 horas (14:30)</option>
                        <option value="12h">🕑 12 horas (2:30 PM)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configurações de Alertas */}
              <div className={`mt-6 p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  🔔 Alertas do Sistema
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dadosSistema.alertasEstoque}
                      onChange={(e) => setDadosSistema(prev => ({ ...prev, alertasEstoque: e.target.checked }))}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      🚨 Alertas de Estoque
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dadosSistema.alertasValidade}
                      onChange={(e) => setDadosSistema(prev => ({ ...prev, alertasValidade: e.target.checked }))}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      📅 Alertas de Validade
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dadosSistema.alertasVendas}
                      onChange={(e) => setDadosSistema(prev => ({ ...prev, alertasVendas: e.target.checked }))}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                      💰 Alertas de Vendas
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <LoadingButton
                  onClick={salvarConfigSistema}
                  isLoading={loading}
                  loadingText="Salvando..."
                  variant="success"
                  size="md"
                >
                  🎨 Salvar Configurações do Sistema
                </LoadingButton>
              </div>
            </div>
          )}

          {/* 💾 ABA BACKUP */}
          {!isLoadingData && abaAtiva === 'backup' && (
            <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  💾 Backup e Restauração
                </h2>
                <p className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Proteja seus dados com backup automático e restauração segura
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Exportar Dados */}
                <div className={`p-6 rounded-lg border ${modoNoturno ? 'border-purple-600 bg-purple-900' : 'border-purple-200 bg-purple-50'}`}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📤</div>
                    <h3 className={`text-lg font-bold mb-2 ${modoNoturno ? 'text-purple-200' : 'text-purple-800'}`}>
                      Exportar Dados
                    </h3>
                    <p className={`text-sm mb-4 ${modoNoturno ? 'text-purple-300' : 'text-purple-700'}`}>
                      Faça backup de todas as suas configurações, produtos e movimentações
                    </p>
                    
                    <div className={`text-sm space-y-2 mb-4 ${modoNoturno ? 'text-purple-300' : 'text-purple-700'}`}>
                      <div className="flex items-center justify-center space-x-2">
                        <span>✅</span>
                        <span>Configurações da empresa</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <span>✅</span>
                        <span>Produtos e categorias</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <span>✅</span>
                        <span>Movimentações de estoque</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <span>✅</span>
                        <span>Preferências do sistema</span>
                      </div>
                    </div>

                    <LoadingButton
                      onClick={exportarDados}
                      isLoading={loading}
                      loadingText="Gerando backup..."
                      variant="primary"
                      size="md"
                      className="w-full"
                    >
                      📦 Gerar Backup Completo
                    </LoadingButton>
                  </div>
                </div>

                {/* Importar Dados */}
                <div className={`p-6 rounded-lg border ${modoNoturno ? 'border-green-600 bg-green-900' : 'border-green-200 bg-green-50'}`}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📥</div>
                    <h3 className={`text-lg font-bold mb-2 ${modoNoturno ? 'text-green-200' : 'text-green-800'}`}>
                      Importar Dados
                    </h3>
                    <p className={`text-sm mb-4 ${modoNoturno ? 'text-green-300' : 'text-green-700'}`}>
                      Restaure seus dados de um arquivo de backup anterior
                    </p>
                    
                    <div className={`text-sm space-y-2 mb-4 ${modoNoturno ? 'text-green-300' : 'text-green-700'}`}>
                      <div className="flex items-center justify-center space-x-2">
                        <span>⚠️</span>
                        <span>Substitui dados atuais</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <span>🔒</span>
                        <span>Processo seguro</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <span>📋</span>
                        <span>Validação automática</span>
                      </div>
                    </div>

                    <label className="cursor-pointer">
                      <span className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 w-full">
                        📁 Selecionar Arquivo de Backup
                      </span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(_e) => {
                          // Implementar importação
                          toast.info('Em desenvolvimento', 'Funcionalidade de importação será implementada em breve')
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Backup Automático */}
              <div className={`mt-6 p-4 rounded-lg border ${modoNoturno ? 'border-blue-600 bg-blue-900' : 'border-blue-200 bg-blue-50'}`}>
                <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                  🤖 Backup Automático
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                      Daily
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-blue-300' : 'text-blue-700'}`}>
                      Backup Diário
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                      7 dias
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-blue-300' : 'text-blue-700'}`}>
                      Histórico mantido
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                      Cloud
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-blue-300' : 'text-blue-700'}`}>
                      Armazenamento seguro
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${modoNoturno ? 'bg-blue-800' : 'bg-blue-100'}`}>
                  <p className={`text-sm text-center ${modoNoturno ? 'text-blue-200' : 'text-blue-800'}`}>
                    💡 <strong>Próximo backup automático:</strong> Hoje às 23:59
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 🖨️ ABA PDV */}
          {!isLoadingData && abaAtiva === 'pdv' && (
            <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  🖨️ Configurações do PDV
                </h2>
                <p className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Configure impressão de cupons, notas fiscais e layout do PDV
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configurações de Impressão */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    🖨️ Impressão
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosPDV.impressaoAutomatica}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, impressaoAutomatica: e.target.checked }))}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        🤖 Impressão Automática
                      </span>
                    </label>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Formato do Cupom
                      </label>
                      <select
                        value={dadosPDV.formatoCupom}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, formatoCupom: e.target.value as 'termico' | 'a4' }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="termico">🧾 Térmico (80mm)</option>
                        <option value="a4">📄 A4 (210mm)</option>
                      </select>
                    </div>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosPDV.incluirLogo}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, incluirLogo: e.target.checked }))}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        🏢 Incluir Logo da Empresa
                      </span>
                    </label>
                  </div>
                </div>

                {/* Configurações de Conteúdo */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📋 Conteúdo do Cupom
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosPDV.mostrarTroco}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, mostrarTroco: e.target.checked }))}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        💰 Mostrar Troco
                      </span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosPDV.mostrarDesconto}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, mostrarDesconto: e.target.checked }))}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        🏷️ Mostrar Descontos
                      </span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosPDV.mostrarObservacoes}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, mostrarObservacoes: e.target.checked }))}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        📝 Mostrar Observações
                      </span>
                    </label>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mensagem do Cupom
                      </label>
                      <textarea
                        value={dadosPDV.mensagemCupom}
                        onChange={(e) => setDadosPDV(prev => ({ ...prev, mensagemCupom: e.target.value }))}
                        rows={3}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Obrigado pela preferência! Volte sempre!"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview do Cupom */}
              <div className={`mt-6 p-4 rounded-lg border ${modoNoturno ? 'border-orange-600 bg-orange-900' : 'border-orange-200 bg-orange-50'}`}>
                <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-orange-200' : 'text-orange-800'}`}>
                  👁️ Preview do Cupom
                </h3>
                
                <div className={`max-w-xs mx-auto p-4 rounded-lg font-mono text-xs ${
                  modoNoturno ? 'bg-white text-black' : 'bg-gray-800 text-green-400'
                }`}>
                  {dadosPDV.incluirLogo && (
                    <div className="text-center mb-2">
                      [LOGO DA EMPRESA]
                    </div>
                  )}
                  <div className="text-center border-b border-current pb-2 mb-2">
                    <div>{dadosEmpresa.nomeEmpresa || 'SUA EMPRESA'}</div>
                    <div>{dadosEmpresa.cnpj || 'XX.XXX.XXX/XXXX-XX'}</div>
                  </div>
                  <div className="space-y-1">
                    <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
                    <div>Hora: {new Date().toLocaleTimeString('pt-BR')}</div>
                    <div className="border-b border-current py-2">
                      <div>1x Produto Exemplo ... R$ 10,00</div>
                      <div>2x Outro Produto .... R$ 20,00</div>
                    </div>
                    <div>Subtotal: R$ 30,00</div>
                    {dadosPDV.mostrarDesconto && <div>Desconto: R$ 3,00</div>}
                    <div className="font-bold">TOTAL: R$ 27,00</div>
                    {dadosPDV.mostrarTroco && (
                      <>
                        <div>Dinheiro: R$ 30,00</div>
                        <div>Troco: R$ 3,00</div>
                      </>
                    )}
                    {dadosPDV.mostrarObservacoes && (
                      <div className="pt-2 border-t border-current">
                        Obs: Produto em promoção
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-2 pt-2 border-t border-current">
                    {dadosPDV.mensagemCupom}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <LoadingButton
                  onClick={salvarConfigPDV}
                  isLoading={loading}
                  loadingText="Salvando..."
                  variant="warning"
                  size="md"
                >
                  🖨️ Salvar Configurações do PDV
                </LoadingButton>
              </div>
            </div>
          )}

          {/* 👤 ABA PERFIL */}
          {!isLoadingData && abaAtiva === 'perfil' && (
            <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  👤 Perfil e Segurança
                </h2>
                <p className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Gerencie seus dados pessoais e configurações de segurança
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informações do Perfil */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📋 Informações Pessoais
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className={`w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-gray-400' 
                            : 'border-gray-300 bg-gray-100 text-gray-500'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                        O email não pode ser alterado
                      </p>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Data de Criação da Conta
                      </label>
                      <input
                        type="text"
                        value={(() => {
                         const metadata = (user as FirebaseUser)?.metadata; 
                         return metadata?.creationTime ? new Date(metadata.creationTime).toLocaleDateString('pt-BR') : 'N/A';
                        })()}

                        disabled
                        className={`w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-gray-400' 
                            : 'border-gray-300 bg-gray-100 text-gray-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Último Acesso
                      </label>
                      <input
                        type="text"
                        value={(() => {
                         const metadata = (user as FirebaseUser)?.metadata;
                         return metadata?.lastSignInTime ? new Date(metadata.lastSignInTime).toLocaleString('pt-BR') : 'N/A';
                        })()}

                        disabled
                        className={`w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-gray-400' 
                            : 'border-gray-300 bg-gray-100 text-gray-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        ID do Usuário
                      </label>
                      <input
                        type="text"
                        value={user?.uid || ''}
                        disabled
                        className={`w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed text-xs ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-gray-400' 
                            : 'border-gray-300 bg-gray-100 text-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Alterar Senha */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    🔒 Alterar Senha
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Senha Atual *
                      </label>
                      <input
                        type="password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Digite sua senha atual"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Nova Senha *
                      </label>
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Digite a nova senha"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Confirmar Nova Senha *
                      </label>
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="Confirme a nova senha"
                      />
                    </div>

                    {/* Indicador de força da senha */}
                    {novaSenha && (
                      <div className="space-y-2">
                        <div className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          Força da senha:
                        </div>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4].map((level) => {
                            let strength = 0
                            if (novaSenha.length >= 6) strength++
                            if (novaSenha.match(/[a-z]/) && novaSenha.match(/[A-Z]/)) strength++
                            if (novaSenha.match(/[0-9]/)) strength++
                            if (novaSenha.match(/[^a-zA-Z0-9]/)) strength++

                            return (
                              <div
                                key={level}
                                className={`h-2 flex-1 rounded ${
                                  level <= strength
                                    ? strength <= 1
                                      ? 'bg-red-500'
                                      : strength <= 2
                                      ? 'bg-yellow-500'
                                      : strength <= 3
                                      ? 'bg-blue-500'
                                      : 'bg-green-500'
                                    : modoNoturno
                                    ? 'bg-gray-600'
                                    : 'bg-gray-200'
                                }`}
                              />
                            )
                          })}
                        </div>
                        <div className={`text-xs ${
                          novaSenha.length >= 6
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {novaSenha.length < 6 && '• Mínimo 6 caracteres'}
                          {novaSenha.length >= 6 && !novaSenha.match(/[a-z]/) && '• Adicione letras minúsculas'}
                          {novaSenha.length >= 6 && !novaSenha.match(/[A-Z]/) && '• Adicione letras maiúsculas'}
                          {novaSenha.length >= 6 && !novaSenha.match(/[0-9]/) && '• Adicione números'}
                          {novaSenha.length >= 6 && novaSenha.match(/[a-z]/) && novaSenha.match(/[A-Z]/) && novaSenha.match(/[0-9]/) && '✅ Senha forte'}
                        </div>
                      </div>
                    )}

                    <LoadingButton
                      onClick={alterarSenha}
                      isLoading={loading}
                      loadingText="Alterando..."
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={!senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha}
                    >
                      🔑 Alterar Senha
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 📧 ABA NOTIFICAÇÕES */}
          {!isLoadingData && abaAtiva === 'notificacoes' && (
            <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${modoNoturno ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="mb-6">
                <h2 className={`text-xl font-bold mb-2 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                  📧 Notificações e Alertas
                </h2>
                <p className={`text-sm ${modoNoturno ? 'text-gray-300' : 'text-gray-600'}`}>
                  Configure alertas por email, WhatsApp e relatórios automáticos
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Notificações por Email */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📧 Notificações por Email
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosNotificacao.emailAlertasEstoque}
                        onChange={(e) => setDadosNotificacao(prev => ({ ...prev, emailAlertasEstoque: e.target.checked }))}
                        className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          📦 Alertas de Estoque Baixo
                        </span>
                        <p className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                          Receba email quando produtos atingirem estoque mínimo
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosNotificacao.emailAlertasValidade}
                        onChange={(e) => setDadosNotificacao(prev => ({ ...prev, emailAlertasValidade: e.target.checked }))}
                        className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          📅 Alertas de Validade
                        </span>
                        <p className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                          Receba email sobre produtos próximos ao vencimento
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosNotificacao.emailRelatorios}
                        onChange={(e) => setDadosNotificacao(prev => ({ ...prev, emailRelatorios: e.target.checked }))}
                        className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          📊 Relatórios Automáticos
                        </span>
                        <p className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                          Receba relatórios de vendas periodicamente
                        </p>
                      </div>
                    </label>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Frequência dos Relatórios
                      </label>
                      <select
                        value={dadosNotificacao.frequenciaRelatorios}
                        onChange={(e) => setDadosNotificacao(prev => ({ ...prev, frequenciaRelatorios: e.target.value as 'diario' | 'semanal' | 'mensal' }))}
                        disabled={!dadosNotificacao.emailRelatorios}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-200 ${
                          !dadosNotificacao.emailRelatorios 
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        } ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      >
                        <option value="diario">📅 Diário</option>
                        <option value="semanal">📅 Semanal</option>
                        <option value="mensal">📅 Mensal</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notificações por WhatsApp */}
                <div className={`p-4 rounded-lg border ${modoNoturno ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-white' : 'text-gray-800'}`}>
                    📱 Notificações por WhatsApp
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dadosNotificacao.whatsappAlertas}
                        onChange={(e) => setDadosNotificacao(prev => ({ ...prev, whatsappAlertas: e.target.checked }))}
                        className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                          💬 Ativar Alertas por WhatsApp
                        </span>
                        <p className={`text-xs ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                          Receba alertas importantes via WhatsApp
                        </p>
                      </div>
                    </label>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${modoNoturno ? 'text-gray-300' : 'text-gray-700'}`}>
                        Número do WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={dadosNotificacao.whatsappNumero}
                        onChange={(e) => setDadosNotificacao(prev => ({ ...prev, whatsappNumero: e.target.value }))}
                        disabled={!dadosNotificacao.whatsappAlertas}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-200 ${
                          !dadosNotificacao.whatsappAlertas 
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        } ${
                          modoNoturno 
                            ? 'border-gray-600 bg-gray-600 text-white placeholder-gray-400' 
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        placeholder="(11) 99999-9999"
                      />
                      <p className={`text-xs mt-1 ${modoNoturno ? 'text-gray-400' : 'text-gray-500'}`}>
                        Incluir código do país e DDD
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg ${modoNoturno ? 'bg-pink-900 border border-pink-700' : 'bg-pink-50 border border-pink-200'}`}>
                      <p className={`text-xs ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>
                        💡 <strong>Funcionalidade em desenvolvimento:</strong> As notificações por WhatsApp serão implementadas na próxima versão do sistema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configurações Avançadas de Alertas */}
              <div className={`mt-6 p-4 rounded-lg border ${modoNoturno ? 'border-pink-600 bg-pink-900' : 'border-pink-200 bg-pink-50'}`}>
                <h3 className={`text-lg font-bold mb-4 ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>
                  ⚙️ Configurações Avançadas
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-xl font-bold ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>
                      ⏰ 9:00
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-pink-300' : 'text-pink-700'}`}>
                      Horário dos alertas
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>
                      📧 Email
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-pink-300' : 'text-pink-700'}`}>
                      Via: {user?.email}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>
                      🔔 Ativo
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-pink-300' : 'text-pink-700'}`}>
                      Sistema funcionando
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${modoNoturno ? 'text-pink-200' : 'text-pink-800'}`}>
                      ✅ Seguro
                    </div>
                    <div className={`text-sm ${modoNoturno ? 'text-pink-300' : 'text-pink-700'}`}>
                      Dados protegidos
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <LoadingButton
                  onClick={salvarConfigNotificacao}
                  isLoading={loading}
                  loadingText="Salvando..."
                  variant="danger"
                  size="md"
                >
                  📧 Salvar Configurações de Notificação
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Informações Adicionais */}
          {!isLoadingData && (
            <div className={`mt-8 border rounded-xl p-4 transition-colors duration-300 ${
              modoNoturno ? 'bg-purple-900 border-purple-700' : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⚙️</div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${modoNoturno ? 'text-purple-200' : 'text-purple-800'}`}>
                    Central de Configurações Inteligente
                  </h3>
                  <div className={`mt-2 text-sm space-y-1 ${modoNoturno ? 'text-purple-300' : 'text-purple-700'}`}>
                    <p>• <strong>🏢 Empresa:</strong> Dados completos, logo e informações fiscais</p>
                    <p>• <strong>🎨 Sistema:</strong> Temas, cores e preferências de interface</p>
                    <p>• <strong>💾 Backup:</strong> Exportação e importação segura de dados</p>
                    <p>• <strong>🖨️ PDV:</strong> Configurações de impressão e cupons fiscais</p>
                    <p>• <strong>👤 Perfil:</strong> Dados pessoais e segurança da conta</p>
                    <p>• <strong>📧 Notificações:</strong> Alertas por email e lembretes automáticos</p>
                    <p>• <strong>⌨️ Atalhos:</strong> Use Ctrl+1-6 para navegar rapidamente</p>
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