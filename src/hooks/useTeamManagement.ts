// src/hooks/useTeamManagement.ts
'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useMultiTenantFirestore } from './useMultiTenantFirestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface CreateEmployeeData {
  name: string
  email: string
  password: string
  role?: 'EMPLOYEE' | 'COMPANY_USER'
  isActive?: boolean
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'COMPANY_ADMIN' | 'EMPLOYEE' | 'COMPANY_USER'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  mustChangePassword: boolean
  companyId: string
  userId: string
  // 🆕 PROPRIEDADES ADICIONAIS
  updatedAt?: string
  passwordChangedAt?: string
}

// Limites por plano
const PLAN_LIMITS = {
  BASIC: { maxUsers: 3 },
  PRO: { maxUsers: 10 },
  ENTERPRISE: { maxUsers: 50 }
} as const

export function useTeamManagement() {
  const { user } = useAuth()
  const { data: teamMembers, loading, error, addDocument, updateDocument, deleteDocument } = useMultiTenantFirestore<TeamMember>('users', {
    orderByField: 'createdAt',
    orderByDirection: 'desc'
  })

  const [actionLoading, setActionLoading] = useState(false)

  // Verificar se usuário pode gerenciar equipe
  const canManageTeam = user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN'

  // Obter limites do plano
  const getMaxUsers = () => {
    const plan = user?.plan as keyof typeof PLAN_LIMITS
    return PLAN_LIMITS[plan]?.maxUsers || 3 // Default: 3 usuários
  }

  // Verificar se pode adicionar mais usuários
  const canAddMoreUsers = () => {
    const currentCount = teamMembers?.length || 0
    const maxUsers = getMaxUsers()
    return currentCount < maxUsers
  }

  // Obter usuários disponíveis restantes
  const getRemainingUsers = () => {
    const currentCount = teamMembers?.length || 0
    const maxUsers = getMaxUsers()
    return Math.max(0, maxUsers - currentCount)
  }

  // Criar funcionário
  const createEmployee = async (employeeData: CreateEmployeeData): Promise<void> => {
    if (!canManageTeam) {
      throw new Error('Apenas administradores podem criar funcionários')
    }

    if (!user?.companyId) {
      throw new Error('CompanyId não encontrado')
    }

    if (!canAddMoreUsers()) {
      const maxUsers = getMaxUsers()
      throw new Error(`Limite de ${maxUsers} usuários atingido para o plano ${user.plan}. Faça upgrade para adicionar mais usuários.`)
    }

    setActionLoading(true)

    try {
      console.log('🚀 Criando novo funcionário...')

      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, employeeData.password)
      console.log('✅ Usuário criado no Auth:', userCredential.user.uid)

      // 2. Criar documento do usuário na empresa
      const userData: Omit<TeamMember, 'id'> = {
        name: employeeData.name,
        email: employeeData.email,
        role: employeeData.role || 'EMPLOYEE',
        isActive: employeeData.isActive !== false,
        createdAt: new Date().toISOString(),
        mustChangePassword: true, // Forçar mudança de senha no primeiro login
        companyId: user.companyId,
        userId: userCredential.user.uid,
        updatedAt: new Date().toISOString()
      }

      await addDocument(userData)
      console.log('✅ Funcionário criado com sucesso')

    } catch (error: any) {
      console.error('❌ Erro ao criar funcionário:', error)
      
      // Tratar erros específicos do Firebase Auth
      let errorMessage = 'Erro ao criar funcionário'
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está sendo usado'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  // Ativar/desativar funcionário
  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean): Promise<void> => {
    if (!canManageTeam) {
      throw new Error('Apenas administradores podem alterar status de funcionários')
    }

    setActionLoading(true)

    try {
      await updateDocument(employeeId, {
        isActive: !currentStatus,
        updatedAt: new Date().toISOString()
      } as Partial<TeamMember>)
      console.log(`✅ Status do funcionário ${!currentStatus ? 'ativado' : 'desativado'}`)
    } catch (error: any) {
      console.error('❌ Erro ao alterar status:', error)
      throw new Error('Erro ao alterar status do funcionário')
    } finally {
      setActionLoading(false)
    }
  }

  // Redefinir senha do funcionário
  const resetEmployeePassword = async (employeeId: string): Promise<void> => {
    if (!canManageTeam) {
      throw new Error('Apenas administradores podem redefinir senhas')
    }

    setActionLoading(true)

    try {
      await updateDocument(employeeId, {
        mustChangePassword: true,
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Partial<TeamMember>)
      console.log('✅ Senha redefinida - usuário deve alterar no próximo login')
    } catch (error: any) {
      console.error('❌ Erro ao redefinir senha:', error)
      throw new Error('Erro ao redefinir senha')
    } finally {
      setActionLoading(false)
    }
  }

  // Excluir funcionário
  const removeEmployee = async (employeeId: string): Promise<void> => {
    if (!canManageTeam) {
      throw new Error('Apenas administradores podem remover funcionários')
    }

    const employee = teamMembers?.find(m => m.id === employeeId)
    if (employee?.role === 'COMPANY_ADMIN') {
      throw new Error('Não é possível remover administradores da empresa')
    }

    setActionLoading(true)

    try {
      await deleteDocument(employeeId)
      console.log('✅ Funcionário removido com sucesso')
    } catch (error: any) {
      console.error('❌ Erro ao remover funcionário:', error)
      throw new Error('Erro ao remover funcionário')
    } finally {
      setActionLoading(false)
    }
  }

  // Obter estatísticas da equipe
  const getTeamStats = () => {
    if (!teamMembers) return null

    const total = teamMembers.length
    const active = teamMembers.filter(m => m.isActive).length
    const inactive = total - active
    const admins = teamMembers.filter(m => m.role === 'COMPANY_ADMIN').length
    const employees = teamMembers.filter(m => m.role === 'EMPLOYEE' || m.role === 'COMPANY_USER').length

    return {
      total,
      active,
      inactive,
      admins,
      employees,
      maxUsers: getMaxUsers(),
      remainingSlots: getRemainingUsers()
    }
  }

  return {
    // Dados
    teamMembers: teamMembers || [],
    loading,
    error,
    actionLoading,

    // Permissões
    canManageTeam,
    canAddMoreUsers: canAddMoreUsers(),
    
    // Limites
    maxUsers: getMaxUsers(),
    remainingUsers: getRemainingUsers(),
    
    // Ações
    createEmployee,
    toggleEmployeeStatus,
    resetEmployeePassword,
    removeEmployee,
    
    // Estatísticas
    teamStats: getTeamStats()
  }
}

// Hook para listar apenas funcionários (sem admins)
export function useEmployees() {
  const { teamMembers, loading, error } = useTeamManagement()
  
  const employees = teamMembers.filter(member => 
    member.role === 'EMPLOYEE' || member.role === 'COMPANY_USER'
  )

  return {
    employees,
    loading,
    error
  }
}

// Hook para verificar se é o próprio usuário
export function useIsCurrentUser() {
  const { user } = useAuth()
  
  const isCurrentUser = (userId: string) => {
    return user?.uid === userId
  }

  return { isCurrentUser }
}