// src/app/auth-teste/page.tsx
'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'

export default function AuthTestePage() {
  const { user, loading: authLoading, login, logout, register } = useAuth()
  const toast = useToastContext()
  
  const [email, setEmail] = useState('teste@stockpro.com')
  const [password, setPassword] = useState('123456')
  const [companyName, setCompanyName] = useState('Empresa Teste')
  
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Campos obrigatórios', 'Preencha email e senha')
      return
    }

    setLoginLoading(true)
    try {
      await login(email, password)
      toast.success('Login realizado!', `Bem-vindo, ${email}!`)
    } catch (error: any) {
      console.error('Erro no login:', error)
      let errorMessage = 'Erro ao fazer login'
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido'
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Email ou senha incorretos'
      }
      
      toast.error('Erro no login', errorMessage)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!email || !password || !companyName) {
      toast.error('Campos obrigatórios', 'Preencha todos os campos')
      return
    }

    if (password.length < 6) {
      toast.error('Senha muito fraca', 'Senha deve ter pelo menos 6 caracteres')
      return
    }

    setRegisterLoading(true)
    try {
      await register(email, password, {
        companyName,
        plan: 'BASIC'
      })
      toast.success('Conta criada!', `Bem-vindo, ${email}!`)
    } catch (error: any) {
      console.error('Erro no registro:', error)
      let errorMessage = 'Erro ao criar conta'
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já possui uma conta'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido'
      }
      
      toast.error('Erro no registro', errorMessage)
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await logout()
      toast.success('Logout realizado!', 'Até logo!')
    } catch (error: any) {
      console.error('Erro no logout:', error)
      toast.error('Erro no logout', 'Tente novamente')
    } finally {
      setLogoutLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <MobileHeader 
        title="Teste de Autenticação"
        currentPage="/auth-teste"
        userEmail={user?.email || undefined}
      />

      <div className="min-h-screen bg-gray-100 p-4 lg:ml-64">
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6 text-center">🔐 Teste de Autenticação</h1>

            {/* Status do Usuário */}
            <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">👤 Status do Usuário</h3>
              {user ? (
                <div className="space-y-1 text-sm">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>UID:</strong> {user.uid.substring(0, 8)}...</p>
                  <p><strong>Empresa:</strong> {user.companyName || 'Não informado'}</p>
                  <p><strong>Plano:</strong> {user.plan}</p>
                  <p><strong>Ativo:</strong> {user.isActive ? '✅ Sim' : '❌ Não'}</p>
                  <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    🟢 Logado
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-sm mb-2">Usuário não logado</p>
                  <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                    🔴 Não logado
                  </span>
                </div>
              )}
            </div>

            {!user ? (
              /* Formulário de Login/Registro */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Empresa (para registro)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sua empresa"
                  />
                </div>

                <div className="space-y-3">
                  <LoadingButton
                    onClick={handleLogin}
                    isLoading={loginLoading}
                    loadingText="Entrando..."
                    variant="primary"
                    className="w-full"
                  >
                    🔓 Fazer Login
                  </LoadingButton>

                  <LoadingButton
                    onClick={handleRegister}
                    isLoading={registerLoading}
                    loadingText="Criando conta..."
                    variant="success"
                    className="w-full"
                  >
                    ➕ Criar Conta
                  </LoadingButton>
                </div>
              </div>
            ) : (
              /* Opções para usuário logado */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">🎉 Você está logado!</h3>
                  <p className="text-sm text-green-700">
                    Agora você pode navegar pelo sistema usando o menu.
                  </p>
                </div>

                <LoadingButton
                  onClick={handleLogout}
                  isLoading={logoutLoading}
                  loadingText="Saindo..."
                  variant="danger"
                  className="w-full"
                >
                  🚪 Fazer Logout
                </LoadingButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}