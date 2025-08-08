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
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, additionalData?: any) => Promise<void>
}