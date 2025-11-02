import React, { useState } from 'react'
import { EVIDENCE_TYPES, EVIDENCE_CATEGORIES, type EvidenceType } from '../../constants/evidenceTypes'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

interface EvidenceTypeSelectorProps {
  value?: string
  onChange: (evidenceType: EvidenceType) => void
  className?: string
}

export const EvidenceTypeSelector: React.FC<EvidenceTypeSelectorProps> = ({
  value,
  onChange,
  className
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTypes = EVIDENCE_TYPES.filter(type => {
    const matchesCategory = !selectedCategory || type.category === selectedCategory
    const matchesSearch = !searchQuery || 
      type.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search evidence types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            !selectedCategory
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          All Types
        </button>
        {EVIDENCE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              selectedCategory === cat.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Evidence Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTypes.map(type => (
          <Card
            key={type.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg border-2',
              value === type.id
                ? `${type.borderColor} bg-opacity-5`
                : 'border-gray-200 hover:border-gray-300'
            )}
            onClick={() => onChange(type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'text-3xl p-2 rounded-lg',
                  type.bgColor
                )}>
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn('font-semibold text-sm mb-1', type.color)}>
                    {type.label}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {type.formats.slice(0, 3).map(format => (
                      <Badge key={format} variant="outline" className="text-xs py-0">
                        {format}
                      </Badge>
                    ))}
                    {type.formats.length > 3 && (
                      <Badge variant="outline" className="text-xs py-0">
                        +{type.formats.length - 3}
                      </Badge>
                    )}
                  </div>
                  {type.parser && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">⚙️ {type.parser}</span>
                    </div>
                  )}
                </div>
              </div>
              {value === type.id && (
                <div className="mt-2 flex items-center justify-center">
                  <Badge variant="success" className="text-xs">
                    ✓ Selected
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTypes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No evidence types found</p>
          <p className="text-sm">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  )
}

