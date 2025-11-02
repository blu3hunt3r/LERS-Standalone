import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface ResponseViewerProps {
  response: {
    id: string
    file_name: string
    file_type: string
    file_size: number
    uploaded_at: string
    parser_status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    parsed_data?: any
    parser_errors?: string[]
    content_url?: string
  }
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'parsed' | 'raw'>('preview')

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('csv') || fileType.includes('excel')) return '📊'
    if (fileType.includes('json')) return '{ }'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    return '📁'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderCSVTable = (data: any) => {
    if (!Array.isArray(data) || data.length === 0) return null
    
    const headers = Object.keys(data[0])
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.slice(0, 100).map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                {headers.map((header, colIdx) => (
                  <td key={colIdx} className="px-4 py-2 text-sm text-gray-900">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 100 && (
          <div className="p-4 text-center text-sm text-gray-500">
            Showing 100 of {data.length} rows
          </div>
        )}
      </div>
    )
  }

  const renderJSONTree = (data: any, depth = 0) => {
    if (depth > 3) return <span className="text-gray-400">...</span>

    if (typeof data !== 'object' || data === null) {
      return <span className="text-green-600">{JSON.stringify(data)}</span>
    }

    if (Array.isArray(data)) {
      return (
        <div className="ml-4">
          {data.slice(0, 10).map((item, idx) => (
            <div key={idx}>
              <span className="text-gray-500">[{idx}]:</span>
              {renderJSONTree(item, depth + 1)}
            </div>
          ))}
          {data.length > 10 && (
            <span className="text-gray-400">... {data.length - 10} more items</span>
          )}
        </div>
      )
    }

    return (
      <div className="ml-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="my-1">
            <span className="text-slate-700 font-mono">{key}:</span>{' '}
            {renderJSONTree(value, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  const renderPreview = () => {
    const fileType = response.file_type.toLowerCase()

    if (fileType.includes('pdf')) {
      return (
        <div className="h-96">
          <embed
            src={response.content_url}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        </div>
      )
    }

    if (fileType.includes('image')) {
      return (
        <div className="flex justify-center p-4">
          <img
            src={response.content_url}
            alt={response.file_name}
            className="max-h-96 rounded-lg shadow-md"
          />
        </div>
      )
    }

    if (fileType.includes('csv') || fileType.includes('excel')) {
      if (response.parsed_data && Array.isArray(response.parsed_data)) {
        return renderCSVTable(response.parsed_data)
      }
    }

    if (fileType.includes('json')) {
      if (response.parsed_data) {
        return (
          <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm">
            {renderJSONTree(response.parsed_data)}
          </div>
        )
      }
    }

    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Preview not available</p>
        <p className="text-sm">Download file to view content</p>
        <Button variant="outline" className="mt-4">
          Download File
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getFileIcon(response.file_type)}</span>
            <div>
              <CardTitle className="text-lg">{response.file_name}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {response.file_type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(response.file_size)}
                </Badge>
                {response.parser_status && (
                  <Badge
                    variant={
                      response.parser_status === 'COMPLETED'
                        ? 'success'
                        : response.parser_status === 'FAILED'
                        ? 'destructive'
                        : 'warning'
                    }
                    className="text-xs"
                  >
                    {response.parser_status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Download
            </Button>
            <Button variant="outline" size="sm">
              Share
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('parsed')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'parsed'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
            disabled={!response.parsed_data}
          >
            Parsed Data
            {response.parsed_data && (
              <Badge variant="success" className="ml-2 text-xs">
                ✓
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'raw'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            Raw File
          </button>
        </div>

        {/* Content */}
        <div className="min-h-64">
          {activeTab === 'preview' && renderPreview()}
          
          {activeTab === 'parsed' && response.parsed_data && (
            <div className="space-y-4">
              {response.parser_errors && response.parser_errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    ⚠️ Parser Warnings
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {response.parser_errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {Array.isArray(response.parsed_data) ? (
                renderCSVTable(response.parsed_data)
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm">
                  {renderJSONTree(response.parsed_data)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Raw file content</p>
              <Button variant="outline">Download Original File</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

