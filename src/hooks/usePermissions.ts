// src/hooks/usePermissions.ts
'use client'
import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface Permissions {
  // 💰 Visualização financeira
  canViewCosts: boolean
  canViewProfits: boolean
  canViewMargins: boolean
  
  // 👥 Gestão de usuários
  canManageUsers: boolean
  canViewUsers: boolean
  canCreateUsers: boolean
  canDeleteUsers: boolean
  
  // 📦 Gestão de produtos
  canManageProducts: boolean
  canViewProducts: boolean
  canCreateProducts: boolean
  canDeleteProducts: boolean
  canEditPrices: boolean
  
  // 📊 Relatórios
  canViewFullReports: boolean
  canViewBasicReports: boolean
  canExportReports: boolean
  
  // 🏪 PDV e Vendas
  canAccessPDV: boolean
  canMakeSales: boolean
  canApplyDiscounts: boolean
  canCancelSales: boolean
  
  // ⚙️ Configurações
  canAccessSettings: boolean
  canEditCompanyInfo: boolean
  canManagePlans: boolean
  
  // 👥 Clientes e Fornecedores
  canManageCustomers: boolean
  canManageSuppliers: boolean
  canViewCustomers: boolean
  canViewSuppliers: boolean
}

export interface UserLimits {
  maxDiscountPercent: number
  maxSaleValue: number
  canViewOtherUsersSales: boolean
}

export function usePermissions(): { permissions: Permissions; limits: UserLimits } {
  const { user } = useAuth()

  const permissions = useMemo((): Permissions => {
    if (!user) {
      // Usuário não logado - sem permissões
      return {
        canViewCosts: false,
        canViewProfits: false,
        canViewMargins: false,
        canManageUsers: false,
        canViewUsers: false,
        canCreateUsers: false,
        canDeleteUsers: false,
        canManageProducts: false,
        canViewProducts: false,
        canCreateProducts: false,
        canDeleteProducts: false,
        canEditPrices: false,
        canViewFullReports: false,
        canViewBasicReports: false,
        canExportReports: false,
        canAccessPDV: false,
        canMakeSales: false,
        canApplyDiscounts: false,
        canCancelSales: false,
        canAccessSettings: false,
        canEditCompanyInfo: false,
        canManagePlans: false,
        canManageCustomers: false,
        canManageSuppliers: false,
        canViewCustomers: false,
        canViewSuppliers: false
      }
    }

    const role = user.role

    switch (role) {
      case 'SUPER_ADMIN':
        // Super Admin - acesso total ao sistema
        return {
          canViewCosts: true,
          canViewProfits: true,
          canViewMargins: true,
          canManageUsers: true,
          canViewUsers: true,
          canCreateUsers: true,
          canDeleteUsers: true,
          canManageProducts: true,
          canViewProducts: true,
          canCreateProducts: true,
          canDeleteProducts: true,
          canEditPrices: true,
          canViewFullReports: true,
          canViewBasicReports: true,
          canExportReports: true,
          canAccessPDV: true,
          canMakeSales: true,
          canApplyDiscounts: true,
          canCancelSales: true,
          canAccessSettings: true,
          canEditCompanyInfo: true,
          canManagePlans: true,
          canManageCustomers: true,
          canManageSuppliers: true,
          canViewCustomers: true,
          canViewSuppliers: true
        }

      case 'COMPANY_ADMIN':
        // Admin da empresa - controle total da empresa
        return {
          canViewCosts: true,
          canViewProfits: true,
          canViewMargins: true,
          canManageUsers: true,
          canViewUsers: true,
          canCreateUsers: true,
          canDeleteUsers: true,
          canManageProducts: true,
          canViewProducts: true,
          canCreateProducts: true,
          canDeleteProducts: true,
          canEditPrices: true,
          canViewFullReports: true,
          canViewBasicReports: true,
          canExportReports: true,
          canAccessPDV: true,
          canMakeSales: true,
          canApplyDiscounts: true,
          canCancelSales: true,
          canAccessSettings: true,
          canEditCompanyInfo: true,
          canManagePlans: false, // Não pode alterar planos
          canManageCustomers: true,
          canManageSuppliers: true,
          canViewCustomers: true,
          canViewSuppliers: true
        }

      case 'EMPLOYEE':
      case 'COMPANY_USER':
        // Funcionário - acesso limitado
        return {
          canViewCosts: false, // 🚫 Não vê custos
          canViewProfits: false, // 🚫 Não vê lucros  
          canViewMargins: false, // �� Não vê margens
          canManageUsers: false, // �� Não gerencia usuários
          canViewUsers: true, // ✅ Pode ver lista de usuários
          canCreateUsers: false,
          canDeleteUsers: false,
          canManageProducts: true, // ✅ Pode gerenciar produtos
          canViewProducts: true,
          canCreateProducts: true,
          canDeleteProducts: false, // �� Não pode deletar
          canEditPrices: false, // 🚫 Não edita preços
          canViewFullReports: false, // 🚫 Não vê relatórios completos
          canViewBasicReports: true, // ✅ Relatórios básicos
          canExportReports: false,
          canAccessPDV: true, // ✅ Acesso ao PDV
          canMakeSales: true, // ✅ Pode vender
          canApplyDiscounts: true, // ✅ Pode dar desconto (limitado)
          canCancelSales: false, // 🚫 Não cancela vendas
          canAccessSettings: false, // �� Não acessa configurações
          canEditCompanyInfo: false,
          canManagePlans: false,
          canManageCustomers: true, // ✅ Gerencia clientes
          canManageSuppliers: false, // �� Não gerencia fornecedores
          canViewCustomers: true,
          canViewSuppliers: true // ✅ Só visualiza fornecedores
        }

      default:
        // Fallback para roles desconhecidos
        console.warn('⚠️ Role desconhecido:', role)
        return {
          canViewCosts: false,
          canViewProfits: false,
          canViewMargins: false,
          canManageUsers: false,
          canViewUsers: false,
          canCreateUsers: false,
          canDeleteUsers: false,
          canManageProducts: false,
          canViewProducts: true,
          canCreateProducts: false,
          canDeleteProducts: false,
          canEditPrices: false,
          canViewFullReports: false,
          canViewBasicReports: true,
          canExportReports: false,
          canAccessPDV: true,
          canMakeSales: true,
          canApplyDiscounts: false,
          canCancelSales: false,
          canAccessSettings: false,
          canEditCompanyInfo: false,
          canManagePlans: false,
          canManageCustomers: false,
          canManageSuppliers: false,
          canViewCustomers: true,
          canViewSuppliers: true
        }
    }
  }, [user?.role])

  const limits = useMemo((): UserLimits => {
    const role = user?.role

    switch (role) {
      case 'SUPER_ADMIN':
      case 'COMPANY_ADMIN':
        return {
          maxDiscountPercent: 100, // Sem limite
          maxSaleValue: Number.MAX_SAFE_INTEGER, // Sem limite
          canViewOtherUsersSales: true
        }

      case 'EMPLOYEE':
      case 'COMPANY_USER':
        return {
          maxDiscountPercent: 10, // Máximo 10% de desconto
          maxSaleValue: 5000, // Máximo R$ 5.000 por venda
          canViewOtherUsersSales: false // Só vê próprias vendas
        }

      default:
        return {
          maxDiscountPercent: 0,
          maxSaleValue: 0,
          canViewOtherUsersSales: false
        }
    }
  }, [user?.role])

  return { permissions, limits }
}

// Hook para verificação rápida de permissão específica
export function useHasPermission(permission: keyof Permissions): boolean {
  const { permissions } = usePermissions()
  return permissions[permission]
}

// Hook para verificar se é admin
export function useIsAdmin(): boolean {
  const { user } = useAuth()
  return user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN'
}

// Hook para verificar se é funcionário
export function useIsEmployee(): boolean {
  const { user } = useAuth()
  return user?.role === 'EMPLOYEE' || user?.role === 'COMPANY_USER'
}