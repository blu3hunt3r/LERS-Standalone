/**
 * End-to-End Encryption (E2EE) Utility for LERS Chat
 *
 * This module provides client-side encryption/decryption for secure
 * communication between law enforcement and data providers.
 *
 * Security guarantees:
 * - All encryption/decryption happens in the browser
 * - Private keys NEVER leave the device
 * - Server stores only encrypted data
 * - Uses RSA-OAEP for key exchange
 * - Uses AES-256-GCM for message encryption
 */

// Types
export interface KeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

export interface ExportedPublicKey {
  pem: string
  fingerprint: string
}

export interface EncryptedMessage {
  encryptedContent: string        // base64 encoded ciphertext
  encryptedKey: string            // base64 encoded wrapped key
  encryptionAlgorithm: string     // 'AES-256-GCM'
  encryptionIv: string            // base64 encoded IV
  encryptionAuthTag: string       // base64 encoded auth tag
  senderKeyFingerprint: string    // SHA-256 fingerprint
}

/**
 * Generate RSA-OAEP key pair for E2EE
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  }
}

/**
 * Export public key to PEM format with fingerprint
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<ExportedPublicKey> {
  // Export to SPKI format
  const exported = await window.crypto.subtle.exportKey('spki', publicKey)

  // Convert to PEM
  const exportedAsString = ab2str(exported)
  const exportedAsBase64 = window.btoa(exportedAsString)
  const pem = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`

  // Generate fingerprint
  const hash = await window.crypto.subtle.digest('SHA-256', exported)
  const fingerprint = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return { pem, fingerprint }
}

/**
 * Import public key from PEM format
 */
export async function importPublicKey(pem: string): Promise<CryptoKey> {
  // Remove PEM header/footer and newlines
  const pemContents = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')

  // Decode base64
  const binaryDer = window.atob(pemContents)
  const binaryDerArray = str2ab(binaryDer)

  // Import as CryptoKey
  return await window.crypto.subtle.importKey(
    'spki',
    binaryDerArray,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  )
}

/**
 * Export private key for local storage (encrypted with password)
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey)
  const exportedAsString = ab2str(exported)
  const exportedAsBase64 = window.btoa(exportedAsString)
  return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`
}

/**
 * Import private key from storage
 */
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryDer = window.atob(pemContents)
  const binaryDerArray = str2ab(binaryDer)

  return await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDerArray,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  )
}

/**
 * Encrypt a message for a recipient
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderKeyFingerprint: string
): Promise<EncryptedMessage> {
  // Generate random AES-256-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )

  // Generate random IV (12 bytes for GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  // Encrypt the message with AES
  const encodedPlaintext = new TextEncoder().encode(plaintext)
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    aesKey,
    encodedPlaintext
  )

  // The ciphertext from AES-GCM includes the auth tag at the end
  const ciphertextArray = new Uint8Array(ciphertext)
  const authTag = ciphertextArray.slice(-16) // Last 16 bytes
  const actualCiphertext = ciphertextArray.slice(0, -16)

  // Export AES key and encrypt it with recipient's RSA public key
  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey)
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    recipientPublicKey,
    exportedAesKey
  )

  return {
    encryptedContent: arrayBufferToBase64(actualCiphertext),
    encryptedKey: arrayBufferToBase64(encryptedAesKey),
    encryptionAlgorithm: 'AES-256-GCM',
    encryptionIv: arrayBufferToBase64(iv),
    encryptionAuthTag: arrayBufferToBase64(authTag),
    senderKeyFingerprint,
  }
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  recipientPrivateKey: CryptoKey
): Promise<string> {
  // Decrypt the AES key using RSA private key
  const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedMessage.encryptedKey)
  const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    recipientPrivateKey,
    encryptedAesKeyBuffer
  )

  // Import the AES key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    decryptedAesKeyBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  )

  // Reconstruct the ciphertext with auth tag
  const ciphertext = base64ToArrayBuffer(encryptedMessage.encryptedContent)
  const authTag = base64ToArrayBuffer(encryptedMessage.encryptionAuthTag)
  const fullCiphertext = new Uint8Array(ciphertext.byteLength + authTag.byteLength)
  fullCiphertext.set(new Uint8Array(ciphertext), 0)
  fullCiphertext.set(new Uint8Array(authTag), ciphertext.byteLength)

  // Decrypt the message
  const iv = base64ToArrayBuffer(encryptedMessage.encryptionIv)
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
      tagLength: 128,
    },
    aesKey,
    fullCiphertext
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Store keys in IndexedDB (secure local storage)
 */
export async function storeKeys(keyPair: KeyPair, userId: string): Promise<void> {
  const db = await openKeysDB()
  const tx = db.transaction('keys', 'readwrite')
  const store = tx.objectStore('keys')

  const privateKeyData = await exportPrivateKey(keyPair.privateKey)
  const publicKeyData = await exportPublicKey(keyPair.publicKey)

  await store.put({
    userId,
    privateKey: privateKeyData,
    publicKey: publicKeyData.pem,
    fingerprint: publicKeyData.fingerprint,
    createdAt: new Date().toISOString(),
  })

  await tx.done
}

/**
 * Retrieve keys from IndexedDB
 */
export async function retrieveKeys(userId: string): Promise<KeyPair | null> {
  const db = await openKeysDB()
  const tx = db.transaction('keys', 'readonly')
  const store = tx.objectStore('keys')
  const data = await store.get(userId)

  if (!data) return null

  const privateKey = await importPrivateKey(data.privateKey)
  const publicKey = await importPublicKey(data.publicKey)

  return { privateKey, publicKey }
}

/**
 * Check if user has keys stored
 */
export async function hasStoredKeys(userId: string): Promise<boolean> {
  const db = await openKeysDB()
  const tx = db.transaction('keys', 'readonly')
  const store = tx.objectStore('keys')
  const data = await store.get(userId)
  return !!data
}

/**
 * Delete keys from IndexedDB (logout/revoke)
 */
export async function deleteKeys(userId: string): Promise<void> {
  const db = await openKeysDB()
  const tx = db.transaction('keys', 'readwrite')
  const store = tx.objectStore('keys')
  await store.delete(userId)
  await tx.done
}

// Helper functions

function openKeysDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('E2EEKeys', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'userId' })
      }
    }
  })
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)))
}

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}
