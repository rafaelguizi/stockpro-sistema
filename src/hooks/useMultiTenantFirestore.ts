// src/hooks/useMultiTenantFirestore.ts
'use client'
import { useState, useEffect } from 'react'
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  QueryConstraint,
  DocumentData,
  getDocs
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

interface UseMultiTenantFirestoreOptions {
  where?: QueryConstraint[]
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
  limitTo?: number
  realtime?: boolean
}

interface UseMultiTenantFirestoreReturn<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  refetch: () => void
  addDocument: (data: Omit<T, 'id'>) => Promise<string>
  updateDocument: (id: string, data: Partial<T>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

export function useMultiTenantFirestore<T extends DocumentData>(
  collectionName: string,
  options: UseMultiTenantFirestoreOptions = {}
): UseMultiTenantFirestoreReturn<T> {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const {
    where: whereConstraints = [],
    orderByField,
    orderByDirection = 'desc',
    limitTo,
    realtime = true
  } = options

  const refetch = () => {
    setLoading(true)
    setError(null)
  }

  // Determinar o caminho da collection baseado na estrutura do usuário
  const getCollectionPath = () => {
    if (user?.isMultiTenant && user?.companyId) {
      // Nova estrutura multi-tenant
      return `companies/${user.companyId}/${collectionName}`
    } else if (user?.uid) {
      // Estrutura legacy - usar diretamente a collection com filtro por userId
      return collectionName
    }
    return null
  }

  // Função para adicionar documento
  const addDocument = async (newData: Omit<T, 'id'>): Promise<string> => {
    if (!user?.uid) {
      throw new Error('Usuário não autenticado')
    }

    const collectionPath = getCollectionPath()
    if (!collectionPath) {
      throw new Error('Caminho da collection não encontrado')
    }

    try {
      const docData = {
        ...newData,
        userId: user.uid,
        companyId: user.companyId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, collectionPath), docData)
      console.log(`✅ Documento adicionado em ${collectionPath}:`, docRef.id)
      return docRef.id
    } catch (err: any) {
      console.error(`❌ Erro ao adicionar em ${collectionPath}:`, err)
      throw new Error(`Erro ao adicionar documento: ${err.message}`)
    }
  }

  // Função para atualizar documento
  const updateDocument = async (id: string, updateData: Partial<T>): Promise<void> => {
    const collectionPath = getCollectionPath()
    if (!collectionPath) {
      throw new Error('Caminho da collection não encontrado')
    }

    try {
      const docData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      }

      await updateDoc(doc(db, collectionPath, id), docData)
      console.log(`✅ Documento atualizado em ${collectionPath}:`, id)
    } catch (err: any) {
      console.error(`❌ Erro ao atualizar em ${collectionPath}:`, err)
      throw new Error(`Erro ao atualizar documento: ${err.message}`)
    }
  }

  // Função para deletar documento
  const deleteDocument = async (id: string): Promise<void> => {
    const collectionPath = getCollectionPath()
    if (!collectionPath) {
      throw new Error('Caminho da collection não encontrado')
    }

    try {
      await deleteDoc(doc(db, collectionPath, id))
      console.log(`✅ Documento deletado em ${collectionPath}:`, id)
    } catch (err: any) {
      console.error(`❌ Erro ao deletar em ${collectionPath}:`, err)
      throw new Error(`Erro ao deletar documento: ${err.message}`)
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      setData([])
      setLoading(false)
      return
    }

    const collectionPath = getCollectionPath()
    if (!collectionPath) {
      setData([])
      setLoading(false)
      console.log('⚠️ Usuário sem estrutura de dados definida')
      return
    }

    let unsubscribe: (() => void) | undefined

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`🔍 Buscando dados em: ${collectionPath}`)

        // Construir query
        const constraints: QueryConstraint[] = []

        // Para estrutura legacy, adicionar filtro por userId
        if (!user.isMultiTenant) {
          constraints.push(where('userId', '==', user.uid))
        }

        // Adicionar constraints personalizadas
        constraints.push(...whereConstraints)

        // Adicionar ordenação se especificada
        if (orderByField) {
          constraints.push(orderBy(orderByField, orderByDirection))
        }

        // Adicionar limite se especificado
        if (limitTo) {
          constraints.push(limit(limitTo))
        }

        const q = query(collection(db, collectionPath), ...constraints)

        if (realtime) {
          // Listener em tempo real
          unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const items: T[] = []
              snapshot.forEach((doc) => {
                items.push({
                  id: doc.id,
                  ...doc.data()
                } as unknown as T)
              })
              
              setData(items)
              setLoading(false)
              console.log(`✅ Dados de ${collectionPath} atualizados:`, items.length, 'itens')
            },
            (err) => {
              console.error(`❌ Erro ao buscar ${collectionPath}:`, err)
              setError(`Erro ao carregar ${collectionName}: ${err.message}`)
              setLoading(false)
            }
          )
        }

      } catch (err: any) {
        console.error(`❌ Erro ao configurar listener de ${collectionPath}:`, err)
        setError(`Erro ao configurar ${collectionName}: ${err.message}`)
        setLoading(false)
      }
    }

    fetchData()

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user?.uid, user?.companyId, user?.isMultiTenant, collectionName, JSON.stringify(whereConstraints), orderByField, orderByDirection, limitTo, realtime])

  return { 
    data, 
    loading, 
    error, 
    refetch, 
    addDocument, 
    updateDocument, 
    deleteDocument 
  }
}

// Hook específico para produtos multi-tenant
export function useMultiTenantProdutos() {
  return useMultiTenantFirestore<any>('produtos', {
    orderByField: 'dataCadastro',
    orderByDirection: 'desc'
  })
}

// Hook específico para movimentações multi-tenant
export function useMultiTenantMovimentacoes(limitTo?: number) {
  return useMultiTenantFirestore<any>('movimentacoes', {
    orderByField: 'data',
    orderByDirection: 'desc',
    limitTo
  })
}

// Hook para movimentações recentes multi-tenant
export function useMultiTenantMovimentacoesRecentes() {
  return useMultiTenantMovimentacoes(50)
}

// Adicionar estas funções ao final do useMultiTenantFirestore.ts

// Hook específico para usuários/funcionários multi-tenant
export function useTeamMembers() {
  return useMultiTenantFirestore<any>('users', {
    orderByField: 'createdAt',
    orderByDirection: 'desc'
  })
}

// Hook para clientes multi-tenant
export function useMultiTenantClientes() {
  return useMultiTenantFirestore<any>('customers', {
    orderByField: 'createdAt',
    orderByDirection: 'desc'
  })
}

// Hook para fornecedores multi-tenant
export function useMultiTenantFornecedores() {
  return useMultiTenantFirestore<any>('suppliers', {
    orderByField: 'createdAt',
    orderByDirection: 'desc'
  })
}

// Hook para categorias multi-tenant
export function useMultiTenantCategorias() {
  return useMultiTenantFirestore<any>('categories', {
    orderByField: 'name',
    orderByDirection: 'asc'
  })
}