export interface VaultEntryEncrypted {
  id: number;
  collection: number | null;
  encrypted_data: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

export interface VaultEntryDecrypted {
  id: number;
  collection: number | null;
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VaultEntryFormData {
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  collection?: number | null;
}

export interface CollectionKeyEncrypted {
  id: number;
  collection: number;
  user: number;
  encrypted_key: string;
  created_at: string;
}
