export interface Group {
  id: number;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  id: number;
  user: number;
  user_email: string;
  group: number;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Collection {
  id: number;
  name: string;
  description: string;
  created_at: string;
  user_permission: 'read' | 'write' | 'manage' | null;
}

export interface CollectionAccess {
  id: number;
  collection: number;
  collection_name: string;
  group: number;
  group_name: string;
  permission: 'read' | 'write' | 'manage';
}
