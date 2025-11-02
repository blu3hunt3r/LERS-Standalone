/**
 * ============================================================================
 * RELATIONSHIP TYPES - Comprehensive Relationship Taxonomy
 * ============================================================================
 * 26 relationship types for investigation graph connections
 */

import { RelationshipType } from '../types';

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  // Communication
  { value: 'CALLED', label: 'Called', category: 'Communication', icon: '📞' },
  { value: 'MESSAGED', label: 'Messaged', category: 'Communication', icon: '💬' },
  { value: 'EMAILED', label: 'Emailed', category: 'Communication', icon: '📧' },
  
  // Device
  { value: 'USED_DEVICE', label: 'Used Device', category: 'Device', icon: '📱' },
  { value: 'ALSO_USED_BY', label: 'Also Used By', category: 'Device', icon: '🔄' },
  { value: 'SHARED_DEVICE', label: 'Shared Device', category: 'Device', icon: '🤝' },
  
  // Financial
  { value: 'TRANSFERRED', label: 'Transferred', category: 'Financial', icon: '💸', color: '#10B981' },
  { value: 'RECEIVED', label: 'Received', category: 'Financial', icon: '💰', color: '#3B82F6' },
  { value: 'OWNS_ACCOUNT', label: 'Owns Account', category: 'Financial', icon: '🏦' },
  { value: 'LINKED_CARD', label: 'Linked Card', category: 'Financial', icon: '💳' },
  
  // Location
  { value: 'CONNECTED_AT', label: 'Connected At', category: 'Location', icon: '📍' },
  { value: 'LOCATED_AT', label: 'Located At', category: 'Location', icon: '🗺️' },
  { value: 'TRAVELED_TO', label: 'Traveled To', category: 'Location', icon: '✈️' },
  { value: 'CO_LOCATED', label: 'Co-Located', category: 'Location', icon: '📌' },
  
  // Association
  { value: 'OWNS', label: 'Owns', category: 'Association', icon: '👑' },
  { value: 'ASSOCIATED_WITH', label: 'Associated With', category: 'Association', icon: '🔗' },
  { value: 'RELATED_TO', label: 'Related To', category: 'Association', icon: '🔄' },
  { value: 'WORKS_FOR', label: 'Works For', category: 'Association', icon: '💼' },
  
  // Social
  { value: 'FRIEND_OF', label: 'Friend Of', category: 'Social', icon: '🤝' },
  { value: 'FOLLOWS', label: 'Follows', category: 'Social', icon: '👥' },
  { value: 'MEMBER_OF', label: 'Member Of', category: 'Social', icon: '👔' },
  
  // Case-Related
  { value: 'LINKED_CASE', label: 'Linked Case', category: 'Case', icon: '📁' },
  { value: 'SUSPECT_IN', label: 'Suspect In', category: 'Case', icon: '🔴', color: '#DC2626' },
  { value: 'VICTIM_IN', label: 'Victim In', category: 'Case', icon: '🔵', color: '#3B82F6' },
  { value: 'WITNESS_IN', label: 'Witness In', category: 'Case', icon: '👁️' },
  
  // Generic
  { value: 'RELATED', label: 'Related', category: 'Generic', icon: '⚪' },
  { value: 'CONNECTED', label: 'Connected', category: 'Generic', icon: '🔗' },
];

// Helper functions
export const getRelationshipType = (value: string): RelationshipType | undefined => {
  return RELATIONSHIP_TYPES.find(t => t.value === value);
};

export const getRelationshipsByCategory = (category: string): RelationshipType[] => {
  return RELATIONSHIP_TYPES.filter(t => t.category === category);
};

export const getRelationshipLabel = (value: string): string => {
  return getRelationshipType(value)?.label || value;
};

