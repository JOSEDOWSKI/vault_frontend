export type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout';

export interface AuditLog {
  id: number;
  user: number | null;
  user_email: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: number | null;
  ip_address: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}
