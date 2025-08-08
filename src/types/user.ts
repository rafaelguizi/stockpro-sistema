// src/types/user.ts
export interface User {
  uid: string
  email: string | null
  displayName?: string | null
  companyName?: string
  plan?: string
  isActive?: boolean
  createdAt?: string
  trialEndDate?: string
  
  // 🆕 NOVOS CAMPOS (OPCIONAIS PARA COMPATIBILIDADE)
  companyId?: string | null
  companyEmail?: string
  mustChangePassword?: boolean
  role?: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER'
  lastLogin?: string
  passwordChangedAt?: string
  isMultiTenant?: boolean
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, additionalData?: any) => Promise<void>
  
  // 🆕 NOVA FUNÇÃO (OPCIONAL PARA COMPATIBILIDADE)
  checkPasswordChangeRequired?: (firebaseUser: any) => Promise<boolean>
}