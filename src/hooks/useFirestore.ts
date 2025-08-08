// src/hooks/useFirestore.ts
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
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

interface UseFirestoreOptions {
  where?: QueryConstraint[]
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
  limitTo?: number
  realtime?: boolean
}

interface UseFirestoreReturn<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  refetch: () => void
  addDocument: (data: Omit<T, 'id'>) => Promise<string>
  updateDocument: (id: string, data: Partial<T>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
}

export function useFirestore<T extends DocumentData>(
  collectionName: string,
  options: UseFirestoreOptions = {}
): UseFirestoreReturn<T> {
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

  // Função para adicionar documento
  const addDocument = async (newData: Omit<T, 'id'>): Promise<string> => {
    if (!user?.uid) {
      throw new Error('Usuário não autenticado')
    }

    try {
      const docData = {
        ...newData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, collectionName), docData)
      console.log(`✅ Documento adicionado em ${collectionName}:`, docRef.id)
      return docRef.id
    } catch (err: any) {
      console.error(`❌ Erro ao adicionar em ${collectionName}:`, err)
      throw new Error(`Erro ao adicionar documento: ${err.message}`)
    }
  }

  // Função para atualizar documento
  const updateDocument = async (id: string, updateData: Partial<T>): Promise<void> => {
    try {
      const docData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      }

      await updateDoc(doc(db, collectionName, id), docData)
      console.log(`✅ Documento atualizado em ${collectionName}:`, id)
    } catch (err: any) {
      console.error(`❌ Erro ao atualizar em ${collectionName}:`, err)
      throw new Error(`Erro ao atualizar documento: ${err.message}`)
    }
  }

  // Função para deletar documento
  const deleteDocument = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, collectionName, id))
      console.log(`✅ Documento deletado em ${collectionName}:`, id)
    } catch (err: any) {
      console.error(`❌ Erro ao deletar em ${collectionName}:`, err)
      throw new Error(`Erro ao deletar documento: ${err.message}`)
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      setData([])
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | undefined

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Construir query
        const constraints: QueryConstraint[] = [
          // Filtrar sempre por usuário
          where('userId', '==', user.uid),
          // Adicionar constraints personalizadas
          ...whereConstraints
        ]

        // Adicionar ordenação se especificada
        if (orderByField) {
          constraints.push(orderBy(orderByField, orderByDirection))
        }

        // Adicionar limite se especificado
        if (limitTo) {
          constraints.push(limit(limitTo))
        }

        const q = query(collection(db, collectionName), ...constraints)

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
              console.log(`✅ Dados de ${collectionName} atualizados:`, items.length, 'itens')
            },
            (err) => {
              console.error(`❌ Erro ao buscar ${collectionName}:`, err)
              setError(`Erro ao carregar ${collectionName}: ${err.message}`)
              setLoading(false)
            }
          )
        }

      } catch (err: any) {
        console.error(`❌ Erro ao configurar listener de ${collectionName}:`, err)
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
  }, [user?.uid, collectionName, JSON.stringify(whereConstraints), orderByField, orderByDirection, limitTo, realtime])

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

// Hook específico para produtos
export function useProdutos() {
  return useFirestore<any>('produtos', {
    orderByField: 'dataCadastro',
    orderByDirection: 'desc'
  })
}

// Hook específico para movimentações
export function useMovimentacoes(limitTo?: number) {
  return useFirestore<any>('movimentacoes', {
    orderByField: 'data',
    orderByDirection: 'desc',
    limitTo
  })
}

// Hook para movimentações recentes
export function useMovimentacoesRecentes() {
  return useMovimentacoes(50) // Últimas 50 movimentações
}