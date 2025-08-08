// src/app/login/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const router = useRouter()
  const toast = useToastContext()
  const { user, loading: authLoading, login, checkPasswordChangeRequired } = useAuth()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!authLoading && user) {
      // 🆕 Verificar se deve alterar senha antes de redirecionar
      if (user.mustChangePassword) {
        console.log('⚠️ Usuário deve alterar senha')
        router.push('/change-password')
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, authLoading, router])

  // Mostrar loading se ainda está verificando autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-600 text-xl">📦</span>
            </div>
          </div>
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
          <p className="text-gray-400 text-sm mt-1">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  // Se já estiver logado, não mostrar a página de login
  if (user) {
    return null
  }

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Por favor, informe seu email')
      toast.error('Campo obrigatório', 'Por favor, informe seu email')
      return false
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Por favor, informe um email válido')
      toast.error('Email inválido', 'Por favor, informe um email válido')
      return false
    }

    if (!password.trim()) {
      setError('Por favor, informe sua senha')
      toast.error('Campo obrigatório', 'Por favor, informe sua senha')
      return false
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      toast.error('Senha muito curta', 'A senha deve ter pelo menos 6 caracteres')
      return false
    }

    return true
  }

  // 🆕 Verificar se deve alterar senha após login Firebase
  const checkMustChangePasswordFirebase = async () => {
    try {
      const { auth: firebaseAuth } = await import('@/lib/firebase')
      
      if (firebaseAuth.currentUser && checkPasswordChangeRequired) {
        const mustChange = await checkPasswordChangeRequired(firebaseAuth.currentUser)
        
        if (mustChange) {
          console.log('⚠️ Usuário deve alterar senha (Firebase)')
          toast.warning('Alteração obrigatória', 'Você precisa alterar sua senha por segurança')
          router.push('/change-password')
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('❌ Erro ao verificar mustChangePassword:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Limpar erro anterior
    setError('')

    // Validar formulário
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // 🆕 TENTAR LOGIN COM API PERSONALIZADA PRIMEIRO (para clientes do sistema de vendas)
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password })
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Login API realizado:', data.user)
          
          // 🆕 VERIFICAR SE É PRIMEIRO ACESSO (API)
          if (data.user.primeiroAcesso || data.user.senhaTemporaria) {
            toast.warning('Primeiro acesso detectado', 'Você precisa alterar sua senha por segurança')
            router.push('/alterar-senha?obrigatorio=true')
            return
          }
          
          toast.success('Login realizado!', `Bem-vindo, ${data.user.name}!`)
          router.push('/dashboard')
          return
        }
      } catch (apiError) {
        console.log('🔄 API login falhou, tentando Firebase...')
      }

      // 🔄 FALLBACK PARA FIREBASE (usuários existentes + multi-tenant)
      console.log('🔥 Tentando login Firebase...')
      await login(email.trim().toLowerCase(), password)
      
      // 🆕 VERIFICAR SE DEVE ALTERAR SENHA (FIREBASE MULTI-TENANT)
      const mustChangePassword = await checkMustChangePasswordFirebase()
      
      if (!mustChangePassword) {
        // Se não precisa alterar senha, prosseguir normalmente
        toast.success('Login realizado!', 'Bem-vindo de volta!')
        router.push('/dashboard')
      }
      // Se precisa alterar senha, a função checkMustChangePasswordFirebase já redirecionou
      
    } catch (error: any) {
      console.error('❌ Erro de autenticação:', error)
      
      let errorMessage = 'Erro ao fazer login'
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado. Verifique o email informado.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta. Verifique sua senha.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Formato de email inválido.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos.'
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Email ou senha incorretos.'
      } else if (error.message.includes('Firebase') && error.message.includes('não inicializado')) {
        errorMessage = 'Sistema temporariamente indisponível.'
      } else if (error.message.includes('Usuário não encontrado') || error.message.includes('Senha incorreta')) {
        errorMessage = 'Email ou senha incorretos.'
      } else {
        errorMessage = 'Erro de conexão. Tente novamente.'
      }
      
      setError(errorMessage)
      toast.error('Erro no login', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    if (!email.trim()) {
      toast.info('Digite seu email', 'Primeiro digite seu email no campo acima, depois clique aqui')
      return
    }
    toast.info('Funcionalidade em desenvolvimento', 'Em breve você poderá recuperar sua senha por email')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <span className="text-white font-bold text-3xl animate-pulse-slow">📦</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            StockPro
          </h2>
          <p className="mt-2 text-center text-lg text-gray-600 font-medium">
            Sistema Profissional de Controle de Estoque
          </p>
          <div className="mt-2 flex justify-center space-x-2 text-sm text-gray-500">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ Seguro</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">🚀 Rápido</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">💯 Confiável</span>
          </div>
        </div>

        {/* Formulário de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl animate-slide-up">
                <div className="flex items-center">
                  <span className="text-red-500 mr-3 text-lg">❌</span>
                  <div>
                    <p className="font-semibold">Erro no login</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Campos do Formulário */}
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  📧 Email de Acesso
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-4 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm font-medium transition-all duration-200 hover:border-gray-400"
                  placeholder="seu@email.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  🔐 Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-4 pr-12 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm font-medium transition-all duration-200 hover:border-gray-400"
                    placeholder="••••••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    <span className="text-lg">
                      {showPassword ? '🔒' : '👁️'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Esqueci minha senha */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                disabled={loading}
              >
                🤔 Esqueci minha senha
              </button>
            </div>

            {/* Botão de Login */}
            <div>
              <LoadingButton
                type="submit"
                isLoading={loading}
                loadingText="Entrando no sistema..."
                variant="primary"
                size="lg"
                className="w-full"
              >
                🔓 Entrar no Sistema
              </LoadingButton>
            </div>

            {/* 🆕 SEÇÃO PARA NOVOS CLIENTES */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl mr-2">🎉</span>
                  <h4 className="text-lg font-bold text-green-800">
                    Novo no StockPro?
                  </h4>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  <strong>Experimente grátis por 7 dias!</strong><br />
                  Sem cartão de crédito • Sem compromisso
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/vendas')}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  disabled={loading}
                >
                  🚀 Começar Teste Grátis
                </button>
              </div>
            </div>

            {/* SEÇÃO PARA CONTATO */}
            <div className="text-center">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center justify-center">
                  <span className="mr-2">💼</span>
                  Precisa de ajuda?
                </h4>
                <p className="text-sm text-blue-700 mb-3 font-medium">
                  Nossa equipe está pronta para te ajudar
                </p>
                <div className="space-y-2 text-xs text-blue-600">
                  <div className="flex items-center justify-center space-x-2">
                    <span>📧</span>
                    <a href="mailto:rafaelfelipegb.arf@gmail.com" className="hover:underline font-medium">
                      rafaelfelipegb.arf@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>📱</span>
                    <a href="https://wa.me/5519991813749"  rel="noopener noreferrer" className="hover:underline font-medium">
                      WhatsApp: (19) 99181-3749
                    </a>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>🌐</span>
                    <span className="font-medium">www.stockprov2.com</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 🆕 INFORMAÇÕES PARA CLIENTES DO SISTEMA DE VENDAS */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-yellow-800 mb-3 flex items-center">
                <span className="mr-2 text-lg">🔑</span>
                Acabou de comprar? Primeiro acesso:
              </h4>
              <ul className="text-xs text-yellow-700 space-y-2">
                <li className="flex items-center">
                  <span className="mr-2">✅</span>
                  Use o email e senha enviados por email
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🔒</span>
                  No primeiro login, você será obrigado a alterar a senha
                </li>
                <li className="flex items-center">
                  <span className="mr-2">⚡</span>
                  Acesso liberado imediatamente após a compra
                </li>
                <li className="flex items-center">
                  <span className="mr-2">💾</span>
                  Dados seguros e backup automático
                </li>
              </ul>
            </div>

            {/* Benefícios do Sistema */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-purple-800 mb-3 flex items-center justify-center">
                <span className="mr-2 text-lg">⭐</span>
                Por que escolher o StockPro?
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-purple-700">
                <div className="flex items-center">
                  <span className="mr-2">📊</span>
                  <span className="font-medium">Controle completo</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">💰</span>
                  <span className="font-medium">PDV integrado</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📈</span>
                  <span className="font-medium">Relatórios avançados</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📱</span>
                  <span className="font-medium">Mobile responsivo</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">📷</span>
                  <span className="font-medium">Código de barras</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">🛟</span>
                  <span className="font-medium">Suporte 24/7</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Rodapé */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            © 2024 StockPro • Sistema Profissional de Gestão de Estoque
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Desenvolvido com ❤️ para impulsionar seu negócio
          </p>
        </div>
      </div>
    </div>
  )
}