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
import { doc, getDoc, setDoc } from 'firebase/firestore'
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

  // Converter FirebaseUser para nosso User customizado
  const mapFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    try {
      // Buscar dados adicionais do Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      const userData = userDoc.exists() ? userDoc.data() : {}

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        companyName: userData.companyName || '',
        plan: userData.plan || 'BASIC',
        isActive: userData.isActive !== false, // Default true
        createdAt: userData.createdAt || new Date().toISOString(),
        trialEndDate: userData.trialEndDate || ''
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error)
      // Retornar dados básicos mesmo com erro
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        companyName: '',
        plan: 'BASIC',
        isActive: true,
        createdAt: new Date().toISOString(),
        trialEndDate: ''
      }
    }
  }

  // Função de login
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const mappedUser = await mapFirebaseUser(userCredential.user)
      setUser(mappedUser)
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

  // Função de registro
  const register = async (email: string, password: string, additionalData: any = {}): Promise<void> => {
    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Salvar dados adicionais no Firestore
      const userData = {
        companyName: additionalData.companyName || '',
        plan: additionalData.plan || 'BASIC',
        isActive: true,
        createdAt: new Date().toISOString(),
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
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
    register
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}