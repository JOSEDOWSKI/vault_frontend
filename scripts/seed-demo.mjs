/**
 * Script de seed que corre en Node.js usando hash-wasm (la misma librería del frontend)
 * para generar verification_hash y encryption_key idénticos al browser.
 *
 * Uso:
 *   node scripts/seed-demo.mjs
 *
 * Requisitos:
 *   - Backend corriendo en http://backend:8000 (dentro de Docker)
 *     o http://localhost:8000 (fuera de Docker)
 *   - hash-wasm instalado (ya está en package.json)
 */

import { argon2id } from 'hash-wasm';
import crypto from 'crypto';

const API = process.env.API_URL || 'http://localhost:8000';

const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536,
  hashLength: 32,
};

// ─── Helpers criptográficos (replican lib/crypto.ts) ─────────────────────────

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function generateSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function generateIv() {
  return crypto.getRandomValues(new Uint8Array(12));
}

async function deriveVerificationHash(password, salt) {
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

async function deriveEncryptionKey(password, salt) {
  const hashHex = await argon2id({
    password,
    salt: hexToBytes(salt),
    ...ARGON2_PARAMS,
    outputType: 'hex',
  });
  return hexToBytes(hashHex);
}

function aesGcmEncrypt(plaintext, keyBytes) {
  const iv = generateIv();
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyBytes), Buffer.from(iv));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // AES-GCM: ciphertext || tag (como lo hace Web Crypto API)
  const combined = Buffer.concat([encrypted, tag]);
  return {
    encrypted_data: combined.toString('base64'),
    iv: bytesToHex(iv),
  };
}

function generateRsaKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 65537,
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  return { publicKeyDer: publicKey, privateKeyDer: privateKey };
}

function encryptPrivateKey(privateKeyDer, aesKeyBytes) {
  const iv = generateIv();
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(aesKeyBytes), Buffer.from(iv));
  const encrypted = Buffer.concat([cipher.update(privateKeyDer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, tag]);
  return {
    encrypted_private_key: combined.toString('base64'),
    private_key_iv: bytesToHex(iv),
  };
}

// ─── API helpers ─────────────────────────────────────────────────────────────

let cookies = '';

async function apiCall(path, options = {}) {
  const url = `${API}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(cookies ? { Cookie: cookies } : {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Capturar cookies de respuesta
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    cookies = setCookies.map(c => c.split(';')[0]).join('; ');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loginAsAdmin(email, password) {
  // Obtener salt
  const { salt } = await apiCall(`/api/auth/salt/${encodeURIComponent(email)}/`);
  const verificationHash = await deriveVerificationHash(password, salt);

  // Login
  await apiCall('/api/auth/login/', {
    method: 'POST',
    body: { email, verification_hash: verificationHash, device_fingerprint: 'seed-script' },
  });

  return salt;
}

// ─── Datos de prueba ─────────────────────────────────────────────────────────

const USUARIOS = [
  { email: 'admin@idema.com', username: 'admin', password: 'Admin123!', org_role: 'org_admin' },
  { email: 'dev@idema.com', username: 'desarrollador', password: 'Test123!', org_role: 'member' },
  { email: 'soporte@idema.com', username: 'soporte', password: 'Test123!', org_role: 'member' },
];

const ENTRADAS_PERSONAL = {
  'admin@idema.com': [
    { name: 'GitHub Enterprise', username: 'admin@idema.pe', password: 'Gh1tHuB!S3cur3#2026', url: 'https://github.com/idema-pe', notes: 'Cuenta principal de la organización' },
    { name: 'AWS Console', username: 'admin@idema.pe', password: 'Aws!Pr0d#R00t2026', url: 'https://console.aws.amazon.com', notes: 'Acceso root — usar solo en emergencias' },
    { name: 'Gmail Corporativo', username: 'admin@idema.pe', password: 'Gm@1l!C0rp#Str0ng', url: 'https://mail.google.com', notes: '' },
    { name: 'Slack Workspace', username: 'admin@idema.pe', password: 'Sl4ck!W0rksp4c3#', url: 'https://idema.slack.com', notes: 'Workspace principal del equipo' },
    { name: 'Cloudflare', username: 'admin@idema.pe', password: 'Cl0udfl4r3!DNS#2026', url: 'https://dash.cloudflare.com', notes: 'DNS y CDN de producción' },
  ],
  'dev@idema.com': [
    { name: 'GitLab Personal', username: 'dev@idema.pe', password: 'G1tL4b!D3v#P3rs0n4l', url: 'https://gitlab.com', notes: 'Repos personales del desarrollador' },
    { name: 'Docker Hub', username: 'devteam-idema', password: 'D0ck3r!Hub#Push2026', url: 'https://hub.docker.com', notes: '' },
  ],
  'soporte@idema.com': [
    { name: 'Freshdesk', username: 'soporte@idema.pe', password: 'Fr3shD3sk!T1ck3ts#', url: 'https://idema.freshdesk.com', notes: 'Panel de tickets de soporte' },
  ],
};

const ENTRADAS_INFRA = [
  { name: 'DigitalOcean', username: 'infra@idema.pe', password: 'D1g1t4l!0c34n#Pr0d', url: 'https://cloud.digitalocean.com', notes: 'Servidores de producción' },
  { name: 'Vercel', username: 'deploy@idema.pe', password: 'V3rc3l!D3pl0y#F4st', url: 'https://vercel.com/idema', notes: 'Deploy del frontend' },
  { name: 'PostgreSQL Producción', username: 'postgres_admin', password: 'Pg!Pr0d#Sup3rS3cr3t2026', url: 'db.idema.pe:5432', notes: 'Base de datos principal — NUNCA compartir' },
];

const ENTRADAS_REDES = [
  { name: 'Twitter/X', username: '@idema_pe', password: 'Tw1tt3r!X#S0c14l2026', url: 'https://x.com/idema_pe', notes: 'Cuenta oficial de la empresa' },
  { name: 'LinkedIn', username: 'marketing@idema.pe', password: 'L1nk3d1n!C0rp#2026', url: 'https://linkedin.com/company/idema', notes: 'Página empresarial' },
];

// ─── Ejecución principal ─────────────────────────────────────────────────────

async function main() {
  console.log('\n  Seed de datos de prueba (Node.js + hash-wasm)\n');

  // ─── Paso 1: Limpiar y crear usuarios via Django management ───
  console.log('  Limpiando DB y creando usuarios...');

  // Usamos la API de registro/invitación NO, porque requiere un admin ya existente.
  // En su lugar, llamamos al management command de Django que crea los usuarios
  // con el verification_hash que calculamos aquí.

  // Primero, crear los usuarios con un approach diferente:
  // Generar los datos criptográficos aquí y pasarlos al management command.

  const userCryptoData = {};

  for (const u of USUARIOS) {
    console.log(`  Derivando claves para ${u.email}...`);
    const salt = generateSalt();
    const verificationHash = await deriveVerificationHash(u.password, salt);
    const aesKey = await deriveEncryptionKey(u.password, salt);
    const { publicKeyDer, privateKeyDer } = generateRsaKeyPair();
    const { encrypted_private_key, private_key_iv } = encryptPrivateKey(privateKeyDer, aesKey);

    userCryptoData[u.email] = {
      salt,
      verification_hash: verificationHash,
      aes_key: aesKey,
      public_key: bytesToBase64(new Uint8Array(publicKeyDer)),
      encrypted_private_key,
      private_key_iv,
      username: u.username,
      org_role: u.org_role,
    };
  }

  // Generar JSON con los datos para pasarlos al management command de Django
  const seedData = {
    users: USUARIOS.map(u => ({
      email: u.email,
      username: u.username,
      org_role: u.org_role,
      salt: userCryptoData[u.email].salt,
      verification_hash: userCryptoData[u.email].verification_hash,
      public_key: userCryptoData[u.email].public_key,
      encrypted_private_key: userCryptoData[u.email].encrypted_private_key,
      private_key_iv: userCryptoData[u.email].private_key_iv,
    })),
    groups: [
      { name: 'Desarrollo', description: 'Equipo de desarrollo de software — acceso a infraestructura y repos' },
      { name: 'Soporte IT', description: 'Equipo de soporte técnico — acceso a herramientas de atención al cliente' },
    ],
    collections: [
      { name: 'Infraestructura', description: 'Servidores, bases de datos, CDN y servicios cloud' },
      { name: 'Redes Sociales', description: 'Cuentas oficiales de la empresa en redes sociales' },
    ],
    memberships: [
      { user: 'admin@idema.com', group: 'Desarrollo', role: 'admin' },
      { user: 'dev@idema.com', group: 'Desarrollo', role: 'member' },
      { user: 'admin@idema.com', group: 'Soporte IT', role: 'admin' },
      { user: 'soporte@idema.com', group: 'Soporte IT', role: 'member' },
    ],
    collection_access: [
      { collection: 'Infraestructura', group: 'Desarrollo', permission: 'write' },
      { collection: 'Redes Sociales', group: 'Soporte IT', permission: 'read' },
      { collection: 'Infraestructura', group: 'Soporte IT', permission: 'read' },
    ],
    vault_entries: [],
  };

  // Cifrar entradas personales
  for (const u of USUARIOS) {
    const entries = ENTRADAS_PERSONAL[u.email] || [];
    for (const entry of entries) {
      const { encrypted_data, iv } = aesGcmEncrypt(JSON.stringify(entry), userCryptoData[u.email].aes_key);
      seedData.vault_entries.push({ user: u.email, collection: null, encrypted_data, iv });
    }
  }

  // Cifrar entradas de colección (creadas por admin, cifradas con clave del admin)
  const adminKey = userCryptoData['admin@idema.com'].aes_key;
  for (const entry of ENTRADAS_INFRA) {
    const { encrypted_data, iv } = aesGcmEncrypt(JSON.stringify(entry), adminKey);
    seedData.vault_entries.push({ user: 'admin@idema.com', collection: 'Infraestructura', encrypted_data, iv });
  }
  for (const entry of ENTRADAS_REDES) {
    const { encrypted_data, iv } = aesGcmEncrypt(JSON.stringify(entry), adminKey);
    seedData.vault_entries.push({ user: 'admin@idema.com', collection: 'Redes Sociales', encrypted_data, iv });
  }

  // Escribir JSON a stdout para que el management command lo lea
  const jsonOutput = JSON.stringify(seedData);

  // Escribir al archivo temporal
  const fs = await import('fs');
  const path = '/tmp/seed_data.json';
  fs.writeFileSync(path, jsonOutput);
  console.log(`  Datos criptográficos generados -> ${path}`);
  console.log(`  ${seedData.users.length} usuarios, ${seedData.vault_entries.length} entradas`);

  console.log('\n  Credenciales de acceso:');
  console.log('   admin@idema.com   / Admin123!  (org_admin)');
  console.log('   dev@idema.com     / Test123!   (member)');
  console.log('   soporte@idema.com / Test123!   (member)\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
