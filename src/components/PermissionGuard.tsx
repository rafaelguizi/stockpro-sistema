// src/components/PermissionGuard.tsx
'use client'
import { ReactNode } from 'react'
import { usePermissions, Permissions } from '@/hooks/usePermissions'

interface PermissionGuardProps {
  children: ReactNode
  permission: keyof Permissions
  fallback?: ReactNode
  showFallback?: boolean
}

export default function PermissionGuard({ 
  children, 
  permission, 
  fallback = null,
  showFallback = false 
}: PermissionGuardProps) {
  const { permissions } = usePermissions()
  
  const hasPermission = permissions[permission]
  
  if (!hasPermission) {
    if (showFallback && fallback) {
      return <>{fallback}</>
    }
    return null
  }
  
  return <>{children}</>
}

// Componente para ocultar informações sensíveis
export function SensitiveInfo({ children, fallback }: { children: ReactNode, fallback?: ReactNode }) {
  return (
    <PermissionGuard 
      permission="canViewCosts" 
      fallback={fallback || <span className="text-gray-400">---</span>}
      showFallback={true}
    >
      {children}
    </PermissionGuard>
  )
}

// Componente para ações administrativas
export function AdminOnly({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard permission="canManageUsers">
      {children}
    </PermissionGuard>
  )
}

// Componente para mostrar diferentes conteúdos por role
interface RoleBasedContentProps {
  adminContent?: ReactNode
  employeeContent?: ReactNode
  fallback?: ReactNode
}

export function RoleBasedContent({ adminContent, employeeContent, fallback }: RoleBasedContentProps) {
  const { permissions } = usePermissions()
  
  if (permissions.canViewCosts && adminContent) {
    return <>{adminContent}</>
  }
  
  if (!permissions.canViewCosts && employeeContent) {
    return <>{employeeContent}</>
  }
  
  return <>{fallback || null}</>
}