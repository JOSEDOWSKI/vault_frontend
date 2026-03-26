'use client';

import { useMemo } from 'react';
import type { VaultEntryDecrypted } from '@/types/vault';
import type { PasswordStrength, PasswordHealthStats, PasswordIssue } from '@/types/health';

function scorePassword(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

export function usePasswordHealth(entries: VaultEntryDecrypted[]): PasswordHealthStats {
  return useMemo(() => {
    const total = entries.length;
    if (total === 0) {
      return { total: 0, strong: 0, medium: 0, weak: 0, reused: 0, issues: [] };
    }

    // Score each entry
    const scored = entries.map((e) => ({
      ...e,
      strength: scorePassword(e.password),
    }));

    // Detect reused passwords: group by password value
    const passwordMap = new Map<string, number[]>();
    for (const e of scored) {
      const existing = passwordMap.get(e.password) ?? [];
      existing.push(e.id);
      passwordMap.set(e.password, existing);
    }
    const reusedIds = new Set<number>();
    for (const ids of passwordMap.values()) {
      if (ids.length > 1) ids.forEach((id) => reusedIds.add(id));
    }

    // Build issues list (weak or reused)
    const issues: PasswordIssue[] = [];
    for (const e of scored) {
      if (reusedIds.has(e.id)) {
        issues.push({ id: e.id, name: e.name, username: e.username, reason: 'reused', strength: e.strength });
      } else if (e.strength !== 'strong') {
        issues.push({ id: e.id, name: e.name, username: e.username, reason: 'weak', strength: e.strength });
      }
    }

    return {
      total,
      strong: scored.filter((e) => e.strength === 'strong' && !reusedIds.has(e.id)).length,
      medium: scored.filter((e) => e.strength === 'medium').length,
      weak: scored.filter((e) => e.strength === 'weak').length,
      reused: reusedIds.size,
      issues,
    };
  }, [entries]);
}
