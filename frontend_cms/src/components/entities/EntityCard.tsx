import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

// Person Entity
interface PersonEntity {
  id: string
  full_name?: string
  names: string[]
  phone_numbers: string[]
  emails: string[]
  pan_hash?: string
  aadhaar_hash?: string
  addresses: string[]
  linked_cases: number
  risk_score?: number
}

export const PersonCard: React.FC<{ person: PersonEntity }> = ({ person }) => {
  const getRiskColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score > 0.7) return 'text-red-600'
    if (score > 0.4) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <CardTitle className="text-lg">
                {person.full_name || person.names[0] || 'Unknown'}
              </CardTitle>
              {person.linked_cases > 0 && (
                <Badge variant="info" className="text-xs mt-1">
                  {person.linked_cases} linked case{person.linked_cases > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          {person.risk_score !== undefined && (
            <Badge variant={person.risk_score > 0.7 ? 'destructive' : person.risk_score > 0.4 ? 'warning' : 'success'}>
              Risk: {(person.risk_score * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {person.names.length > 1 && (
          <div>
            <p className="text-xs text-gray-600 mb-1">Also Known As:</p>
            <div className="flex flex-wrap gap-1">
              {person.names.slice(1).map((name, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {person.phone_numbers.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 mb-1">📞 Phone Numbers:</p>
            <div className="space-y-1">
              {person.phone_numbers.map((phone, idx) => (
                <p key={idx} className="text-sm font-mono">{phone}</p>
              ))}
            </div>
          </div>
        )}

        {person.emails.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 mb-1">📧 Emails:</p>
            <div className="space-y-1">
              {person.emails.map((email, idx) => (
                <p key={idx} className="text-sm font-mono">{email}</p>
              ))}
            </div>
          </div>
        )}

        {(person.pan_hash || person.aadhaar_hash) && (
          <div>
            <p className="text-xs text-gray-600 mb-1">🪪 Identifiers:</p>
            <div className="space-y-1 text-sm">
              {person.pan_hash && <p className="font-mono">PAN: {person.pan_hash.slice(0, 8)}...</p>}
              {person.aadhaar_hash && <p className="font-mono">Aadhaar: {person.aadhaar_hash.slice(0, 8)}...</p>}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Link to Case
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Device Entity
interface DeviceEntity {
  id: string
  imei: string
  imsi?: string
  model?: string
  manufacturer?: string
  first_seen: string
  last_seen: string
  linked_persons: number
  linked_accounts: number
}

export const DeviceCard: React.FC<{ device: DeviceEntity }> = ({ device }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
            📱
          </div>
          <div>
            <CardTitle className="text-lg">
              {device.model || 'Unknown Device'}
            </CardTitle>
            <p className="text-sm text-gray-600">{device.manufacturer}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-gray-600 mb-1">Device Identifiers:</p>
          <p className="text-sm font-mono">IMEI: {device.imei}</p>
          {device.imsi && <p className="text-sm font-mono">IMSI: {device.imsi}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600">First Seen</p>
            <p className="font-medium">{new Date(device.first_seen).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Last Seen</p>
            <p className="font-medium">{new Date(device.last_seen).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {device.linked_persons > 0 && (
            <Badge variant="info" className="text-xs">
              {device.linked_persons} person{device.linked_persons > 1 ? 's' : ''}
            </Badge>
          )}
          {device.linked_accounts > 0 && (
            <Badge variant="info" className="text-xs">
              {device.linked_accounts} account{device.linked_accounts > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full">
          View Timeline
        </Button>
      </CardContent>
    </Card>
  )
}

// Account Entity
interface AccountEntity {
  id: string
  account_number_masked: string
  account_type: string
  bank_name: string
  ifsc?: string
  opened_on?: string
  status: string
  balance?: number
  transaction_count: number
  linked_person_id?: string
}

export const AccountCard: React.FC<{ account: AccountEntity }> = ({ account }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              🏦
            </div>
            <div>
              <CardTitle className="text-lg">{account.bank_name}</CardTitle>
              <p className="text-sm text-gray-600 font-mono">
                {account.account_number_masked}
              </p>
            </div>
          </div>
          <Badge variant={account.status === 'ACTIVE' ? 'success' : 'outline'}>
            {account.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600">Account Type</p>
            <p className="font-medium">{account.account_type}</p>
          </div>
          {account.ifsc && (
            <div>
              <p className="text-xs text-gray-600">IFSC Code</p>
              <p className="font-mono text-xs">{account.ifsc}</p>
            </div>
          )}
        </div>

        {account.balance !== undefined && (
          <div>
            <p className="text-xs text-gray-600">Current Balance</p>
            <p className="text-lg font-bold text-green-600">
              ₹{account.balance.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-gray-600">Transactions</span>
          <Badge variant="info">{account.transaction_count.toLocaleString()}</Badge>
        </div>

        <Button variant="outline" size="sm" className="w-full">
          View Transactions
        </Button>
      </CardContent>
    </Card>
  )
}

