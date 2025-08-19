// src/types/user.ts
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER' | 'EMPLOYEE'

export interface User {
  uid: string
  email: string | null  // 🔧 Aceitar null como no Firebase
  name?: string
  role: UserRole
  isActive?: boolean
  createdAt?: string
  lastLogin?: string
  mustChangePassword?: boolean
  
  // Campos multi-tenant
  isMultiTenant?: boolean
  companyId?: string | null  // 🔧 Aceitar null
  companyName?: string
  companyEmail?: string
  plan?: string
  trialEndDate?: string
  
  // Campos específicos do Firebase User que podem ser necessários
  emailVerified?: boolean
  photoURL?: string | null
  displayName?: string | null
  phoneNumber?: string | null
  
  // Campos adicionais que podem ser necessários
  passwordChangedAt?: string
  updatedAt?: string
}

// 🆕 INTERFACE PARA O CONTEXTO DE AUTENTICAÇÃO
export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, additionalData?: any) => Promise<void>
  checkPasswordChangeRequired: (firebaseUser: any) => Promise<boolean>
}