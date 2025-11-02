/**
 * ============================================================================
 * COLOR UTILITIES - Advanced color schemes for visualization
 * ============================================================================
 * TASK 4.1.1: Multiple color modes for different analysis perspectives
 */

import { Node, ColorMode } from '../types';

// Category-based colors (existing system)
export const getCategoryColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    // Contact - Indigo
    phone: '#6366F1',
    email: '#6366F1',
    address: '#6366F1',
    whatsapp: '#6366F1',
    telegram: '#6366F1',
    
    // Financial - Pink
    account: '#EC4899',
    upi: '#EC4899',
    card: '#EC4899',
    ifsc: '#EC4899',
    transaction_id: '#EC4899',
    
    // Identity - Purple
    person: '#8B5CF6',
    aadhaar: '#8B5CF6',
    pan: '#8B5CF6',
    passport: '#8B5CF6',
    voter_id: '#8B5CF6',
    driving_licence: '#8B5CF6',
    
    // Network - Cyan
    ip: '#06B6D4',
    domain: '#06B6D4',
    url: '#06B6D4',
    email_header: '#06B6D4',
    
    // Location - Blue
    location: '#3B82F6',
    geohash: '#3B82F6',
    tower_id: '#3B82F6',
    
    // Device - Teal
    imei: '#14B8A6',
    imsi: '#14B8A6',
    mac_address: '#14B8A6',
    device_serial: '#14B8A6',
    iccid: '#14B8A6',
    
    // Business - Purple
    company: '#A855F7',
    gstin: '#A855F7',
    merchant_id: '#A855F7',
  };
  
  return colorMap[type] || '#64748B'; // Slate for unknown
};

// Risk-based colors
export const getRiskColor = (riskLevel: string): string => {
  const colors: Record<string, string> = {
    critical: '#DC2626', // red-600
    high: '#EA580C',     // orange-600
    medium: '#EAB308',   // yellow-500
    low: '#16A34A',      // green-600
  };
  return colors[riskLevel] || '#6B7280'; // gray-500
};

// Amount-based heat map colors
export const getAmountColor = (amount: number): string => {
  if (amount > 10000000) return '#7F1D1D'; // Very dark red - >1Cr
  if (amount > 5000000) return '#991B1B';   // Dark red - >50L
  if (amount > 1000000) return '#DC2626';   // Red - >10L
  if (amount > 500000) return '#F59E0B';    // Orange - >5L
  if (amount > 100000) return '#EAB308';    // Yellow - >1L
  if (amount > 50000) return '#84CC16';     // Light green - >50k
  return '#10B981';                         // Green - <50k
};

// Recency-based colors (days since creation)
export const getRecencyColor = (createdAt: string): string => {
  const now = new Date().getTime();
  const created = new Date(createdAt).getTime();
  const daysSince = (now - created) / (1000 * 60 * 60 * 24);
  
  if (daysSince < 1) return '#10B981';      // Today - bright green
  if (daysSince < 7) return '#3B82F6';      // This week - blue
  if (daysSince < 30) return '#6B7280';     // This month - gray
  if (daysSince < 90) return '#9CA3AF';     // Last 3 months - light gray
  return '#D1D5DB';                         // Older - very faded
};

// Confidence-based gradient
export const getConfidenceColor = (confidence: number): string => {
  // HSL: 0=red (low), 60=yellow (medium), 120=green (high)
  const hue = Math.min(120, (confidence / 100) * 120);
  return `hsl(${hue}, 70%, 50%)`;
};

// Status-based colors
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    verified: '#10B981',      // green
    pending: '#F59E0B',       // orange
    suspicious: '#DC2626',    // red
    rejected: '#6B7280',      // gray
    unknown: '#9CA3AF',       // light gray
  };
  return colors[status] || '#9CA3AF';
};

// Main color selector based on mode
export const getNodeColorByMode = (
  node: Node,
  mode: ColorMode,
  links: any[] = []
): string => {
  switch (mode) {
    case 'category':
      return getCategoryColor(node.type);
      
    case 'risk':
      return getRiskColor(node.risk_level);
      
    case 'amount': {
      // Calculate total money flow through this node
      const totalAmount = links
        .filter(l => l.source === node.id || l.target === node.id)
        .reduce((sum, l) => sum + (l.amount || 0), 0);
      return getAmountColor(totalAmount);
    }
      
    case 'recency':
      return node.entity?.created_at
        ? getRecencyColor(node.entity.created_at)
        : '#9CA3AF';
      
    case 'confidence':
      return getConfidenceColor(node.entity?.confidence || 50);
      
    case 'status':
      return getStatusColor(node.entity?.status || 'unknown');
      
    default:
      return getCategoryColor(node.type);
  }
};

// Edge/Link colors based on type
export const getLinkColor = (linkType: string): string => {
  const colors: Record<string, string> = {
    TRANSFERRED: '#10B981',      // Green for money
    RECEIVED: '#3B82F6',         // Blue
    CALLED: '#6366F1',           // Indigo
    MESSAGED: '#8B5CF6',         // Purple
    SUSPECT_IN: '#DC2626',       // Red
    VICTIM_IN: '#3B82F6',        // Blue
  };
  return colors[linkType] || '#CBD5E1'; // Default gray
};

// Edge width based on amount (logarithmic scale)
export const getEdgeWidth = (amount?: number): number => {
  if (!amount || amount <= 0) return 2;
  // ₹10k = 2px, ₹1L = 5px, ₹10L = 10px, ₹1Cr = 20px
  const width = 2 + Math.log10(amount / 10000) * 4;
  return Math.max(2, Math.min(20, width));
};

// Community colors (for background highlighting)
export const getCommunityColor = (communityId: number): string => {
  const colors = [
    'rgba(59, 130, 246, 0.1)',   // Blue
    'rgba(16, 185, 129, 0.1)',   // Green
    'rgba(236, 72, 153, 0.1)',   // Pink
    'rgba(245, 158, 11, 0.1)',   // Orange
    'rgba(139, 92, 246, 0.1)',   // Purple
    'rgba(6, 182, 212, 0.1)',    // Cyan
    'rgba(234, 179, 8, 0.1)',    // Yellow
    'rgba(239, 68, 68, 0.1)',    // Red
  ];
  return colors[communityId % colors.length];
};

