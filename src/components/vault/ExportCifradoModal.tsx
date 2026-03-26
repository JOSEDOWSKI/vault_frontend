'use client';

import { useState } from 'react';
import { IVModal } from '@/components/ui';
import { generateSalt, deriveEncryptionKey, encrypt } from '@/lib/crypto';
import type { VaultEntryDecrypted } from '@/types/vault';
import '@/styles/components/export-cifrado.css';

interface ExportCifradoModalProps {
  open: boolean;
  entries: VaultEntryDecrypted[];
  collectionNames: Map<number, string>;
  onClose: () => void;
}

export default function ExportCifradoModal({
  open,
  entries,
  collectionNames,
  onClose,
}: ExportCifradoModalProps) {
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function handleCerrar() {
    setPassword('');
    setConfirmacion('');
    setError(null);
    setExito(false);
    onClose();
  }

  async function handleExportar() {
    setError(null);

    if (!password) {
      setError('Ingresa una contraseña de protección.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setProcesando(true);

    try {
      // Construir datos a cifrar
      const datos = entries.map((e) => ({
        nombre: e.name,
        usuario: e.username,
        contraseña: e.password,
        url: e.url ?? '',
        notas: e.notes ?? '',
        coleccion: e.collection
          ? (collectionNames.get(e.collection) ?? `Colección ${e.collection}`)
          : 'Personal',
        creado: e.created_at,
        actualizado: e.updated_at,
      }));

      // Derivar clave desde la contraseña de protección
      const salt = generateSalt();
      const clave = await deriveEncryptionKey(password, salt);

      // Cifrar el JSON completo
      const { encrypted_data, iv } = await encrypt(datos, clave);

      // Armar el archivo .ivault
      const ivault = JSON.stringify({
        version: 1,
        app: 'IDEMAVault',
        entradas: entries.length,
        salt,
        iv,
        encrypted_data,
      });

      // Descargar
      const blob = new Blob([ivault], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `boveda-${new Date().toISOString().slice(0, 10)}.ivault`;
      enlace.click();
      URL.revokeObjectURL(url);

      setExito(true);
    } catch {
      setError('Error al cifrar la exportación. Intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <IVModal open={open} onClose={handleCerrar} maxWidth="460px">
      <div className="export-cifrado">
        <h3 className="export-cifrado__titulo">Exportar bóveda cifrada</h3>

        {!exito ? (
          <>
            <p className="export-cifrado__descripcion">
              El archivo <code>.ivault</code> se protegerá con la contraseña que ingreses.
              Para leerlo necesitarás esta misma contraseña — no se puede recuperar si la olvidas.
            </p>

            <div className="export-cifrado__info">
              <span className="export-cifrado__info-icono">🔒</span>
              <span>
                {entries.length} entrada{entries.length !== 1 ? 's' : ''} se exportarán cifradas con AES-256-GCM
              </span>
            </div>

            <div className="export-cifrado__campo">
              <label className="export-cifrado__label" htmlFor="export-password">
                Contraseña de protección
              </label>
              <input
                id="export-password"
                className="export-cifrado__input"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={procesando}
                autoComplete="new-password"
              />
            </div>

            <div className="export-cifrado__campo">
              <label className="export-cifrado__label" htmlFor="export-confirm">
                Confirmar contraseña
              </label>
              <input
                id="export-confirm"
                className="export-cifrado__input"
                type="password"
                placeholder="Repite la contraseña"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                disabled={procesando}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="export-cifrado__error">{error}</p>}

            <div className="export-cifrado__acciones">
              <button
                className="export-cifrado__btn export-cifrado__btn--secundario"
                onClick={handleCerrar}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="export-cifrado__btn export-cifrado__btn--primario"
                onClick={handleExportar}
                disabled={procesando}
              >
                {procesando ? 'Cifrando...' : 'Exportar y descargar'}
              </button>
            </div>
          </>
        ) : (
          <div className="export-cifrado__exito">
            <div className="export-cifrado__exito-icono">✓</div>
            <p className="export-cifrado__exito-texto">
              Archivo <code>.ivault</code> descargado correctamente.
            </p>
            <p className="export-cifrado__exito-nota">
              Para descifrar y leer el contenido, ve a <strong>Admin → Descifrar exportación</strong> e ingresa la contraseña que usaste.
            </p>
            <button
              className="export-cifrado__btn export-cifrado__btn--primario"
              onClick={handleCerrar}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </IVModal>
  );
}
