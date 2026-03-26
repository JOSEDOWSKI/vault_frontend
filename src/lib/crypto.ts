import { argon2id } from 'hash-wasm';

const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536, // 64 MB
  hashLength: 32,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Helper para convertir Uint8Array a BufferSource compatible con TS 5.x */
function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// ─── Argon2id (contraseña maestra) ──────────────────────────────────────────

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

export async function deriveEncryptionKey(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const hashHex = await argon2id({
    password,
    salt: hexToBytes(salt),
    ...ARGON2_PARAMS,
    outputType: 'hex',
  });

  const keyBytes = hexToBytes(hashHex);

  return crypto.subtle.importKey(
    'raw',
    toBuffer(keyBytes),
    { name: 'AES-GCM' },
    false, // no extractable
    ['encrypt', 'decrypt']
  );
}

export async function deriveVerificationHash(
  password: string,
  salt: string
): Promise<string> {
  const verificationSalt = salt + 'verification';
  const encoder = new TextEncoder();
  const saltBytes = encoder.encode(verificationSalt);

  return argon2id({
    password,
    salt: saltBytes,
    ...ARGON2_PARAMS,
    outputType: 'hex',
  });
}

// ─── AES-256-GCM (cifrado de entradas) ──────────────────────────────────────

export async function encrypt(
  data: object,
  key: CryptoKey
): Promise<{ encrypted_data: string; iv: string }> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    toBuffer(plaintext)
  );

  return {
    encrypted_data: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToHex(iv),
  };
}

export async function decrypt(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<Record<string, unknown>> {
  const ciphertext = base64ToBytes(encryptedData);
  const ivBytes = hexToBytes(iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBuffer(ivBytes) },
    key,
    toBuffer(ciphertext)
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

// ─── RSA-OAEP (cifrado de claves de colección) ──────────────────────────────

const RSA_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

/** Genera un par de claves RSA-OAEP para el usuario. */
export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt']);
}

/** Exporta la clave pública RSA como string base64 (formato SPKI). */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return bytesToBase64(new Uint8Array(exported));
}

/** Importa una clave pública RSA desde string base64 (formato SPKI). */
export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(base64Spki);
  return crypto.subtle.importKey(
    'spki',
    toBuffer(keyBytes),
    RSA_PARAMS,
    false,
    ['encrypt']
  );
}

/** Exporta y cifra la clave privada RSA con la clave AES personal del usuario. */
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  encKey: CryptoKey
): Promise<{ encrypted_private_key: string; private_key_iv: string }> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    encKey,
    exported
  );

  return {
    encrypted_private_key: bytesToBase64(new Uint8Array(ciphertext)),
    private_key_iv: bytesToHex(iv),
  };
}

/** Descifra y reimporta la clave privada RSA con la clave AES personal del usuario. */
export async function decryptPrivateKey(
  encryptedPrivateKey: string,
  privateKeyIv: string,
  encKey: CryptoKey
): Promise<CryptoKey> {
  const ciphertext = base64ToBytes(encryptedPrivateKey);
  const iv = hexToBytes(privateKeyIv);

  const pkcs8 = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    encKey,
    toBuffer(ciphertext)
  );

  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    RSA_PARAMS,
    false,
    ['decrypt']
  );
}

/** Genera una clave AES-256-GCM aleatoria para una colección. */
export async function generateCollectionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Cifra una clave AES de colección con la clave pública RSA del destinatario. */
export async function wrapCollectionKey(
  collectionKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', collectionKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    raw
  );
  return bytesToBase64(new Uint8Array(encrypted));
}

/** Descifra una clave AES de colección con la clave privada RSA del usuario. */
export async function unwrapCollectionKey(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const ciphertext = base64ToBytes(encryptedKey);

  const raw = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    toBuffer(ciphertext)
  );

  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}
