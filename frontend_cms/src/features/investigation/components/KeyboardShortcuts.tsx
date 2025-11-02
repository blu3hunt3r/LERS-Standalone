/**
 * TASK 7.1.4: Keyboard Shortcuts - Power user shortcuts and help modal
 */

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const SHORTCUTS = [
  { key: 'Ctrl+Z', description: 'Undo last action' },
  { key: 'Ctrl+Y', description: 'Redo action' },
  { key: 'Ctrl+F', description: 'Search entities' },
  { key: 'Ctrl+Click', description: 'Multi-select nodes' },
  { key: 'Ctrl+Drag', description: 'Lasso select' },
  { key: 'Esc', description: 'Cancel current action' },
  { key: 'Delete', description: 'Delete selected entities' },
  { key: 'F', description: 'Fit graph to screen' },
  { key: '?', description: 'Show keyboard shortcuts' },
];

export const KeyboardShortcutsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {SHORTCUTS.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
              <span className="text-sm text-slate-700">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useKeyboardShortcuts = (handlers: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.ctrlKey && 'Ctrl',
        e.shiftKey && 'Shift',
        e.altKey && 'Alt',
        e.metaKey && 'Meta',
        e.key,
      ].filter(Boolean).join('+');

      const handler = handlers[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

