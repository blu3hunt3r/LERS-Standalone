/**
 * Phase 5, Feature 2, Phase 3: AnnotationModal Component
 *
 * Modal for adding annotations (notes and tags) to entities or relationships:
 * - Text area for notes
 * - Tag input with add/remove functionality
 * - Save/cancel actions
 *
 * Extracted from InvestigationWorkbenchTab.tsx (lines 4182-4246, 1134-1179)
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface AnnotationTarget {
  type: 'node' | 'link';
  id: string;
}

export interface AnnotationData {
  text: string;
  tags: string[];
}

export interface AnnotationModalProps {
  /** Modal open state */
  open: boolean;

  /** Close handler */
  onClose: () => void;

  /** Target entity/link to annotate */
  target: AnnotationTarget | null;

  /** Initial annotation text (for editing existing annotation) */
  initialText?: string;

  /** Initial tags (for editing existing annotation) */
  initialTags?: string[];

  /** Save annotation handler */
  onSave: (target: AnnotationTarget, data: AnnotationData) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AnnotationModal Component
 *
 * Modal for adding/editing annotations with notes and tags
 *
 * @param props - AnnotationModalProps
 *
 * @example
 * ```tsx
 * <AnnotationModal
 *   open={showAnnotationModal}
 *   onClose={() => setShowAnnotationModal(false)}
 *   target={annotationTarget}
 *   initialText={selectedNode?.metadata?.annotation}
 *   initialTags={selectedNode?.metadata?.tags}
 *   onSave={(target, data) => {
 *     // Update node/link with annotation
 *     updateAnnotation(target.id, data);
 *     toast.success('Annotation saved');
 *   }}
 * />
 * ```
 */
export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  open,
  onClose,
  target,
  initialText = '',
  initialTags = [],
  onSave,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [annotationText, setAnnotationText] = useState(initialText);
  const [annotationTags, setAnnotationTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');

  // Update state when modal opens with new target
  React.useEffect(() => {
    if (open) {
      setAnnotationText(initialText);
      setAnnotationTags(initialTags);
      setNewTag('');
    }
  }, [open, initialText, initialTags]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !annotationTags.includes(trimmedTag)) {
      setAnnotationTags([...annotationTags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setAnnotationTags(annotationTags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    if (!target) return;

    onSave(target, {
      text: annotationText,
      tags: annotationTags,
    });

    // Reset state
    setAnnotationText('');
    setAnnotationTags([]);
    setNewTag('');
    onClose();
  };

  const handleCancel = () => {
    // Reset state
    setAnnotationText(initialText);
    setAnnotationTags(initialTags);
    setNewTag('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Annotation</DialogTitle>
          <DialogDescription>
            Add notes and tags to this {target?.type === 'node' ? 'entity' : 'relationship'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Note Input */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Note</Label>
            <textarea
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Enter your notes here..."
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              rows={4}
            />
          </div>

          {/* Tags Input */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button onClick={handleAddTag} size="sm">
                Add
              </Button>
            </div>

            {/* Tag List */}
            <div className="flex flex-wrap gap-2">
              {annotationTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-600"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Annotation</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default AnnotationModal;
