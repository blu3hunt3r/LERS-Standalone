/**
 * TASK 3.1.1: Timeline Filter Component - Dual-handle slider with animation
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Play, Pause, RotateCcw } from 'lucide-react';

interface TimelineFilterProps {
  minDate: Date | null;
  maxDate: Date | null;
  onRangeChange: (start: Date, end: Date) => void;
  className?: string;
}

export const TimelineFilter: React.FC<TimelineFilterProps> = ({
  minDate,
  maxDate,
  onRangeChange,
  className = '',
}) => {
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getDateFromPercent = (percent: number): Date => {
    if (!minDate || !maxDate) return new Date();
    const totalMs = maxDate.getTime() - minDate.getTime();
    return new Date(minDate.getTime() + (totalMs * percent / 100));
  };

  const handleRangeChange = (newRange: [number, number]) => {
    setRange(newRange);
    if (minDate && maxDate) {
      onRangeChange(
        getDateFromPercent(newRange[0]),
        getDateFromPercent(newRange[1])
      );
    }
  };

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const duration = 10000; // 10 seconds
    const fps = 30;
    const step = (100 / duration) * (1000 / fps);

    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          setIsAnimating(false);
          return 100;
        }
        
        // Update range to show progress
        handleRangeChange([0, next]);
        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const handlePlayPause = () => {
    if (isAnimating) {
      setIsAnimating(false);
    } else {
      setAnimationProgress(0);
      setIsAnimating(true);
    }
  };

  const handleReset = () => {
    setIsAnimating(false);
    setAnimationProgress(0);
    handleRangeChange([0, 100]);
  };

  if (!minDate || !maxDate) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-sm text-gray-500">No timeline data available</div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-700" />
          <Label className="text-sm font-semibold">Timeline Filter</Label>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayPause}
            className="h-8 w-8 p-0"
          >
            {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-700">
          {formatDate(getDateFromPercent(range[0]).getTime())}
        </span>
        <span className="text-xs text-gray-400">→</span>
        <span className="text-xs font-medium text-gray-700">
          {formatDate(getDateFromPercent(range[1]).getTime())}
        </span>
      </div>

      {/* Dual-handle range slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={range[0]}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val < range[1]) {
              handleRangeChange([val, range[1]]);
            }
          }}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-10"
          style={{
            WebkitAppearance: 'none',
          }}
        />
        <input
          type="range"
          min="0"
          max="100"
          value={range[1]}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val > range[0]) {
              handleRangeChange([range[0], val]);
            }
          }}
          className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-10"
        />
        
        {/* Track background */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full">
          {/* Active range */}
          <div
            className="absolute h-2 bg-slate-700 rounded-full"
            style={{
              left: `${range[0]}%`,
              width: `${range[1] - range[0]}%`,
            }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Total period:</span>
          <span className="font-medium">
            {Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))} days
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Selected range:</span>
          <span className="font-medium">
            {Math.ceil(
              (getDateFromPercent(range[1]).getTime() - 
               getDateFromPercent(range[0]).getTime()) / (1000 * 60 * 60 * 24)
            )} days
          </span>
        </div>
      </div>
    </Card>
  );
};

