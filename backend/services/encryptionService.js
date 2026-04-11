'use strict';

const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const ENCODING = 'base64';
const SEPARATOR = ':';

let cachedKey = null;
let cachedSalt = null;

/**
 * Derives a 256-bit encryption key from the master password using PBKDF2.
 * Caches the result for performance on subsequent calls.
 */
function deriveKey(masterKey, salt) {
  if (cachedKey && cachedSalt && cachedSalt.equals(salt)) {
    return cachedKey;
  }

  cachedKey = crypto.pbkdf2Sync(
    masterKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  cachedSalt = salt;

  return cachedKey;
}

/**
 * Returns the master encryption key from environment.
 * Falls back to a deterministic dev key if not set (dev-only).
 */
function getMasterKey() {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey && envKey.length >= 16) {
    return envKey;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY environment variable must be set in production (minimum 16 characters).'
    );
  }

  // Dev fallback — NOT safe for production
  return 'cara-dev-encryption-key-do-not-use-in-prod';
}

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * @param {string} plaintext - The text to encrypt.
 * @returns {string} Base64-encoded bundle: salt:iv:tag:ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('encrypt() requires a non-empty string.');
  }

  const masterKey = getMasterKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString(ENCODING),
    iv.toString(ENCODING),
    tag.toString(ENCODING),
    encrypted.toString(ENCODING),
  ].join(SEPARATOR);
}

/**
 * Decrypts an AES-256-GCM encrypted bundle.
 *
 * @param {string} bundle - The salt:iv:tag:ciphertext bundle.
 * @returns {string} Decrypted plaintext.
 */
function decrypt(bundle) {
  if (!bundle || typeof bundle !== 'string') {
    throw new Error('decrypt() requires a non-empty string bundle.');
  }

  const parts = bundle.split(SEPARATOR);
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted bundle format. Expected salt:iv:tag:ciphertext.');
  }

  const [saltB64, ivB64, tagB64, ciphertextB64] = parts;
  const salt = Buffer.from(saltB64, ENCODING);
  const iv = Buffer.from(ivB64, ENCODING);
  const tag = Buffer.from(tagB64, ENCODING);
  const ciphertext = Buffer.from(ciphertextB64, ENCODING);

  const masterKey = getMasterKey();
  const key = deriveKey(masterKey, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Checks whether a string looks like an encrypted bundle.
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const parts = value.split(SEPARATOR);
  if (parts.length !== 4) {
    return false;
  }

  try {
    const salt = Buffer.from(parts[0], ENCODING);
    return salt.length === SALT_LENGTH;
  } catch (_error) {
    return false;
  }
}

/**
 * Encrypts a value only if it is not already encrypted.
 */
function encryptIfNeeded(value) {
  if (!value || isEncrypted(value)) {
    return value;
  }

  return encrypt(value);
}

/**
 * Decrypts a value only if it looks encrypted.
 */
function decryptIfNeeded(value) {
  if (!value || !isEncrypted(value)) {
    return value;
  }

  return decrypt(value);
}

/**
 * Generates a cryptographically secure random encryption key
 * suitable for the ENCRYPTION_KEY environment variable.
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  decrypt,
  decryptIfNeeded,
  encrypt,
  encryptIfNeeded,
  generateKey,
  isEncrypted,
};
