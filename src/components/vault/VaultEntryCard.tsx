'use client';

import { useState, useRef, useCallback } from 'react';
import { getCurrentUser } from '@/features/useAuth';
import type { VaultEntryDecrypted } from '@/types/vault';
import '@/styles/components/vault-entry-card.css';

// Segundos antes de limpiar la contraseña del portapapeles
const CLIPBOARD_CLEAR_SECONDS = 15;

interface VaultEntryCardProps {
  entry: VaultEntryDecrypted;
  collectionName?: string;
  // null = entrada personal (sin restricciones)
  // 'read' | 'write' | 'manage' = permiso efectivo del usuario en la colección
  collectionPermission?: string | null;
  onEdit: (entry: VaultEntryDecrypted) => void;
  onDelete: (id: number) => void;
}

export default function VaultEntryCard({
  entry,
  collectionName,
  collectionPermission,
  onEdit,
  onDelete,
}: VaultEntryCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [clipboardCountdown, setClipboardCountdown] = useState<number | null>(null);
  const [mostrarModalSinPermiso, setMostrarModalSinPermiso] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const esAdmin = getCurrentUser()?.org_role === 'org_admin';

  // Entrada personal (sin collection) → acceso total
  // Colección con write/manage → acceso total
  // Colección con read o sin permiso → solo lectura
  const puedeEditar =
    entry.collection === null ||
    collectionPermission === 'write' ||
    collectionPermission === 'manage';

  const esSoloLectura = entry.collection !== null && !puedeEditar;

  // Solo el dueño (personal) o usuarios con write/manage pueden ver la contraseña en pantalla
  // Usuarios con solo 'read' pueden copiar pero NUNCA ver el texto plano
  const puedeVerPassword = entry.collection === null || puedeEditar;

  // Limpia cualquier countdown anterior
  const limpiarCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setClipboardCountdown(null);
  }, []);

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);

    // Solo auto-limpiar el portapapeles para contraseñas
    if (field === 'password') {
      limpiarCountdown();
      let remaining = CLIPBOARD_CLEAR_SECONDS;
      setClipboardCountdown(remaining);

      countdownRef.current = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          // Limpiar el portapapeles
          navigator.clipboard.writeText('').catch(() => {});
          limpiarCountdown();
        } else {
          setClipboardCountdown(remaining);
        }
      }, 1000);
    }
  }

  function handleEditarClick() {
    if (!puedeEditar) {
      setMostrarModalSinPermiso(true);
      return;
    }
    onEdit(entry);
  }

  function handleEliminarClick() {
    if (!puedeEditar) {
      setMostrarModalSinPermiso(true);
      return;
    }
    onDelete(entry.id);
  }

  return (
    <>
      <div className="vault-card">
        <div className="vault-card__header">
          <div className="vault-card__title-row">
            <span className="vault-card__name">{entry.name}</span>
            <div className="vault-card__badges">
              {collectionName ? (
                <span className="vault-card__collection-badge">{collectionName}</span>
              ) : (
                <span className="vault-card__collection-badge vault-card__collection-badge--personal">Personal</span>
              )}
              {esSoloLectura && (
                <span className="vault-card__collection-badge vault-card__collection-badge--readonly">
                  Solo lectura
                </span>
              )}
            </div>
          </div>
          <div className="vault-card__actions">
            <button className="vault-card__action" onClick={handleEditarClick}>
              Editar
            </button>
            <button
              className="vault-card__action vault-card__action--danger"
              onClick={handleEliminarClick}
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="vault-card__fields">
          {entry.url && (
            <div className="vault-card__field">
              <span className="vault-card__field-label">URL</span>
              <span className="vault-card__field-value">{entry.url}</span>
            </div>
          )}

          <div className="vault-card__field">
            <span className="vault-card__field-label">Usuario</span>
            <span className="vault-card__field-value">{entry.username}</span>
            <button
              className="vault-card__copy-btn"
              onClick={() => copyToClipboard(entry.username, 'username')}
            >
              {copied === 'username' ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>

          <div className="vault-card__field">
            <span className="vault-card__field-label">Contraseña</span>
            <span className="vault-card__field-value">
              {showPassword && puedeVerPassword ? entry.password : '\u2022'.repeat(12)}
            </span>
            {puedeVerPassword && (
              <button
                className="vault-card__copy-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            )}
            <button
              className="vault-card__copy-btn"
              onClick={() => copyToClipboard(entry.password, 'password')}
            >
              {copied === 'password' ? '¡Copiado!' : 'Copiar'}
            </button>
            {clipboardCountdown !== null && (
              <span className="vault-card__clipboard-timer">
                Se limpia en {clipboardCountdown}s
              </span>
            )}
          </div>

          {entry.notes && (
            <div className="vault-card__field">
              <span className="vault-card__field-label">Notas</span>
              <span className="vault-card__field-value">{entry.notes}</span>
            </div>
          )}
        </div>
      </div>

      {mostrarModalSinPermiso && (
        <div className="vault-card__modal-overlay" onClick={() => setMostrarModalSinPermiso(false)}>
          <div className="vault-card__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="vault-card__modal-title">Acceso restringido</h3>
            <p className="vault-card__modal-body">
              Solo tienes permiso de lectura en la colección <strong>{collectionName}</strong>.
              Para editar o eliminar entradas necesitas permiso de escritura.
            </p>
            <button
              className="vault-card__modal-btn"
              onClick={() => setMostrarModalSinPermiso(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
