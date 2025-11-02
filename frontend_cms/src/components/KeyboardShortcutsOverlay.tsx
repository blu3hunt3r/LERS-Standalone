import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Badge } from './ui/badge'
import { Keyboard } from 'lucide-react'

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function KeyboardShortcutsOverlay({ isOpen, onClose }: KeyboardShortcutsOverlayProps) {
  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['g', 'c'], description: 'Go to Cases' },
        { keys: ['g', 'e'], description: 'Go to Entities (in case page)' },
        { keys: ['g', 'd'], description: 'Go to Dashboard' },
      ]
    },
    {
      category: 'Search & Actions',
      items: [
        { keys: ['/'], description: 'Focus search' },
        { keys: ['r'], description: 'Refresh page' },
        { keys: ['?'], description: 'Show keyboard shortcuts' },
      ]
    },
    {
      category: 'Forms',
      items: [
        { keys: ['Ctrl', 'Enter'], description: 'Submit form' },
        { keys: ['Cmd', 'Enter'], description: 'Submit form (Mac)' },
      ]
    }
  ]

  const KeyBadge = ({ key: keyName }: { key: string }) => (
    <Badge variant="outline" className="bg-gray-100 text-gray-900 font-mono text-xs px-2 py-0.5">
      {keyName}
    </Badge>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-slate-700" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          {keyIndex > 0 && <span className="text-gray-400 text-xs mx-1">then</span>}
                          <KeyBadge key={key} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
            <p className="text-slate-800">
              <strong>Tip:</strong> Press <KeyBadge key="?" /> at any time to see this help overlay.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

