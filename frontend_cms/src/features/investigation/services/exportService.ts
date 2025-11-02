/**
 * Phase 5, Feature 2: Export Service
 *
 * Pure functions for exporting graph visualizations.
 * Extracted from InvestigationWorkbenchTab.tsx (lines 1052-1108).
 */

import type { Node, Link } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOptions {
  /** Optional filename prefix (timestamp will be appended) */
  filenamePrefix?: string;
  /** Optional callback for success notification */
  onSuccess?: (filename: string) => void;
  /** Optional callback for error handling */
  onError?: (error: Error) => void;
}

export interface ExportPNGOptions extends ExportOptions {
  /** SVG element to export */
  svgElement: SVGSVGElement;
  /** Optional background color (default: transparent) */
  backgroundColor?: string;
  /** Optional scale factor (default: 1) */
  scale?: number;
}

export interface ExportJSONOptions extends ExportOptions {
  /** Graph nodes to export */
  nodes: Node[];
  /** Graph links to export */
  links: Link[];
  /** Optional additional metadata to include */
  metadata?: Record<string, any>;
}

export interface ExportedGraphData {
  nodes: Array<{
    id: string;
    label?: string;
    type: string;
    x?: number;
    y?: number;
    risk_level?: string;
    metadata?: Record<string, any>;
  }>;
  links: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
  }>;
  exported_at: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// PNG EXPORT
// ============================================================================

/**
 * Export graph visualization as PNG image
 *
 * Converts SVG to PNG using HTML5 Canvas API and triggers download.
 *
 * @param options - Export options including SVG element
 * @returns Promise that resolves with the generated filename
 *
 * @example
 * ```typescript
 * await exportGraphAsPNG({
 *   svgElement: svgRef.current!,
 *   filenamePrefix: 'case-123-graph',
 *   backgroundColor: '#ffffff',
 *   scale: 2, // 2x resolution
 *   onSuccess: (filename) => toast.success(`Exported: ${filename}`),
 *   onError: (error) => toast.error(`Export failed: ${error.message}`),
 * });
 * ```
 */
export async function exportGraphAsPNG(
  options: ExportPNGOptions
): Promise<string> {
  const {
    svgElement,
    backgroundColor = 'transparent',
    scale = 1,
    filenamePrefix = 'investigation-graph',
    onSuccess,
    onError,
  } = options;

  try {
    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Set canvas size (with optional scaling)
    canvas.width = svgElement.clientWidth * scale;
    canvas.height = svgElement.clientHeight * scale;

    // Set background color if specified
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Load and draw SVG
    await new Promise<void>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Scale canvas for high-DPI displays
          if (scale !== 1) {
            ctx.scale(scale, scale);
          }

          ctx.drawImage(img, 0, 0);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };

      // Convert SVG to data URL
      const encodedSvgData = btoa(unescape(encodeURIComponent(svgData)));
      img.src = `data:image/svg+xml;base64,${encodedSvgData}`;
    });

    // Convert canvas to PNG and trigger download
    const pngDataUrl = canvas.toDataURL('image/png');
    const filename = `${filenamePrefix}-${Date.now()}.png`;

    triggerDownload(pngDataUrl, filename);

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(filename);
    }

    return filename;
  } catch (error) {
    // Call error callback if provided
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

// ============================================================================
// JSON EXPORT
// ============================================================================

/**
 * Export graph data as JSON file
 *
 * Serializes nodes and links to JSON format and triggers download.
 *
 * @param options - Export options including nodes and links
 * @returns The generated filename
 *
 * @example
 * ```typescript
 * const filename = exportGraphAsJSON({
 *   nodes: graphNodes,
 *   links: graphLinks,
 *   filenamePrefix: 'case-123-data',
 *   metadata: {
 *     caseId: '123',
 *     investigator: 'John Doe',
 *   },
 *   onSuccess: (filename) => toast.success(`Exported: ${filename}`),
 * });
 * ```
 */
export function exportGraphAsJSON(options: ExportJSONOptions): string {
  const {
    nodes,
    links,
    filenamePrefix = 'investigation-graph',
    metadata,
    onSuccess,
    onError,
  } = options;

  try {
    // Create graph data structure
    const graphData: ExportedGraphData = {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        x: n.x,
        y: n.y,
        risk_level: n.risk_level,
        metadata: n.metadata,
      })),
      links: links.map(l => ({
        id: l.id,
        source: l.source,
        target: l.target,
        type: l.type,
        label: l.label,
      })),
      exported_at: new Date().toISOString(),
      ...(metadata && { metadata }),
    };

    // Convert to JSON string
    const dataStr = JSON.stringify(graphData, null, 2);

    // Create Blob and trigger download
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const filename = `${filenamePrefix}-${Date.now()}.json`;

    triggerDownload(url, filename);

    // Clean up object URL
    URL.revokeObjectURL(url);

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(filename);
    }

    return filename;
  } catch (error) {
    // Call error callback if provided
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

// ============================================================================
// SVG EXPORT
// ============================================================================

/**
 * Export graph visualization as SVG file
 *
 * Useful for high-quality vector graphics that can be edited in tools like Adobe Illustrator.
 *
 * @param options - Export options including SVG element
 * @returns The generated filename
 *
 * @example
 * ```typescript
 * const filename = exportGraphAsSVG({
 *   svgElement: svgRef.current!,
 *   filenamePrefix: 'case-123-graph',
 *   onSuccess: (filename) => toast.success(`Exported: ${filename}`),
 * });
 * ```
 */
export function exportGraphAsSVG(
  options: Omit<ExportPNGOptions, 'backgroundColor' | 'scale'>
): string {
  const {
    svgElement,
    filenamePrefix = 'investigation-graph',
    onSuccess,
    onError,
  } = options;

  try {
    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create Blob and trigger download
    const dataBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(dataBlob);
    const filename = `${filenamePrefix}-${Date.now()}.svg`;

    triggerDownload(url, filename);

    // Clean up object URL
    URL.revokeObjectURL(url);

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(filename);
    }

    return filename;
  } catch (error) {
    // Call error callback if provided
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Import graph data from JSON file
 *
 * Parses JSON file and validates structure.
 *
 * @param file - File object from file input
 * @returns Promise that resolves with parsed graph data
 *
 * @example
 * ```typescript
 * const fileInput = document.createElement('input');
 * fileInput.type = 'file';
 * fileInput.accept = '.json';
 * fileInput.onchange = async (e) => {
 *   const file = (e.target as HTMLInputElement).files?.[0];
 *   if (file) {
 *     const graphData = await importGraphFromJSON(file);
 *     console.log('Imported nodes:', graphData.nodes.length);
 *     console.log('Imported links:', graphData.links.length);
 *   }
 * };
 * fileInput.click();
 * ```
 */
export async function importGraphFromJSON(
  file: File
): Promise<ExportedGraphData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const graphData = JSON.parse(content) as ExportedGraphData;

        // Basic validation
        if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
          throw new Error('Invalid graph data: missing or invalid nodes array');
        }
        if (!graphData.links || !Array.isArray(graphData.links)) {
          throw new Error('Invalid graph data: missing or invalid links array');
        }

        resolve(graphData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Trigger browser download of a file
 *
 * Creates a temporary download link and clicks it.
 *
 * @internal
 */
function triggerDownload(url: string, filename: string): void {
  const downloadLink = document.createElement('a');
  downloadLink.download = filename;
  downloadLink.href = url;
  downloadLink.style.display = 'none';

  // Append to body (required for Firefox)
  document.body.appendChild(downloadLink);
  downloadLink.click();

  // Clean up
  document.body.removeChild(downloadLink);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

/**
 * Validate that a file is a supported graph export format
 */
export function isSupportedGraphFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ['json', 'svg'].includes(ext);
}

/**
 * Get a summary of graph data
 */
export function getGraphDataSummary(data: ExportedGraphData): {
  nodeCount: number;
  linkCount: number;
  nodeTypes: Set<string>;
  linkTypes: Set<string>;
  exportedAt: Date | null;
} {
  return {
    nodeCount: data.nodes.length,
    linkCount: data.links.length,
    nodeTypes: new Set(data.nodes.map(n => n.type)),
    linkTypes: new Set(data.links.map(l => l.type).filter(Boolean) as string[]),
    exportedAt: data.exported_at ? new Date(data.exported_at) : null,
  };
}
