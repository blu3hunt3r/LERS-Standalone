export interface EvidenceType {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  formats: string[]
  parser: string | null
  description: string
  category: 'financial' | 'telecom' | 'digital' | 'document' | 'media'
}

export const EVIDENCE_TYPES: EvidenceType[] = [
  {
    id: 'BANK_STATEMENT',
    label: 'Bank Statement',
    icon: '🏦',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    formats: ['CSV', 'PDF', 'MT940', 'Excel'],
    parser: 'Bank Parser',
    description: 'Account statements, transaction history, balance details',
    category: 'financial'
  },
  {
    id: 'CDR',
    label: 'Call Detail Records',
    icon: '📞',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    formats: ['CSV', 'Excel'],
    parser: 'CDR Parser',
    description: 'Call logs, IMEI, IMSI, tower data, location tracking',
    category: 'telecom'
  },
  {
    id: 'TRANSACTION_SCREENSHOT',
    label: 'Transaction Screenshot',
    icon: '📱',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    formats: ['PNG', 'JPEG', 'HEIC'],
    parser: 'OCR Parser',
    description: 'UPI payment screenshots, bank app screens with OCR',
    category: 'digital'
  },
  {
    id: 'KYC_DOCUMENT',
    label: 'KYC Document',
    icon: '🪪',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    formats: ['PDF', 'JPEG', 'PNG'],
    parser: 'OCR Parser',
    description: 'Aadhaar, PAN, Voter ID, Driving License, identity documents',
    category: 'document'
  },
  {
    id: 'EMAIL_EXPORT',
    label: 'Email Export',
    icon: '📧',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    formats: ['EML', 'MSG', 'PDF', 'MBOX'],
    parser: 'Email Parser',
    description: 'Email headers, body content, metadata, attachments',
    category: 'digital'
  },
  {
    id: 'SOCIAL_EXPORT',
    label: 'Social Media Export',
    icon: '💬',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    formats: ['JSON', 'HTML', 'PDF', 'ZIP'],
    parser: 'Social Parser',
    description: 'WhatsApp, Facebook, Instagram, Twitter data exports',
    category: 'digital'
  },
  {
    id: 'VIDEO',
    label: 'Video Evidence',
    icon: '🎥',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    formats: ['MP4', 'AVI', 'MOV', 'MKV'],
    parser: null,
    description: 'CCTV footage, screen recordings, video calls',
    category: 'media'
  },
  {
    id: 'IMAGE',
    label: 'Image/Photo',
    icon: '📷',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    formats: ['JPEG', 'PNG', 'HEIC', 'RAW'],
    parser: 'OCR Parser',
    description: 'Photos, morphed images, deepfakes, screenshots',
    category: 'media'
  },
  {
    id: 'LEGAL_DOCUMENT',
    label: 'Legal Document',
    icon: '📝',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    formats: ['PDF', 'DOC', 'DOCX'],
    parser: 'PDF Parser',
    description: 'FIRs, complaints, court orders, legal notices',
    category: 'document'
  },
  {
    id: 'WALLET_STATEMENT',
    label: 'Wallet Statement',
    icon: '💳',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    formats: ['PDF', 'CSV', 'Excel'],
    parser: 'Transaction Parser',
    description: 'UPI, Paytm, PhonePe, GPay wallet statements',
    category: 'financial'
  },
  {
    id: 'CRYPTO_TRANSACTION',
    label: 'Crypto Transaction',
    icon: '₿',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    formats: ['TXT', 'JSON', 'CSV'],
    parser: 'Blockchain Parser',
    description: 'Cryptocurrency transactions, wallet addresses, exchanges',
    category: 'financial'
  },
  {
    id: 'AUDIO_RECORDING',
    label: 'Audio Recording',
    icon: '🎵',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    formats: ['MP3', 'WAV', 'M4A', 'OGG'],
    parser: null,
    description: 'Voice calls, recordings, voicemails',
    category: 'media'
  }
]

export const EVIDENCE_CATEGORIES = [
  { id: 'financial', label: 'Financial', icon: '💰', color: 'text-green-600' },
  { id: 'telecom', label: 'Telecom', icon: '📡', color: 'text-purple-600' },
  { id: 'digital', label: 'Digital', icon: '💻', color: 'text-blue-600' },
  { id: 'document', label: 'Documents', icon: '📄', color: 'text-gray-600' },
  { id: 'media', label: 'Media', icon: '🎬', color: 'text-pink-600' }
]

export function getEvidenceTypeById(id: string): EvidenceType | undefined {
  return EVIDENCE_TYPES.find(type => type.id === id)
}

export function getEvidenceTypesByCategory(category: string): EvidenceType[] {
  return EVIDENCE_TYPES.filter(type => type.category === category)
}

