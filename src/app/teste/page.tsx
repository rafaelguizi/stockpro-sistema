// src/app/teste/page.tsx
'use client'
import { auth, db } from '@/lib/firebase'
import { useState } from 'react'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'
import MobileHeader from '@/components/MobileHeader'

export default function TestePage() {
  const [status, setStatus] = useState('Testando conexão...')
  const [loading, setLoading] = useState(false)
  const [loadingToast, setLoadingToast] = useState(false)
  const toast = useToastContext()

  const testarConexao = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('Auth:', auth)
      console.log('Firestore:', db)
      
      setStatus('✅ Firebase conectado com sucesso!')
      toast.success('Firebase conectado!', 'Tudo funcionando perfeitamente')
    } catch (error) {
      console.error('Erro:', error)
      setStatus('❌ Erro na conexão: ' + error)
      toast.error('Erro na conexão', 'Verifique as configurações do Firebase')
    } finally {
      setLoading(false)
    }
  }

  const testarToasts = async () => {
    setLoadingToast(true)
    
    try {
      toast.success('Sucesso!', 'Esta é uma notificação de sucesso')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.warning('Atenção!', 'Esta é uma notificação de aviso')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.info('Informação', 'Esta é uma notificação informativa')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.error('Erro!', 'Esta é uma notificação de erro')
    } finally {
      setLoadingToast(false)
    }
  }

  return (
    <>
      {/* Header de Navegação */}
      <MobileHeader 
        title="Página de Testes"
        currentPage="/teste"
        userEmail="teste@stockpro.com"
      />

      {/* Conteúdo Principal */}
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 lg:ml-64">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">🔥 Teste do Sistema</h1>
          
          <div className="space-y-6">
            {/* Teste Firebase */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">🔗 Teste Firebase</h3>
              <p className="mb-4 text-sm text-gray-600">{status}</p>
              <LoadingButton 
                onClick={testarConexao}
                isLoading={loading}
                loadingText="Conectando..."
                variant="primary"
                size="md"
                className="w-full"
              >
                🔥 Testar Firebase
              </LoadingButton>
            </div>

            {/* Teste Notificações */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">🔔 Teste Notificações</h3>
              <LoadingButton 
                onClick={testarToasts}
                isLoading={loadingToast}
                loadingText="Enviando..."
                variant="success"
                size="md"
                className="w-full"
              >
                🔔 Testar Notificações
              </LoadingButton>
            </div>

            {/* Teste Navegação */}
            <div>
              <h3 className="font-semibold mb-3">📱 Teste Navegação</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Mobile:</strong> Clique no menu hamburger (três linhas) no canto superior direito
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Desktop:</strong> Menu lateral fixo (se a tela for grande)
                </p>
              </div>
            </div>

            {/* Variantes de Botões */}
            <div>
              <h3 className="font-semibold mb-3">🎨 Variantes de Botões</h3>
              <div className="grid grid-cols-1 gap-2">
                <LoadingButton variant="primary" size="sm">
                  🔵 Primary Small
                </LoadingButton>
                
                <LoadingButton variant="secondary" size="md">
                  ⚫ Secondary Medium
                </LoadingButton>
                
                <LoadingButton variant="success" size="lg">
                  🟢 Success Large
                </LoadingButton>
                
                <LoadingButton variant="warning">
                  🟡 Warning
                </LoadingButton>
                
                <LoadingButton variant="danger">
                  🔴 Danger
                </LoadingButton>
                
                <LoadingButton disabled>
                  🚫 Desabilitado
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}