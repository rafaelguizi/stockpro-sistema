'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToastContext } from '@/components/ToastProvider'
import LoadingButton from '@/components/LoadingButton'

interface UserData {
  id: string
  companyId: string
  companyName: string
  mustChangePassword?: boolean
  name?: string
  email?: string
  [key: string]: any
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToastContext()
  
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Verificar se usuário precisa trocar senha
  useEffect(() => {
    const checkMustChangePassword = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const { db } = await import('@/lib/firebase')
        const { doc, getDoc, collection, getDocs } = await import('firebase/firestore')

        if (!db) throw new Error('Firebase não inicializado')

        console.log('🔍 Verificando se usuário deve alterar senha...')

        // Buscar dados do usuário em todas as empresas
        const companiesRef = collection(db, 'companies')
        const companiesSnapshot = await getDocs(companiesRef)
        
        let foundUserData: UserData | null = null
        
        for (const companyDoc of companiesSnapshot.docs) {
          const userDoc = await getDoc(doc(db, `companies/${companyDoc.id}/users`, user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            foundUserData = {
              id: userDoc.id,
              companyId: companyDoc.id,
              companyName: companyDoc.data().name,
              ...userData
            } as UserData
            break
          }
        }

        if (!foundUserData) {
          console.log('❌ Usuário não encontrado na estrutura multi-tenant')
          toast.error('Erro', 'Usuário não encontrado')
          router.push('/login')
          return
        }

        setUserData(foundUserData)

        // Se não precisa alterar senha, redireciona para dashboard
        if (!foundUserData.mustChangePassword) {
          console.log('✅ Usuário não precisa alterar senha')
          router.push('/')
          return
        }

        console.log('⚠️ Usuário deve alterar senha obrigatoriamente')
        setLoading(false)

      } catch (error) {
        console.error('❌ Erro ao verificar status da senha:', error)
        toast.error('Erro', 'Não foi possível verificar status da senha')
        router.push('/login')
      }
    }

    checkMustChangePassword()
  }, [user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    // Validações
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Senhas não coincidem', 'Verifique as senhas digitadas')
      setSubmitLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      toast.error('Senha muito fraca', 'Nova senha deve ter pelo menos 6 caracteres')
      setSubmitLoading(false)
      return
    }

    if (formData.newPassword === formData.currentPassword) {
      toast.error('Senhas iguais', 'Nova senha deve ser diferente da atual')
      setSubmitLoading(false)
      return
    }

    // Validação de senha forte
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!strongPasswordRegex.test(formData.newPassword)) {
      toast.error('Senha não atende critérios', 'Use: maiúscula, minúscula, número e símbolo')
      setSubmitLoading(false)
      return
    }

    try {
      console.log('🔄 Alterando senha do usuário...')
      
      const { auth, db } = await import('@/lib/firebase')
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth')
      const { doc, updateDoc } = await import('firebase/firestore')

      if (!auth || !db || !auth.currentUser) {
        throw new Error('Firebase não inicializado ou usuário não autenticado')
      }

      // ✅ Usar auth.currentUser ao invés do nosso user personalizado
      const firebaseUser = auth.currentUser

      // 1. Reautenticar com senha atual
      console.log('🔐 Reautenticando usuário...')
      const credential = EmailAuthProvider.credential(firebaseUser.email!, formData.currentPassword)
      await reauthenticateWithCredential(firebaseUser, credential) // ✅ Agora usa o tipo correto
      console.log('✅ Reautenticação realizada')

      // 2. Atualizar senha no Firebase Auth
      console.log('🔑 Atualizando senha no Firebase Auth...')
      await updatePassword(firebaseUser, formData.newPassword) // ✅ Usa firebaseUser
      console.log('✅ Senha atualizada no Auth')

      // 3. Marcar que não precisa mais alterar senha
      if (userData) {
        console.log('📝 Atualizando flag no Firestore...')
        await updateDoc(doc(db, `companies/${userData.companyId}/users`, firebaseUser.uid), {
          mustChangePassword: false,
          passwordChangedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        })
        console.log('✅ Flag atualizada no Firestore')
      }

      toast.success('Senha alterada!', 'Agora você pode acessar o sistema normalmente')
      
      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        router.push('/')
      }, 1500)

    } catch (error: any) {
      console.error('❌ Erro ao alterar senha:', error)
      
      let errorMessage = 'Tente novamente'
      let errorTitle = 'Erro ao alterar senha'
      
      if (error.code === 'auth/wrong-password') {
        errorTitle = 'Senha atual incorreta'
        errorMessage = 'Verifique sua senha atual'
      } else if (error.code === 'auth/weak-password') {
        errorTitle = 'Senha muito fraca'
        errorMessage = 'Use uma senha mais forte'
      } else if (error.code === 'auth/requires-recent-login') {
        errorTitle = 'Sessão expirada'
        errorMessage = 'Faça login novamente'
      }
      
      toast.error(errorTitle, errorMessage)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Verificando perfil...</p>
          <p className="text-sm text-gray-500 mt-2">Carregando informações de segurança</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-gray-800">Alteração Obrigatória</h1>
          <p className="text-gray-600 mt-2">É necessário alterar sua senha para continuar</p>
          
          {userData && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>👋 Olá, {userData.name || 'Usuário'}!</strong><br/>
                Empresa: {userData.companyName}
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              <strong>🔒 Segurança:</strong> Por questões de segurança, você deve alterar sua senha temporária.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔑 Senha Atual
            </label>
            <input
              type="password"
              required
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
              className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 font-medium"
              placeholder="Digite sua senha atual"
              disabled={submitLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔒 Nova Senha
            </label>
            <input
              type="password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 font-medium"
              placeholder="Digite sua nova senha"
              minLength={6}
              disabled={submitLoading}
            />
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p>✓ Mínimo 6 caracteres</p>
              <p>✓ Uma letra maiúscula</p>
              <p>✓ Uma letra minúscula</p>
              <p>✓ Um número</p>
              <p>✓ Um símbolo (@$!%*?&)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔒 Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full p-4 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 font-medium"
              placeholder="Digite novamente sua nova senha"
              minLength={6}
              disabled={submitLoading}
            />
          </div>

          <LoadingButton
            type="submit"
            isLoading={submitLoading}
            loadingText="Alterando senha..."
            variant="primary"
            size="lg"
            className="w-full"
          >
            🔐 Alterar Senha e Continuar
          </LoadingButton>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-gray-500">
            Esta alteração é obrigatória por questões de segurança
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>🛡️ Seguro</span>
            <span>🔒 Criptografado</span>
            <span>📊 Auditado</span>
          </div>
        </div>
      </div>
    </div>
  )
}