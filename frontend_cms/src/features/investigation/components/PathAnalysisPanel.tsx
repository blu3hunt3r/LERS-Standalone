/**
 * ============================================================================
 * PATH ANALYSIS PANEL - Shortest path, cycles, money flow analysis
 * ============================================================================
 * TASK 1.4.4: Complete path analysis interface
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Node, Link, PathResult, CycleResult } from '../types';
import { findShortestPath, detectCycles, traceMoneyFlow } from '../utils/graphAlgorithms';
import { Route, GitBranch, TrendingUp, AlertCircle } from 'lucide-react';

interface PathAnalysisPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node[];
  links: Link[];
  onPathHighlight: (path: string[]) => void;
  onCycleHighlight: (cycle: string[]) => void;
}

export const PathAnalysisPanel: React.FC<PathAnalysisPanelProps> = ({
  open,
  onOpenChange,
  nodes,
  links,
  onPathHighlight,
  onCycleHighlight,
}) => {
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [shortestPath, setShortestPath] = useState<PathResult | null>(null);
  const [cycles, setCycles] = useState<CycleResult[]>([]);
  const [flowSource, setFlowSource] = useState<string>('');
  const [flowHops, setFlowHops] = useState<number>(3);
  const [flowPaths, setFlowPaths] = useState<PathResult[]>([]);

  const handleFindShortestPath = () => {
    if (!pathSource || !pathTarget) return;
    const path = findShortestPath(nodes, links, pathSource, pathTarget);
    setShortestPath(path);
    if (path) {
      onPathHighlight(path.nodes);
    }
  };

  const handleDetectCycles = () => {
    const detected = detectCycles(nodes, links);
    setCycles(detected);
  };

  const handleTraceMoneyFlow = () => {
    if (!flowSource) return;
    const paths = traceMoneyFlow(nodes, links, flowSource, flowHops, 0);
    setFlowPaths(paths);
  };

  const getNodeLabel = (nodeId: string): string => {
    return nodes.find(n => n.id === nodeId)?.label || nodeId;
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
    return `₹${amount}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Path Analysis
          </DialogTitle>
          <DialogDescription>
            Find connections, detect cycles, and trace money flows
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="shortest" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shortest">Shortest Path</TabsTrigger>
            <TabsTrigger value="cycles">Cycles</TabsTrigger>
            <TabsTrigger value="flow">Money Flow</TabsTrigger>
          </TabsList>

          {/* Shortest Path Tab */}
          <TabsContent value="shortest" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">From</label>
                <Select value={pathSource} onValueChange={setPathSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.label} ({node.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">To</label>
                <Select value={pathTarget} onValueChange={setPathTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.label} ({node.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleFindShortestPath}
              disabled={!pathSource || !pathTarget}
              className="w-full"
            >
              <Route className="h-4 w-4 mr-2" />
              Find Shortest Path
            </Button>

            {shortestPath && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">
                    {shortestPath.length} {shortestPath.length === 1 ? 'hop' : 'hops'}
                  </Badge>
                  {shortestPath.totalAmount && shortestPath.totalAmount > 0 && (
                    <Badge variant="outline">
                      Total: {formatCurrency(shortestPath.totalAmount)}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {shortestPath.nodes.map((nodeId, i) => (
                    <React.Fragment key={nodeId}>
                      <Badge
                        variant={i === 0 ? 'default' : i === shortestPath.nodes.length - 1 ? 'destructive' : 'secondary'}
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => {
                          // Center on this node in graph
                        }}
                      >
                        {getNodeLabel(nodeId)}
                      </Badge>
                      {i < shortestPath.nodes.length - 1 && (
                        <span className="text-gray-400">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </Card>
            )}

            {shortestPath === null && pathSource && pathTarget && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No path found between selected nodes
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Cycles Tab */}
          <TabsContent value="cycles" className="space-y-4">
            <Button onClick={handleDetectCycles} className="w-full">
              <GitBranch className="h-4 w-4 mr-2" />
              Detect Cycles
            </Button>

            {cycles.length > 0 ? (
              <div className="space-y-3">
                {cycles.map((cycle, i) => (
                  <Card
                    key={i}
                    className="p-4 hover:bg-orange-50 cursor-pointer transition-colors"
                    onClick={() => onCycleHighlight(cycle.nodes)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="destructive">Cycle {i + 1}</Badge>
                      <div className="flex gap-2">
                        <Badge variant="outline">{cycle.length} nodes</Badge>
                        {cycle.totalAmount && cycle.totalAmount > 0 && (
                          <Badge variant="outline">
                            {formatCurrency(cycle.totalAmount)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {cycle.nodes.map((nodeId, idx) => (
                        <React.Fragment key={nodeId}>
                          <span className="text-xs text-gray-700">
                            {getNodeLabel(nodeId)}
                          </span>
                          {idx < cycle.nodes.length - 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </React.Fragment>
                      ))}
                      <span className="text-gray-400">↩️</span>
                    </div>

                    {cycle.totalAmount && cycle.totalAmount > 0 && (
                      <Alert className="mt-3 bg-orange-50 border-orange-200">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-xs text-orange-800">
                          ⚠️ Circular money flow detected - potential layering/laundering
                        </AlertDescription>
                      </Alert>
                    )}
                  </Card>
                ))}
              </div>
            ) : cycles.length === 0 && pathSource ? (
              <Alert>
                <AlertDescription>
                  ✅ No cycles detected in the graph
                </AlertDescription>
              </Alert>
            ) : null}
          </TabsContent>

          {/* Money Flow Tab */}
          <TabsContent value="flow" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">From (Source)</label>
                <Select value={flowSource} onValueChange={setFlowSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.filter(n => ['account', 'upi', 'card'].includes(n.type)).map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.label} ({node.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Hops</label>
                <Select value={flowHops.toString()} onValueChange={(v) => setFlowHops(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 hops</SelectItem>
                    <SelectItem value="3">3 hops</SelectItem>
                    <SelectItem value="5">5 hops</SelectItem>
                    <SelectItem value="10">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleTraceMoneyFlow} disabled={!flowSource} className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trace Money Flow
            </Button>

            {flowPaths.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{flowPaths.length} flow paths found</span>
                  <Badge variant="secondary">
                    Total: {formatCurrency(flowPaths.reduce((sum, p) => sum + (p.totalAmount || 0), 0))}
                  </Badge>
                </div>

                {flowPaths.slice(0, 10).map((path, i) => (
                  <Card key={i} className="p-3 hover:bg-blue-50 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Path {i + 1}</Badge>
                      <Badge variant="outline">{formatCurrency(path.totalAmount || 0)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {path.nodes.map((nodeId, idx) => (
                        <React.Fragment key={nodeId}>
                          <span className="text-xs text-gray-700">{getNodeLabel(nodeId)}</span>
                          {idx < path.nodes.length - 1 && (
                            <span className="text-green-500">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

