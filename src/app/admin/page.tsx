'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

// CREDENCIAIS ADMIN - ALTERE PARA AS SUAS
const ADMIN_EMAIL = "rafaelfelipeg.arf@gmail.com"
const ADMIN_PASSWORD = "01r02f03g04b"

interface Company {
  id: string
  name: string
  email: string
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  createdAt: string
  isActive: boolean
  trialStartDate: string
  trialEndDate: string
  subscription: {
    plan: string
    status: 'trial' | 'active' | 'expired'
    startDate: string
  }
  adminUser: {
    name: string
    email: string
  }
  stats: {
    userCount: number
    productCount: number
    lastLogin?: string
  }
}

export default function AdminPage() {
  const router = useRouter()
  const toast = useToastContext()
  
  // Estados de autenticação admin
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })

  // Estados do sistema
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    plan: 'BASIC'
  })

  // Verificar autenticação ao carregar
  useEffect(() => {
    const adminAuth = localStorage.getItem('stockpro_admin_auth')
    if (adminAuth === 'authenticated') {
      setIsAuthenticated(true)
      loadCompanies()
    } else {
      setLoading(false)
    }
  }, [])

  // Função de login admin
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (credentials.email === ADMIN_EMAIL && credentials.password === ADMIN_PASSWORD) {
        setIsAuthenticated(true)
        localStorage.setItem('stockpro_admin_auth', 'authenticated')
        toast.success('Acesso liberado!', 'Bem-vindo ao painel administrativo')
        loadCompanies()
      } else {
        toast.error('Acesso negado!', 'Credenciais administrativas inválidas')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  // Função de logout admin
  const handleAdminLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('stockpro_admin_auth')
    setCredentials({ email: '', password: '' })
    toast.info('Sessão encerrada', 'Você foi desconectado do painel admin')
  }

  // Carregar empresas
  const loadCompanies = async () => {
    try {
      console.log('🏢 Carregando empresas...')
      const { db } = await import('@/lib/firebase')
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore')

      if (!db) {
        throw new Error('Firebase não inicializado')
      }

      const companiesRef = collection(db, 'companies')
      const q = query(companiesRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const companiesList: Company[] = []
      snapshot.forEach((doc) => {
        companiesList.push({
          id: doc.id,
          ...doc.data()
        } as Company)
      })

      setCompanies(companiesList)
      console.log('✅ Empresas carregadas:', companiesList.length)
    } catch (error) {
      console.error('❌ Erro ao carregar empresas:', error)
      toast.error('Erro', 'Não foi possível carregar as empresas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    console.log('🚀 Criando nova empresa...')

    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast.error('Senhas não coincidem', 'Verifique as senhas digitadas')
      setFormLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast.error('Senha muito fraca', 'Senha deve ter pelo menos 6 caracteres')
      setFormLoading(false)
      return
    }

    if (!formData.companyName || !formData.adminName || !formData.adminEmail) {
      toast.error('Campos obrigatórios', 'Preencha todos os campos obrigatórios')
      setFormLoading(false)
      return
    }

    try {
      // Importar Firebase dinamicamente
      const { auth, db } = await import('@/lib/firebase')
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      const { doc, setDoc, collection } = await import('firebase/firestore')

      if (!auth || !db) {
        throw new Error('Firebase não inicializado')
      }

      console.log('🔥 Criando administrador da empresa...')
      
      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.adminEmail, formData.password)
      console.log('✅ Admin criado no Auth:', userCredential.user.uid)
      
      // 2. Criar documento da empresa
      const companyId = `company_${Date.now()}`
      const companyData = {
        name: formData.companyName,
        email: formData.companyEmail,
        plan: formData.plan,
        createdAt: new Date().toISOString(),
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        subscription: {
          plan: formData.plan,
          status: 'trial',
          startDate: new Date().toISOString()
        },
        adminUser: {
          name: formData.adminName,
          email: formData.adminEmail,
          id: userCredential.user.uid
        },
        stats: {
          userCount: 1,
          productCount: 0
        },
        settings: {
          maxUsers: formData.plan === 'BASIC' ? 3 : formData.plan === 'PRO' ? 10 : 50,
          maxProducts: formData.plan === 'BASIC' ? 100 : formData.plan === 'PRO' ? 1000 : 10000,
          features: getFeaturesByPlan(formData.plan)
        }
      }

      await setDoc(doc(db, 'companies', companyId), companyData)
      console.log('✅ Empresa criada:', companyId)

      // 3. Criar usuário admin da empresa
      const userData = {
        companyId: companyId,
        name: formData.adminName,
        email: formData.adminEmail,
        role: 'COMPANY_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        mustChangePassword: true // FORÇAR MUDANÇA DE SENHA
      }

      await setDoc(doc(db, `companies/${companyId}/users`, userCredential.user.uid), userData)
      console.log('✅ Admin da empresa criado')

      // 4. Criar coleções iniciais da empresa
      const collections = ['products', 'customers', 'suppliers', 'categories', 'movements']
      for (const collectionName of collections) {
        await setDoc(doc(db, `companies/${companyId}/${collectionName}`, 'init'), {
          initialized: true,
          createdAt: new Date().toISOString()
        })
      }
      console.log('✅ Coleções da empresa criadas')

      toast.success('Empresa criada!', `${formData.companyName} foi adicionada com sucesso`)
      
      // Limpar formulário
      setFormData({
        companyName: '',
        companyEmail: '',
        adminName: '',
        adminEmail: '',
        password: '',
        confirmPassword: '',
        plan: 'BASIC'
      })
      
      setShowForm(false)
      loadCompanies() // Recarregar lista
      
    } catch (error: any) {
      console.error('💥 Erro ao criar empresa:', error)
      
      let errorMessage = 'Tente novamente'
      let errorTitle = 'Erro ao criar empresa'
      
      if (error.code === 'auth/email-already-in-use') {
        errorTitle = 'Email já cadastrado'
        errorMessage = 'Este email já possui uma conta'
      } else if (error.code === 'auth/weak-password') {
        errorTitle = 'Senha muito fraca'
        errorMessage = 'Use pelo menos 6 caracteres'
      } else if (error.code === 'auth/invalid-email') {
        errorTitle = 'Email inválido'
        errorMessage = 'Formato de email incorreto'
      }
      
      toast.error(errorTitle, errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const getFeaturesByPlan = (plan: string): string[] => {
    const features = {
      BASIC: ['Gestão de Produtos', 'Clientes', 'Relatórios Básicos'],
      PRO: ['Gestão de Produtos', 'Clientes', 'Fornecedores', 'Relatórios Avançados', 'API'],
      ENTERPRISE: ['Todas as funcionalidades', 'Suporte prioritário', 'Customizações', 'Multi-usuários']
    }
    return features[plan as keyof typeof features] || []
  }

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, updateDoc } = await import('firebase/firestore')

      if (!db) {
        throw new Error('Firebase não inicializado')
      }

      await updateDoc(doc(db, 'companies', companyId), {
        isActive: !currentStatus
      })

      toast.success('Status atualizado!', `Empresa ${!currentStatus ? 'ativada' : 'desativada'}`)
      loadCompanies()
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error)
      toast.error('Erro', 'Não foi possível atualizar o status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getPlanBadge = (plan: string) => {
    const badges = {
      BASIC: '💎 Básico',
      PRO: '🚀 Pro', 
      ENTERPRISE: '⭐ Enterprise'
    }
    return badges[plan as keyof typeof badges] || plan
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      trial: '🎁 Trial',
      active: '✅ Ativo',
      expired: '❌ Expirado'
    }
    return badges[status as keyof typeof badges] || status
  }

  const getPlanPrice = (plan: string) => {
    const prices = {
      BASIC: 39,
      PRO: 59,
      ENTERPRISE: 99
    }
    return prices[plan as keyof typeof prices] || 0
  }

  const totalRevenue = companies.reduce((acc, company) => 
    acc + (company.subscription.status === 'active' ? getPlanPrice(company.plan) : 0), 0
  )

  // TELA DE LOGIN ADMIN (mantida igual à sua versão)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-800">Painel Administrativo</h1>
            <p className="text-gray-600 mt-2">Acesso restrito - Apenas administradores</p>
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>⚠️ Área Restrita:</strong> Este painel é exclusivo para administradores do sistema.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🔑 Email Administrativo
              </label>
              <input
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-800 font-medium"
                placeholder="admin@stockpro.com"
                disabled={authLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🔒 Senha Administrativa
              </label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-800 font-medium"
                placeholder="••••••••••••••••"
                disabled={authLoading}
              />
            </div>

            <LoadingButton
              type="submit"
              isLoading={authLoading}
              loadingText="Verificando..."
              variant="primary"
              size="lg"
              className="w-full"
            >
              🔓 Acessar Painel Admin
            </LoadingButton>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-gray-500">
              Sistema protegido por autenticação dupla
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>🛡️ Seguro</span>
              <span>🔒 Criptografado</span>
              <span>📊 Auditado</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              ← Voltar ao Login Normal
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA DE LOADING (mantida igual)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Carregando painel administrativo...</p>
          <p className="text-sm text-gray-500 mt-2">Sincronizando dados do Firebase</p>
        </div>
      </div>
    )
  }

  // PAINEL ADMIN PRINCIPAL
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header com Logout */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🛡️ Painel Administrativo</h1>
              <p className="text-gray-600 mt-1">Gerencie empresas e acessos do sistema StockPro</p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>👤 Admin: {ADMIN_EMAIL}</span>
                <span>🕒 {new Date().toLocaleString('pt-BR')}</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {showForm ? '❌ Cancelar' : '🏢 Nova Empresa'}
              </button>
              <button
                onClick={handleAdminLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                🚪 Sair
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🏢</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Empresas</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Empresas Ativas</p>
                <p className="text-2xl font-bold text-green-600">{companies.filter(c => c.isActive).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🎁</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Em Trial</p>
                <p className="text-2xl font-bold text-blue-600">{companies.filter(c => c.subscription.status === 'trial').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">💰</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold text-purple-600">R$ {totalRevenue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Criação de Empresa */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🏢 Criar Nova Empresa</h2>
            
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados da Empresa */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">🏢 Dados da Empresa</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="Ex: Adega do João"
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email da Empresa *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({...formData, companyEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="contato@empresa.com"
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plano *
                    </label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({...formData, plan: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      disabled={formLoading}
                    >
                      <option value="BASIC">💎 Básico - R$ 39/mês (3 usuários, 100 produtos)</option>
                      <option value="PRO">🚀 Profissional - R$ 59/mês (10 usuários, 1000 produtos)</option>
                      <option value="ENTERPRISE">⭐ Enterprise - R$ 99/mês (50 usuários, ilimitado)</option>
                    </select>
                  </div>
                </div>

                {/* Dados do Administrador */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">👤 Administrador da Empresa</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="João da Silva"
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email de Login *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="joao@empresa.com"
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Temporária *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      disabled={formLoading}
                    />
                    <p className="text-xs text-amber-600 mt-1">⚠️ Usuário será obrigado a alterar no primeiro login</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
                      placeholder="Digite a senha novamente"
                      minLength={6}
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={formLoading}
                  loadingText="Criando empresa..."
                  variant="primary"
                >
                  🚀 Criar Empresa
                </LoadingButton>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Empresas */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              🏢 Empresas Cadastradas ({companies.length})
            </h2>
          </div>

          {companies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <p className="text-gray-500 text-lg mb-2">Nenhuma empresa cadastrada ainda</p>
              <p className="text-gray-400 text-sm mb-6">Crie a primeira empresa para começar</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                🏢 Criar Primeira Empresa
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Administrador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estatísticas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trial até
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {company.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {company.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {company.adminUser.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {company.adminUser.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {getPlanBadge(company.plan)}
                          </span>
                          <span className="text-xs text-gray-500">
                            R$ {getPlanPrice(company.plan)}/mês
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            company.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {company.isActive ? '✅ Ativa' : '❌ Inativa'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getStatusBadge(company.subscription.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs text-gray-600">
                            👥 {company.stats.userCount} usuários
                          </span>
                          <span className="text-xs text-gray-600">
                            �� {company.stats.productCount} produtos
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(company.trialEndDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleCompanyStatus(company.id, company.isActive)}
                            className={`text-xs px-2 py-1 rounded ${
                              company.isActive 
                                ? 'text-red-600 hover:text-red-900 bg-red-50' 
                                : 'text-green-600 hover:text-green-900 bg-green-50'
                            }`}
                          >
                            {company.isActive ? '🚫 Desativar' : '✅ Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}