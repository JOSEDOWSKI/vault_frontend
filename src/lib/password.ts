const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
};

export function generatePassword(options: GeneratorOptions = DEFAULT_OPTIONS): string {
  let charset = '';
  const guaranteed: string[] = [];

  if (options.lowercase) {
    charset += LOWERCASE;
    guaranteed.push(randomChar(LOWERCASE));
  }
  if (options.uppercase) {
    charset += UPPERCASE;
    guaranteed.push(randomChar(UPPERCASE));
  }
  if (options.digits) {
    charset += DIGITS;
    guaranteed.push(randomChar(DIGITS));
  }
  if (options.symbols) {
    charset += SYMBOLS;
    guaranteed.push(randomChar(SYMBOLS));
  }

  if (charset.length === 0) {
    charset = ALL_CHARS;
  }

  const length = Math.max(options.length, guaranteed.length);
  const remaining = length - guaranteed.length;

  const chars = [...guaranteed];
  for (let i = 0; i < remaining; i++) {
    chars.push(randomChar(charset));
  }

  // Fisher-Yates shuffle with crypto random
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  feedback: string[];
}

export function evaluateStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  if (password.length < 12) {
    feedback.push('Use at least 12 characters');
  }

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (variety >= 3) score++;
  if (variety === 4) score++;

  if (!hasUpper) feedback.push('Add uppercase letters');
  if (!hasLower) feedback.push('Add lowercase letters');
  if (!hasDigit) feedback.push('Add numbers');
  if (!hasSymbol) feedback.push('Add symbols (!@#$%...)');

  // Penalize common patterns
  if (/^[a-zA-Z]+$/.test(password)) {
    score = Math.max(score - 1, 0);
    feedback.push('Avoid using only letters');
  }
  if (/^[0-9]+$/.test(password)) {
    score = Math.max(score - 1, 0);
    feedback.push('Avoid using only numbers');
  }
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(score - 1, 0);
    feedback.push('Avoid repeated characters (aaa, 111)');
  }
  if (/^(012|123|234|345|456|567|678|789|abc|bcd|cde|def|qwerty|asdf)/i.test(password)) {
    score = Math.max(score - 1, 0);
    feedback.push('Avoid sequential patterns');
  }

  // Common passwords / dictionary-like patterns
  const commonPatterns = [
    'password', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon',
    'master', 'admin', 'login', 'abc123', 'iloveyou', 'trustno1',
    'sunshine', 'princess', 'football', 'shadow', 'superman', 'michael',
    'charlie', 'jordan', 'baseball', 'summer', 'winter',
  ];
  const lower = password.toLowerCase();
  if (commonPatterns.some((p) => lower.includes(p))) {
    score = Math.max(score - 2, 0);
    feedback.push('Contains a common word or pattern');
  }

  const clampedScore = Math.min(Math.max(score, 0), 4) as 0 | 1 | 2 | 3 | 4;

  const labels: Record<number, PasswordStrength['label']> = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Strong',
    4: 'Very Strong',
  };

  return {
    score: clampedScore,
    label: labels[clampedScore],
    feedback: clampedScore >= 3 ? [] : feedback,
  };
}

function randomChar(charset: string): string {
  return charset[randomInt(charset.length)];
}

function randomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}
