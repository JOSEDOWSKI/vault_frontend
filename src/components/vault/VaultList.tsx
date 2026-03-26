import type { VaultEntryDecrypted } from '@/types/vault';
import VaultEntryCard from '@/components/vault/VaultEntryCard';
import '@/styles/components/vault-list.css';

interface VaultListProps {
  entries: VaultEntryDecrypted[];
  collectionNames: Map<number, string>;
  collectionPermissions: Map<number, string | null>;
  onEdit: (entry: VaultEntryDecrypted) => void;
  onDelete: (id: number) => void;
}

export default function VaultList({ entries, collectionNames, collectionPermissions, onEdit, onDelete }: VaultListProps) {
  return (
    <div className="vault-list">
      {entries.map((entry) => (
        <VaultEntryCard
          key={entry.id}
          entry={entry}
          collectionName={entry.collection ? collectionNames.get(entry.collection) : undefined}
          collectionPermission={entry.collection ? (collectionPermissions.get(entry.collection) ?? null) : null}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
