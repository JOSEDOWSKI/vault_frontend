'use client';

import { useState, useEffect, type FormEvent } from 'react';
import type { VaultEntryDecrypted, VaultEntryFormData } from '@/types/vault';
import type { Collection } from '@/types/groups';
import {
  generatePassword,
  evaluateStrength,
  type GeneratorOptions,
  DEFAULT_OPTIONS,
} from '@/lib/password';
import { api } from '@/lib/api';
import { IVModal, IVButton, IVStrengthMeter, IconRefresh, IconKey } from '@/components/ui';
import '@/styles/components/vault-entry-form.css';

interface VaultEntryFormProps {
  entry?: VaultEntryDecrypted | null;
  onSubmit: (data: VaultEntryFormData) => Promise<void>;
  onCancel: () => void;
}

export default function VaultEntryForm({ entry, onSubmit, onCancel }: VaultEntryFormProps) {
  const [name, setName] = useState(entry?.name || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry?.password || '');
  const [url, setUrl] = useState(entry?.url || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [collectionId, setCollectionId] = useState<number | null>(entry?.collection ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genOptions, setGenOptions] = useState<GeneratorOptions>({ ...DEFAULT_OPTIONS });
  const [collections, setCollections] = useState<Collection[]>([]);

  const isEditing = !!entry;
  const strength = password.length > 0 ? evaluateStrength(password) : null;

  useEffect(() => {
    // Cargar colecciones disponibles para el selector
    api<Collection[]>('/api/org/collections/').then(setCollections).catch(() => {});
  }, []);

  function handleGenerate() {
    setPassword(generatePassword(genOptions));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        username,
        password,
        url: url || undefined,
        notes: notes || undefined,
        collection: collectionId,
      });
    } catch {
      setError('Error al guardar la entrada.');
      setSaving(false);
    }
  }

  return (
    <IVModal open onClose={onCancel}>
      <form className="vault-form" onSubmit={handleSubmit}>
        <h2 className="vault-form__title">
          {isEditing ? 'Editar entrada' : 'Nueva entrada'}
        </h2>

        {error && <div className="vault-form__error">{error}</div>}

        <div className="vault-form__field">
          <label className="vault-form__label" htmlFor="entry-name">Nombre</label>
          <input
            id="entry-name"
            className="vault-form__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. GitHub, Gmail, AWS Console"
            required
            autoFocus
          />
        </div>

        <div className="vault-form__field">
          <label className="vault-form__label" htmlFor="entry-username">Usuario</label>
          <input
            id="entry-username"
            className="vault-form__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario o correo electrónico"
            required
          />
        </div>

        <div className="vault-form__field">
          <div className="vault-form__label-row">
            <label className="vault-form__label" htmlFor="entry-password">Contraseña</label>
            <button
              type="button"
              className="vault-form__generate-toggle"
              onClick={() => setShowGenerator(!showGenerator)}
            >
              <IconKey size={12} />
              {showGenerator ? 'Ocultar generador' : 'Generar'}
            </button>
          </div>

          <div className="vault-form__password-row">
            <input
              id="entry-password"
              className="vault-form__input vault-form__input--password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa o genera una contraseña"
              required
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {strength && (
            <IVStrengthMeter
              score={strength.score}
              label={strength.label}
              feedback={strength.feedback}
            />
          )}

          {showGenerator && (
            <div className="password-generator">
              <div className="password-generator__row">
                <div className="password-generator__slider-header">
                  <label className="password-generator__label" htmlFor="gen-length">
                    Longitud
                  </label>
                  <span className="password-generator__length-value">{genOptions.length}</span>
                </div>
                <input
                  id="gen-length"
                  className="password-generator__slider"
                  type="range"
                  min={8}
                  max={64}
                  value={genOptions.length}
                  onChange={(e) =>
                    setGenOptions({ ...genOptions, length: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="password-generator__toggles">
                {(['uppercase', 'lowercase', 'digits', 'symbols'] as const).map((key) => (
                  <label key={key} className={`password-generator__toggle${genOptions[key] ? ' password-generator__toggle--active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={genOptions[key]}
                      onChange={(e) => setGenOptions({ ...genOptions, [key]: e.target.checked })}
                    />
                    <span className="password-generator__toggle-label">
                      {key === 'uppercase' ? 'A-Z' : key === 'lowercase' ? 'a-z' : key === 'digits' ? '0-9' : '!@#$'}
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" className="password-generator__btn" onClick={handleGenerate}>
                <IconRefresh size={14} />
                Generar contraseña
              </button>
            </div>
          )}
        </div>

        <div className="vault-form__field">
          <label className="vault-form__label" htmlFor="entry-url">URL (opcional)</label>
          <input
            id="entry-url"
            className="vault-form__input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ejemplo.com"
          />
        </div>

        <div className="vault-form__field">
          <label className="vault-form__label" htmlFor="entry-notes">Notas (opcional)</label>
          <textarea
            id="entry-notes"
            className="vault-form__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales sobre esta credencial"
            rows={3}
          />
        </div>

        {collections.length > 0 && (
          <div className="vault-form__field">
            <label className="vault-form__label" htmlFor="entry-collection">
              Colección (opcional)
            </label>
            <select
              id="entry-collection"
              className="vault-form__select"
              value={collectionId ?? ''}
              onChange={(e) =>
                setCollectionId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Bóveda personal</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="vault-form__buttons">
          <IVButton type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </IVButton>
          <IVButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear entrada'}
          </IVButton>
        </div>
      </form>
    </IVModal>
  );
}
