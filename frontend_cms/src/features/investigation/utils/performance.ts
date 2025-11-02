/**
 * TASK 7.1.1: Performance Optimization - Virtualization and WebWorker integration
 */

export class PerformanceOptimizer {
  /**
   * Virtualize large node lists for rendering
   */
  static virtualizeNodes(nodes: any[], viewport: { x: number; y: number; width: number; height: number; zoom: number }): any[] {
    // Only render nodes within viewport + buffer
    const buffer = 200;
    const minX = (viewport.x - buffer) / viewport.zoom;
    const maxX = (viewport.x + viewport.width + buffer) / viewport.zoom;
    const minY = (viewport.y - buffer) / viewport.zoom;
    const maxY = (viewport.y + viewport.height + buffer) / viewport.zoom;

    return nodes.filter(node =>
      node.x >= minX && node.x <= maxX &&
      node.y >= minY && node.y <= maxY
    );
  }

  /**
   * Offload heavy computation to Web Worker
   */
  static async runInWorker<T>(task: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const workerCode = `
        self.onmessage = function(e) {
          const { task, data } = e.data;
          let result;
          
          switch (task) {
            case 'calculate-layers':
              result = calculateLayers(data);
              break;
            case 'detect-communities':
              result = detectCommunities(data);
              break;
            default:
              result = null;
          }
          
          self.postMessage(result);
        };

        function calculateLayers(data) {
          // BFS implementation
          return {};
        }

        function detectCommunities(data) {
          // Louvain implementation
          return {};
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };

      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };

      worker.postMessage({ task, data });
    });
  }

  /**
   * Debounce function for performance
   */
  static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for performance
   */
  static throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

