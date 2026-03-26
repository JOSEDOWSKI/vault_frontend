export type PasswordStrength = 'strong' | 'medium' | 'weak';

export interface PasswordIssue {
  id: number;
  name: string;
  username: string;
  reason: 'weak' | 'reused';
  strength?: PasswordStrength;
}

export interface PasswordHealthStats {
  total: number;
  strong: number;
  medium: number;
  weak: number;
  reused: number;
  issues: PasswordIssue[];
}
