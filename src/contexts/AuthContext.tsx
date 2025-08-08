// src/contexts/AuthContext.tsx
'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User, AuthContextType } from '@/types/user'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 🆕 Buscar usuário na estrutura multi-tenant
  const findUserInCompanies = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('🔍 Buscando usuário na estrutura multi-tenant...')
      
      // Buscar em todas as empresas
      const companiesRef = collection(db, 'companies')
      const companiesSnapshot = await getDocs(companiesRef)
      
      for (const companyDoc of companiesSnapshot.docs) {
        const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const companyData = companyDoc.data()
          
          console.log('✅ Usuário encontrado na empresa:', companyData.name)
          
          return {
            userData,
            companyData,
            companyId: companyDoc.id,
            isMultiTenant: true
          }
        }
      }
      
      console.log('❌ Usuário não encontrado na estrutura multi-tenant')
      return null
    } catch (error) {
      console.error('❌ Erro ao buscar na estrutura multi-tenant:', error)
      return null
    }
  }

  // 🔄 Buscar usuário na estrutura legacy (compatibilidade)
  const findUserInLegacy = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('🔄 Buscando usuário na estrutura legacy...')
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      
      if (userDoc.exists()) {
        console.log('✅ Usuário encontrado na estrutura legacy')
        return {
          userData: userDoc.data(),
          companyData: null,
          companyId: null,
          isMultiTenant: false
        }
      }
      
      return null
    } catch (error) {
      console.error('❌ Erro ao buscar na estrutura legacy:', error)
      return null
    }
  }

  // Converter FirebaseUser para nosso User customizado
  const mapFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    try {
      // 🆕 Primeiro tentar estrutura multi-tenant
      let userInfo = await findUserInCompanies(firebaseUser)
      
      // 🔄 Se não encontrar, tentar estrutura legacy
      if (!userInfo) {
        userInfo = await findUserInLegacy(firebaseUser)
      }

      // 📋 Processar dados encontrados
      if (userInfo) {
        const { userData, companyData, companyId, isMultiTenant } = userInfo
        
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || userData.name || userData.userName || '',
          
          // 🏢 Dados da empresa (multi-tenant ou legacy)
          companyName: companyData?.name || userData.companyName || '',
          companyId: companyId,
          companyEmail: companyData?.email || userData.companyEmail || '',
          
          // 📊 Dados do plano
          plan: companyData?.plan || userData.plan || 'BASIC',
          
          // 🔒 Status e segurança
          isActive: userData.isActive !== false,
          mustChangePassword: userData.mustChangePassword || false, // 🆕 Campo importante
          role: userData.role || 'COMPANY_USER',
          
          // 📅 Datas
          createdAt: userData.createdAt || new Date().toISOString(),
          trialEndDate: companyData?.trialEndDate || userData.trialEndDate || '',
          lastLogin: userData.lastLogin,
          
          // 🏗️ Metadados
          isMultiTenant,
          passwordChangedAt: userData.passwordChangedAt
        }
      }

      // 🆕 Se não encontrar em lugar nenhum, criar dados básicos
      console.log('⚠️ Usuário não encontrado em nenhuma estrutura, criando dados básicos')
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        companyName: '',
        companyId: null,
        companyEmail: '',
        plan: 'BASIC',
        isActive: true,
        mustChangePassword: false,
        role: 'COMPANY_USER',
        createdAt: new Date().toISOString(),
        trialEndDate: '',
        isMultiTenant: false
      }
      
    } catch (error) {
      console.error('❌ Erro ao mapear usuário:', error)
      
      // Retornar dados mínimos em caso de erro
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        companyName: '',
        companyId: null,
        companyEmail: '',
        plan: 'BASIC',
        isActive: true,
        mustChangePassword: false,
        role: 'COMPANY_USER',
        createdAt: new Date().toISOString(),
        trialEndDate: '',
        isMultiTenant: false
      }
    }
  }

  // 🆕 Verificar se usuário deve alterar senha
  const checkPasswordChangeRequired = async (firebaseUser: FirebaseUser): Promise<boolean> => {
    try {
      // Tentar estrutura multi-tenant primeiro
      const userInfo = await findUserInCompanies(firebaseUser)
      
      if (userInfo && userInfo.userData.mustChangePassword) {
        console.log('⚠️ Usuário deve alterar senha (multi-tenant)')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Erro ao verificar mustChangePassword:', error)
      return false
    }
  }

  // Função de login
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true)
      console.log('🔐 Realizando login Firebase...')
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ Login Firebase realizado:', userCredential.user.email)
      
      // 🆕 Verificar se deve alterar senha ANTES de mapear completamente
      const mustChange = await checkPasswordChangeRequired(userCredential.user)
      
      const mappedUser = await mapFirebaseUser(userCredential.user)
      setUser(mappedUser)
      
      // 🆕 Se deve alterar senha, não fazer nada aqui (o login page vai tratar)
      if (mustChange) {
        console.log('⚠️ Usuário deve alterar senha - redirecionamento será feito pelo login page')
      }
      
      console.log('✅ Login realizado com sucesso:', mappedUser.email)
    } catch (error: any) {
      console.error('❌ Erro no login:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Função de logout
  const logout = async (): Promise<void> => {
    try {
      setLoading(true)
      await signOut(auth)
      setUser(null)
      console.log('✅ Logout realizado com sucesso')
    } catch (error: any) {
      console.error('❌ Erro no logout:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Função de registro (mantida para compatibilidade legacy)
  const register = async (email: string, password: string, additionalData: any = {}): Promise<void> => {
    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // 🔄 Salvar na estrutura legacy para compatibilidade
      const userData = {
        companyName: additionalData.companyName || '',
        plan: additionalData.plan || 'BASIC',
        isActive: true,
        createdAt: new Date().toISOString(),
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        mustChangePassword: false, // 🆕 Padrão false para registros legacy
        role: 'COMPANY_USER',
        ...additionalData
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData)
      
      const mappedUser = await mapFirebaseUser(userCredential.user)
      setUser(mappedUser)
      console.log('✅ Registro realizado com sucesso:', mappedUser.email)
    } catch (error: any) {
      console.error('❌ Erro no registro:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Escutar mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('👤 Usuário detectado:', firebaseUser.email)
          const mappedUser = await mapFirebaseUser(firebaseUser)
          setUser(mappedUser)
          
          // 🆕 Atualizar último login na estrutura correta
          try {
            if (mappedUser.isMultiTenant && mappedUser.companyId) {
              await setDoc(
                doc(db, `companies/${mappedUser.companyId}/users`, firebaseUser.uid),
                { lastLogin: new Date().toISOString() },
                { merge: true }
              )
            } else {
              await setDoc(
                doc(db, 'users', firebaseUser.uid),
                { lastLogin: new Date().toISOString() },
                { merge: true }
              )
            }
          } catch (updateError) {
            console.log('⚠️ Erro ao atualizar último login:', updateError)
          }
          
        } else {
          console.log('👋 Usuário não logado')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Erro ao processar estado de autenticação:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    checkPasswordChangeRequired // 🆕 Exportar função
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}