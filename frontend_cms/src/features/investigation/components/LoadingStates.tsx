/**
 * TASK 7.1.2: Loading States & Skeletons - Smooth loading experience
 */

import React from 'react';

export const GraphSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-50 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-slate-700"></div>
        <p className="mt-4 text-slate-600">Loading graph data...</p>
      </div>
    </div>
  );
};

export const NodeSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-4 p-4">
      <div className="rounded-full bg-gray-300 h-12 w-12"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );
};

export const TransformLoadingState: React.FC<{ transformName: string }> = ({ transformName }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-blue-600"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
      </div>
      <p className="mt-4 text-slate-700 font-medium">Running {transformName}...</p>
      <p className="text-sm text-slate-500">This may take a few moments</p>
    </div>
  );
};

