// src/app/equipe/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamManagement } from '@/hooks/useTeamManagement'
import { usePermissions } from '@/hooks/usePermissions'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

interface CreateEmployeeForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'EMPLOYEE' | 'COMPANY_USER'
}

export default function EquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const toast = useToastContext()
  
  const {
    teamMembers,
    loading,
    error,
    actionLoading,
    canManageTeam,
    canAddMoreUsers,
    maxUsers,
    remainingUsers,
    createEmployee,
    toggleEmployeeStatus,
    resetEmployeePassword,
    removeEmployee,
    teamStats
  } = useTeamManagement()

  // Estados do formulário
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState<CreateEmployeeForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'EMPLOYEE'
  })

  // Verificar se usuário pode acessar esta página
  if (!permissions.canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para gerenciar a equipe.
            Esta área é exclusiva para administradores.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Função para criar funcionário
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast.error('Senhas não coincidem', 'Verifique as senhas digitadas')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Senha muito fraca', 'Senha deve ter pelo menos 6 caracteres')
      return
    }

    if (!formData.name || !formData.email) {
      toast.error('Campos obrigatórios', 'Preencha todos os campos obrigatórios')
      return
    }

    setFormLoading(true)

    try {
      await createEmployee({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      })

      toast.success('Funcionário criado!', `${formData.name} foi adicionado à equipe`)
      
      // Limpar formulário
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'EMPLOYEE'
      })
      
      setShowForm(false)
      
    } catch (error: any) {
      console.error('❌ Erro ao criar funcionário:', error)
      toast.error('Erro ao criar funcionário', error.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Função para alternar status
  const handleToggleStatus = async (employeeId: string, currentStatus: boolean, employeeName: string) => {
    try {
      await toggleEmployeeStatus(employeeId, currentStatus)
      toast.success(
        'Status atualizado!', 
        `${employeeName} foi ${!currentStatus ? 'ativado' : 'desativado'}`
      )
    } catch (error: any) {
      toast.error('Erro', error.message)
    }
  }

  // Função para resetar senha
  const handleResetPassword = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Tem certeza que deseja redefinir a senha de ${employeeName}?\n\nO funcionário será obrigado a alterar a senha no próximo login.`)) {
      return
    }

    try {
      await resetEmployeePassword(employeeId)
      toast.success('Senha redefinida!', `${employeeName} deve alterar a senha no próximo login`)
    } catch (error: any) {
      toast.error('Erro', error.message)
    }
  }

  // Função para remover funcionário
  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`⚠️ ATENÇÃO!\n\nTem certeza que deseja REMOVER ${employeeName} da equipe?\n\nEsta ação NÃO pode ser desfeita!`)) {
      return
    }

    try {
      await removeEmployee(employeeId)
      toast.success('Funcionário removido!', `${employeeName} foi removido da equipe`)
    } catch (error: any) {
      toast.error('Erro', error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      COMPANY_ADMIN: '👑 Administrador',
      EMPLOYEE: '👤 Funcionário',
      COMPANY_USER: '👤 Usuário'
    }
    return badges[role as keyof typeof badges] || role
  }

  const getRoleColor = (role: string) => {
    const colors = {
      COMPANY_ADMIN: 'bg-purple-100 text-purple-800',
      EMPLOYEE: 'bg-blue-100 text-blue-800',
      COMPANY_USER: 'bg-green-100 text-green-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Carregando equipe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">�� Gestão de Equipe</h1>
              <p className="text-gray-600 mt-1">Gerencie funcionários e permissões da sua empresa</p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>🏢 {user?.companyName}</span>
                <span>📋 Plano: {user?.plan}</span>
                <span>👥 {teamStats?.total || 0}/{maxUsers} usuários</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                ← Dashboard
              </button>
              {canAddMoreUsers ? (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {showForm ? '❌ Cancelar' : '➕ Novo Funcionário'}
                </button>
              ) : (
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium">
                  🚫 Limite de usuários atingido
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">👥</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Membros</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats?.total || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✅</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{teamStats?.active || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">👑</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-purple-600">{teamStats?.admins || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📊</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Slots Restantes</p>
                <p className="text-2xl font-bold text-blue-600">{remainingUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso de Limite */}
        {!canAddMoreUsers && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚠️</div>
              <div>
                <h3 className="font-medium text-amber-800">Limite de usuários atingido</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Você já possui {maxUsers} usuários no plano {user?.plan}. 
                  Para adicionar mais funcionários, considere fazer upgrade do seu plano.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulário de Criação */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">➕ Adicionar Novo Funcionário</h2>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="João Silva Santos"
                    disabled={formLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="joao.silva@empresa.com"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    disabled={formLoading}
                  />
                  <p className="text-xs text-amber-600 mt-1">⚠️ Funcionário será obrigado a alterar no primeiro login</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="Digite a senha novamente"
                    minLength={6}
                    disabled={formLoading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Funcionário
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as 'EMPLOYEE' | 'COMPANY_USER'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    disabled={formLoading}
                  >
                    <option value="EMPLOYEE">👤 Funcionário (acesso limitado - sem custos/lucros)</option>
                    <option value="COMPANY_USER">👤 Usuário da Empresa (acesso padrão)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Funcionários não visualizam informações financeiras sensíveis
                  </p>
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
                  loadingText="Criando funcionário..."
                  variant="primary"
                  disabled={!canAddMoreUsers}
                >
                  ➕ Criar Funcionário
                </LoadingButton>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Funcionários */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              👥 Membros da Equipe ({teamMembers.length})
            </h2>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg mb-2">Nenhum funcionário cadastrado ainda</p>
              <p className="text-gray-400 text-sm mb-6">Adicione o primeiro membro da sua equipe</p>
              {canAddMoreUsers && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  ➕ Adicionar Primeiro Funcionário
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Funcionário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastrado em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">
                            {member.role === 'COMPANY_ADMIN' ? '��' : '👤'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                            {member.mustChangePassword && (
                              <div className="text-xs text-amber-600 mt-1">
                                ⚠️ Deve alterar senha
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getRoleColor(member.role)}`}>
                          {getRoleBadge(member.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                          member.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.isActive ? '✅ Ativo' : '❌ Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.lastLogin ? formatDate(member.lastLogin) : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {member.role !== 'COMPANY_ADMIN' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleToggleStatus(member.id, member.isActive, member.name)}
                              className={`text-xs px-2 py-1 rounded ${
                                member.isActive 
                                  ? 'text-red-600 hover:text-red-900 bg-red-50' 
                                  : 'text-green-600 hover:text-green-900 bg-green-50'
                              }`}
                              disabled={actionLoading}
                            >
                              {member.isActive ? '🚫 Desativar' : '✅ Ativar'}
                            </button>
                            <button
                              onClick={() => handleResetPassword(member.id, member.name)}
                              className="text-xs px-2 py-1 rounded text-blue-600 hover:text-blue-900 bg-blue-50"
                              disabled={actionLoading}
                            >
                              🔑 Reset Senha
                            </button>
                            <button
                              onClick={() => handleRemoveEmployee(member.id, member.name)}
                              className="text-xs px-2 py-1 rounded text-red-600 hover:text-red-900 bg-red-50"
                              disabled={actionLoading}
                            >
                              🗑️ Remover
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">👑 Administrador</span>
                        )}
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