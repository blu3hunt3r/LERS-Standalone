/**
 * ============================================================================
 * LAYER CONTROL PANEL - Interactive layer visibility controls
 * ============================================================================
 * TASK 1.2.2: Layer Control UI with toggles and opacity sliders
 * TASK 1.2.4: Layer presets for quick switching
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { LayerPreset } from '../types';

interface LayerControlProps {
  layers: Map<string, number>;
  visibleLayers: Set<number>;
  layerOpacity: Record<number, number>;
  preset: LayerPreset;
  onLayerVisibilityChange: (layer: number, visible: boolean) => void;
  onLayerOpacityChange: (layer: number, opacity: number) => void;
  onPresetApply: (preset: 'focus' | 'medium' | 'full') => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  visibleLayers,
  layerOpacity,
  preset,
  onLayerVisibilityChange,
  onLayerOpacityChange,
  onPresetApply,
  onSelectAll,
  onClearAll,
}) => {
  // Calculate entity count per layer
  const availableLayers = React.useMemo(() => {
    const unique = new Set<number>();
    layers.forEach(layer => {
      if (layer !== undefined && layer !== null && !Number.isNaN(layer)) {
        unique.add(layer);
      }
    });
    return Array.from(unique).sort((a, b) => a - b);
  }, [layers]);

  const layerCounts = React.useMemo(() => {
    const counts: Record<number, number> = {};
    availableLayers.forEach(layer => {
      counts[layer] = 0;
    });
    layers.forEach(layer => {
      if (layer !== undefined && layer !== null && !Number.isNaN(layer)) {
        counts[layer] = (counts[layer] || 0) + 1;
      }
    });
    return counts;
  }, [layers, availableLayers]);

  const getLayerName = (layer: number): string => {
    if (layer === 1) return 'Layer 1 (Primary)';
    if (layer === 2) return 'Layer 2 (Secondary)';
    if (layer === 3) return 'Layer 3 (Tertiary)';
    return `Layer ${layer}`;
  };

  const getLayerDescription = (layer: number): string => {
    if (layer === 1) return 'First hop in the transaction chain';
    if (layer === 2) return 'Second hop (recipients of layer 1)';
    if (layer === 3) return 'Third hop (recipients of layer 2)';
    return `${layer} hops from the initial accounts`;
  };

  if (availableLayers.length === 0) {
    return (
      <Card className="p-4 w-72">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-slate-700" />
          <h3 className="text-sm font-semibold text-gray-900">Layer Controls</h3>
        </div>
        <p className="text-xs text-gray-600">
          No layer metadata available for this dataset. Upload a parser-enriched file to enable layer visibility controls.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 w-80">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-slate-700" />
        <h3 className="text-sm font-semibold text-gray-900">Layer Controls</h3>
      </div>

      <div className="flex gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-8"
          onClick={onSelectAll}
        >
          Select All
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-8"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <Label className="text-xs text-gray-500 uppercase mb-2 block">Quick Presets</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={preset === 'focus' ? 'default' : 'outline'}
            onClick={() => onPresetApply('focus')}
            className={`flex-1 text-xs h-8 ${preset === 'focus' ? 'border-slate-600' : ''}`}
          >
            Focus (Top 2)
          </Button>
          <Button
            size="sm"
            variant={preset === 'medium' ? 'default' : 'outline'}
            onClick={() => onPresetApply('medium')}
            className={`flex-1 text-xs h-8 ${preset === 'medium' ? 'border-slate-600' : ''}`}
          >
            Medium (Top 3)
          </Button>
          <Button
            size="sm"
            variant={preset === 'full' ? 'default' : 'outline'}
            onClick={() => onPresetApply('full')}
            className={`flex-1 text-xs h-8 ${preset === 'full' ? 'border-slate-600' : ''}`}
          >
            Full Network
          </Button>
        </div>
      </div>

      {/* Layer List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {availableLayers.map(layer => {
          const count = layerCounts[layer] || 0;
          const isVisible = visibleLayers.has(layer);
          const opacity = layerOpacity[layer] || 1;

          return (
            <div
              key={layer}
              className={`p-3 rounded-lg border ${
                isVisible ? 'border-slate-300 bg-white' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Layer Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(checked) =>
                      onLayerVisibilityChange(layer, checked as boolean)
                    }
                  />
                  <div className="flex items-center gap-2">
                    {isVisible ? (
                      <Eye className="h-3 w-3 text-slate-600" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {getLayerName(layer)}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {count} {count === 1 ? 'entity' : 'entities'}
                </Badge>
              </div>

              {/* Layer Description */}
              <p className="text-xs text-gray-500 mb-2 ml-7">
                {getLayerDescription(layer)}
              </p>

              {/* Opacity Slider */}
              {isVisible && (
                <div className="ml-7">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-gray-500">Opacity</Label>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={opacity * 100}
                    onChange={(e) =>
                      onLayerOpacityChange(layer, parseInt(e.target.value) / 100)
                    }
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Visible layers:</span>
          <span className="font-medium">{visibleLayers.size} / {availableLayers.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
          <span>Preset:</span>
          <span className="font-medium capitalize">{preset}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
          <span>Total entities:</span>
          <span className="font-medium">{layers.size}</span>
        </div>
      </div>
    </Card>
  );
};

