/**
 * ============================================================================
 * ENTITY TYPES - Comprehensive Indian Investigation Entity Taxonomy
 * ============================================================================
 * 42 entity types across 12 categories for law enforcement investigations
 */

import { EntityTypeDefinition } from '../types';

export const ENTITY_TYPES: EntityTypeDefinition[] = [
  // Personal Identity
  { id: 'person', name: 'Person / Full Name', icon: '👤', category: 'Personal Identity' },
  { id: 'aadhaar', name: 'Aadhaar / UID', icon: '🆔', category: 'Personal Identity' },
  { id: 'pan', name: 'PAN Card', icon: '🆔', category: 'Personal Identity' },
  { id: 'passport', name: 'Passport Number', icon: '🛂', category: 'Personal Identity' },
  { id: 'voter_id', name: 'Voter ID / EPIC', icon: '🗳️', category: 'Personal Identity' },
  { id: 'driving_licence', name: 'Driving Licence', icon: '🚗', category: 'Personal Identity' },
  
  // Contact
  { id: 'phone', name: 'Phone Number', icon: '📱', category: 'Contact' },
  { id: 'email', name: 'Email Address', icon: '✉️', category: 'Contact' },
  { id: 'address', name: 'Postal Address', icon: '🏠', category: 'Contact' },
  
  // Telecom & Devices
  { id: 'imei', name: 'IMEI', icon: '📲', category: 'Telecom & Devices' },
  { id: 'imsi', name: 'IMSI', icon: '📡', category: 'Telecom & Devices' },
  { id: 'iccid', name: 'ICCID (SIM Serial)', icon: '📇', category: 'Telecom & Devices' },
  { id: 'mac_address', name: 'MAC Address', icon: '🔌', category: 'Telecom & Devices' },
  { id: 'device_serial', name: 'Device Serial Number', icon: '📲', category: 'Telecom & Devices' },
  { id: 'tower_id', name: 'Cell Tower ID', icon: '📡', category: 'Telecom & Devices' },
  
  // Financial
  { id: 'account', name: 'Bank Account', icon: '🏦', category: 'Financial' },
  { id: 'ifsc', name: 'IFSC Code', icon: '🏦', category: 'Financial' },
  { id: 'upi', name: 'UPI ID / VPA', icon: '💳', category: 'Financial' },
  { id: 'card', name: 'Card Number', icon: '💳', category: 'Financial' },
  { id: 'transaction_id', name: 'Transaction ID', icon: '💸', category: 'Financial' },
  
  // Social Media
  { id: 'twitter', name: 'Twitter / X Username', icon: '🐦', category: 'Social Media' },
  { id: 'instagram', name: 'Instagram Username', icon: '📷', category: 'Social Media' },
  { id: 'facebook', name: 'Facebook Profile', icon: '👥', category: 'Social Media' },
  { id: 'telegram', name: 'Telegram Username', icon: '✈️', category: 'Social Media' },
  { id: 'whatsapp', name: 'WhatsApp Number', icon: '💬', category: 'Social Media' },
  
  // Web & Network
  { id: 'ip', name: 'IP Address', icon: '🌐', category: 'Web & Network' },
  { id: 'domain', name: 'Domain Name', icon: '🌐', category: 'Web & Network' },
  { id: 'url', name: 'Website URL', icon: '🔗', category: 'Web & Network' },
  { id: 'email_header', name: 'Email Header', icon: '📧', category: 'Web & Network' },
  
  // Location
  { id: 'location', name: 'GPS Location (Lat/Lng)', icon: '📍', category: 'Location' },
  { id: 'geohash', name: 'Geohash', icon: '🗺️', category: 'Location' },
  
  // Business
  { id: 'company', name: 'Company / Organization', icon: '🏢', category: 'Business' },
  { id: 'gstin', name: 'GSTIN / VAT Number', icon: '💼', category: 'Business' },
  { id: 'merchant_id', name: 'Merchant ID', icon: '🏪', category: 'Business' },
  
  // Cryptocurrency
  { id: 'btc_address', name: 'Bitcoin Address', icon: '₿', category: 'Cryptocurrency' },
  { id: 'eth_address', name: 'Ethereum Address', icon: '⟠', category: 'Cryptocurrency' },
  { id: 'crypto_txid', name: 'Crypto Transaction ID', icon: '🔗', category: 'Cryptocurrency' },
  
  // Files & Digital Artifacts
  { id: 'file_hash', name: 'File Hash (MD5/SHA)', icon: '📄', category: 'Digital Artifacts' },
  { id: 'document', name: 'Document', icon: '📄', category: 'Digital Artifacts' },
  { id: 'image', name: 'Image', icon: '🖼️', category: 'Digital Artifacts' },
  
  // Vehicle
  { id: 'vehicle', name: 'Vehicle Registration', icon: '🚗', category: 'Vehicle' },
  { id: 'chassis_number', name: 'Chassis Number', icon: '🔧', category: 'Vehicle' },
];

// Helper functions
export const getEntityTypeById = (id: string): EntityTypeDefinition | undefined => {
  return ENTITY_TYPES.find(t => t.id === id);
};

export const getEntityTypesByCategory = (category: string): EntityTypeDefinition[] => {
  return ENTITY_TYPES.filter(t => t.category === category);
};

export const getAllCategories = (): string[] => {
  return Array.from(new Set(ENTITY_TYPES.map(t => t.category)));
};

export const getEntityIcon = (type: string): string => {
  return getEntityTypeById(type)?.icon || '⚫';
};

