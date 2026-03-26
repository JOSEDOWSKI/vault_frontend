export interface RegisterPayload {
  email: string;
  username: string;
  salt: string;
  verification_hash: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_iv: string;
}

export interface LoginPayload {
  email: string;
  verification_hash: string;
  device_fingerprint?: string;
}

export interface AuthResponse {
  detail: string;
}

export interface SaltResponse {
  salt: string;
}

export interface MeResponse {
  id: number;
  email: string;
  username: string;
  org_role: 'org_admin' | 'member';
  public_key: string;
  encrypted_private_key: string;
  private_key_iv: string;
}

export interface PublicKeyResponse {
  public_key: string;
}

export interface TrustedDevice {
  id: number;
  device_name: string;
  ip_address: string | null;
  last_seen: string;
  created_at: string;
  is_trusted: boolean;
}

export interface PendingDevice extends TrustedDevice {
  user_id: number;
  user_email: string;
}

export interface InvitationInfo {
  email: string;
  org_role: 'org_admin' | 'member';
  expires_at: string;
}

export interface PendingInvitation {
  id: number;
  email: string;
  org_role: 'org_admin' | 'member';
  expires_at: string;
  created_at: string;
}

export interface CompleteInvitationPayload {
  username: string;
  salt: string;
  verification_hash: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_iv: string;
}
