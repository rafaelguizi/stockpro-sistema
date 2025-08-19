// src/hooks/useFormattedValues.ts
'use client'
import { usePermissions } from './usePermissions'

export function useFormattedValues() {
  const { permissions } = usePermissions()

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatSensitiveCurrency = (value: number): string => {
    if (!permissions.canViewCosts) {
      return '---'
    }
    return formatCurrency(value)
  }

  const formatProfit = (value: number): string => {
    if (!permissions.canViewProfits) {
      return '---'
    }
    return formatCurrency(value)
  }

  const formatMargin = (value: number): string => {
    if (!permissions.canViewMargins) {
      return '---'
    }
    return `${value.toFixed(1)}%`
  }

  return {
    formatCurrency,
    formatSensitiveCurrency,
    formatProfit,
    formatMargin,
    canViewCosts: permissions.canViewCosts,
    canViewProfits: permissions.canViewProfits,
    canViewMargins: permissions.canViewMargins
  }
}