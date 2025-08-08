// src/lib/multi-tenant-structure.ts

export interface Company {
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
    endDate?: string
  }
  settings: {
    maxUsers: number
    maxProducts: number
    features: string[]
  }
}

export interface User {
  id: string
  companyId: string // CHAVE PARA ISOLAMENTO
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  mustChangePassword: boolean // FORÇAR MUDANÇA DE SENHA
}

export interface CompanyData {
  // Todas as collections ficam dentro da empresa
  products: any[]
  customers: any[]
  suppliers: any[]
  categories: any[]
  movements: any[]
}

// Estrutura no Firestore:
// /companies/{companyId} -> Company data
// /companies/{companyId}/users/{userId} -> Users da empresa
// /companies/{companyId}/products/{productId} -> Produtos da empresa
// /companies/{companyId}/customers/{customerId} -> Clientes da empresa
// /admin/superAdmins/{adminId} -> Super admins do sistema