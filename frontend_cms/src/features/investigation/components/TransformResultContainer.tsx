/**
 * TASK 3.2.1: Transform Result Container - Result viewer with tabs and export
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TransformResultContainerProps {
  title: string;
  results: any;
  onClose: () => void;
}

export const TransformResultContainer: React.FC<TransformResultContainerProps> = ({
  title,
  results,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('summary');

  const handleExport = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `transform-result-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="space-y-2">
              {results.insights?.map((insight: string, idx: number) => (
                <div key={idx} className="p-2 bg-slate-50 rounded">
                  {insight}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details">
            <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="visualization">
            <div className="text-center text-slate-500 py-8">
              Visualization will be rendered here
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

