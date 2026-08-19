import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable.
 * Returns null if not configured (tokens will be stored in plaintext as fallback).
 */
const getEncryptionKey = (): Buffer | null => {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) return null;
  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a string value using AES-256-GCM.
 * Returns the encrypted string in format: iv:authTag:encryptedData (hex encoded).
 * If encryption key is not configured, returns the original value.
 */
export const encrypt = (text: string): string => {
  const key = getEncryptionKey();
  if (!key) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt a string value encrypted with AES-256-GCM.
 * Expects format: iv:authTag:encryptedData (hex encoded).
 * If the value doesn't look encrypted (no colons), returns it as-is (legacy plaintext).
 */
export const decrypt = (encryptedText: string): string => {
  const key = getEncryptionKey();
  if (!key) return encryptedText;

  // Check if the value looks like an encrypted string (has exactly 2 colons)
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Legacy plaintext value — return as-is
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    // If decryption fails (e.g., key changed), return original value
    console.warn('Failed to decrypt token — may be legacy plaintext or key mismatch');
    return encryptedText;
  }
};
