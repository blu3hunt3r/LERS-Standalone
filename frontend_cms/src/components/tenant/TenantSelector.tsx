import React, { useState } from 'react'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/utils'

interface Tenant {
  id: string
  name: string
  type: 'POLICE_STATION' | 'COMPANY'
  jurisdiction?: string
  parent_tenant?: string
  permissions: string[]
  active_cases?: number
}

interface TenantSelectorProps {
  currentTenant: Tenant
  availableTenants: Tenant[]
  onTenantChange: (tenantId: string) => void
  showStats?: boolean
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  currentTenant,
  availableTenants,
  onTenantChange,
  showStats = true
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const getTenantIcon = (type: Tenant['type']) => {
    return type === 'POLICE_STATION' ? '🚓' : '🏢'
  }

  const getTenantColor = (type: Tenant['type']) => {
    return type === 'POLICE_STATION' ? 'bg-slate-100 text-slate-800' : 'bg-green-100 text-green-700'
  }

  return (
    <div className="relative">
      {/* Current Tenant Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-primary transition-colors w-full"
      >
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-xl',
          getTenantColor(currentTenant.type)
        )}>
          {getTenantIcon(currentTenant.type)}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm">{currentTenant.name}</p>
          {currentTenant.jurisdiction && (
            <p className="text-xs text-gray-600">{currentTenant.jurisdiction}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showStats && currentTenant.active_cases !== undefined && (
            <Badge variant="info" className="text-xs">
              {currentTenant.active_cases} cases
            </Badge>
          )}
          <span className={cn(
            'text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}>
            ▼
          </span>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-96 overflow-y-auto">
            <CardContent className="p-2">
              <div className="space-y-1">
                {availableTenants.map(tenant => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      onTenantChange(tenant.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                      tenant.id === currentTenant.id
                        ? 'bg-slate-50 border-2 border-primary'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-xl',
                      getTenantColor(tenant.type)
                    )}>
                      {getTenantIcon(tenant.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tenant.name}</p>
                        {tenant.id === currentTenant.id && (
                          <Badge variant="success" className="text-xs">
                            ✓ Active
                          </Badge>
                        )}
                      </div>
                      {tenant.jurisdiction && (
                        <p className="text-xs text-gray-600">{tenant.jurisdiction}</p>
                      )}
                      {showStats && tenant.active_cases !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          {tenant.active_cases} active case{tenant.active_cases !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

interface TenantBoundaryWarningProps {
  action: string
  sourceTenant: string
  targetTenant?: string
}

export const TenantBoundaryWarning: React.FC<TenantBoundaryWarningProps> = ({
  action,
  sourceTenant,
  targetTenant
}) => {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
      <div className="flex gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900 mb-1">
            Cross-Jurisdiction Action
          </h4>
          <p className="text-sm text-yellow-800 mb-2">
            You are about to {action} across tenant boundaries.
          </p>
          <div className="space-y-1 text-xs text-yellow-700">
            <p>• Source: {sourceTenant}</p>
            {targetTenant && <p>• Target: {targetTenant}</p>}
            <p className="mt-2">
              Ensure you have proper authorization for this cross-jurisdiction operation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

