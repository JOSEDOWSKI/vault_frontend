'use client';

import { useState, useRef } from 'react';
import { IVModal } from '@/components/ui';
import { deriveEncryptionKey, decrypt, encrypt } from '@/lib/crypto';
import { getEncryptionKey } from '@/features/useAuth';
import { api } from '@/lib/api';
import type { VaultEntryEncrypted, VaultEntryFormData } from '@/types/vault';
import '@/styles/components/importar-modal.css';

interface EntradaPrevia {
  nombre: string;
  usuario: string;
  contraseña: string;
  url: string;
  notas: string;
}

interface IVaultFile {
  version: number;
  app: string;
  salt: string;
  iv: string;
  encrypted_data: string;
}

type Paso = 'seleccionando' | 'requiere-password' | 'vista-previa' | 'importando' | 'completo';

interface ImportarModalProps {
  open: boolean;
  onClose: () => void;
  onImportado: () => void;
}

// ─── Parser CSV ─────────────────────────────────────────────────────────────

function parsearCSV(texto: string): EntradaPrevia[] {
  const lineas = texto.trim().split('\n');
  if (lineas.length < 2) return [];

  const entradas: EntradaPrevia[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = parsearFilaCSV(lineas[i]);
    if (cols.length < 3) continue;

    entradas.push({
      nombre: cols[0] ?? '',
      usuario: cols[1] ?? '',
      contraseña: cols[2] ?? '',
      url: cols[3] ?? '',
      notas: cols[4] ?? '',
    });
  }

  return entradas;
}

function parsearFilaCSV(linea: string): string[] {
  const cols: string[] = [];
  let actual = '';
  let dentroDeComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (dentroDeComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        dentroDeComillas = !dentroDeComillas;
      }
    } else if (c === ',' && !dentroDeComillas) {
      cols.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  cols.push(actual);
  return cols;
}

// ─── Normalizar entradas de JSON exportado ────────────────────────────────

function normalizarDesdeJSON(raw: unknown[]): EntradaPrevia[] {
  return raw
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map((e) => ({
      nombre: String(e.nombre ?? e.name ?? ''),
      usuario: String(e.usuario ?? e.username ?? ''),
      contraseña: String(e.contraseña ?? e.password ?? ''),
      url: String(e.url ?? ''),
      notas: String(e.notas ?? e.notes ?? ''),
    }))
    .filter((e) => e.nombre && e.usuario);
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ImportarModal({ open, onClose, onImportado }: ImportarModalProps) {
  const [paso, setPaso] = useState<Paso>('seleccionando');
  const [ivaultPendiente, setIvaultPendiente] = useState<IVaultFile | null>(null);
  const [password, setPassword] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [entradas, setEntradas] = useState<EntradaPrevia[]>([]);
  const [progreso, setProgreso] = useState({ actuales: 0, total: 0, errores: 0 });
  const [errorArchivo, setErrorArchivo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCerrar() {
    if (paso === 'importando') return;
    setPaso('seleccionando');
    setIvaultPendiente(null);
    setPassword('');
    setErrorPassword('');
    setEntradas([]);
    setErrorArchivo('');
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  }

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorArchivo('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const contenido = ev.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        if (ext === 'ivault') {
          const parsed = JSON.parse(contenido) as IVaultFile;
          if (parsed.version !== 1 || parsed.app !== 'IDEMAVault' || !parsed.encrypted_data) {
            throw new Error('Formato inválido');
          }
          setIvaultPendiente(parsed);
          setPaso('requiere-password');
        } else if (ext === 'json') {
          const parsed = JSON.parse(contenido);
          const lista = Array.isArray(parsed) ? normalizarDesdeJSON(parsed) : [];
          if (!lista.length) throw new Error('Sin entradas válidas');
          setEntradas(lista);
          setPaso('vista-previa');
        } else if (ext === 'csv') {
          const lista = parsearCSV(contenido);
          if (!lista.length) throw new Error('Sin entradas válidas');
          setEntradas(lista);
          setPaso('vista-previa');
        } else {
          setErrorArchivo('Formato no soportado. Usa .ivault, .json o .csv');
        }
      } catch {
        setErrorArchivo('No se pudo leer el archivo. Verifica que sea un archivo válido.');
        if (inputRef.current) inputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  async function handleDescifrarIvault() {
    if (!ivaultPendiente || !password) return;
    setErrorPassword('');

    try {
      const clave = await deriveEncryptionKey(password, ivaultPendiente.salt);
      const datos = await decrypt(ivaultPendiente.encrypted_data, ivaultPendiente.iv, clave);
      if (!Array.isArray(datos)) throw new Error();
      const lista = normalizarDesdeJSON(datos as unknown[]);
      if (!lista.length) throw new Error('Sin entradas válidas');
      setEntradas(lista);
      setPaso('vista-previa');
    } catch {
      setErrorPassword('Contraseña incorrecta o archivo corrupto.');
    }
  }

  async function handleImportar() {
    const encKey = getEncryptionKey();
    if (!encKey) return;

    setPaso('importando');
    setProgreso({ actuales: 0, total: entradas.length, errores: 0 });

    let errores = 0;

    for (let i = 0; i < entradas.length; i++) {
      const entrada = entradas[i];
      const formData: VaultEntryFormData = {
        name: entrada.nombre,
        username: entrada.usuario,
        password: entrada.contraseña,
        ...(entrada.url ? { url: entrada.url } : {}),
        ...(entrada.notas ? { notes: entrada.notas } : {}),
        collection: null,
      };

      try {
        const { encrypted_data, iv } = await encrypt(formData, encKey);
        await api<VaultEntryEncrypted>('/api/vault/entries/', {
          method: 'POST',
          body: { encrypted_data, iv, collection: null },
        });
      } catch {
        errores++;
      }

      setProgreso({ actuales: i + 1, total: entradas.length, errores });
    }

    setProgreso((p) => ({ ...p, errores }));
    setPaso('completo');
    onImportado();
  }

  const porcentaje = progreso.total > 0 ? Math.round((progreso.actuales / progreso.total) * 100) : 0;

  return (
    <IVModal open={open} onClose={handleCerrar} maxWidth="520px">
      <div className="importar-modal">
        <h3 className="importar-modal__titulo">Importar entradas</h3>

        {/* PASO 1 — Seleccionar archivo */}
        {paso === 'seleccionando' && (
          <>
            <p className="importar-modal__descripcion">
              Soporta archivos <code>.ivault</code> (exportación cifrada), <code>.json</code> y <code>.csv</code> exportados desde IDEMAVault.
            </p>
            <label className="importar-modal__upload">
              <input
                ref={inputRef}
                type="file"
                accept=".ivault,.json,.csv"
                className="importar-modal__file-input"
                onChange={handleArchivo}
              />
              <div className="importar-modal__upload-icono">↑</div>
              <span className="importar-modal__upload-texto">Haz clic para seleccionar o arrastra el archivo</span>
              <span className="importar-modal__upload-hint">.ivault · .json · .csv</span>
            </label>
            {errorArchivo && <p className="importar-modal__error">{errorArchivo}</p>}
            <div className="importar-modal__acciones">
              <button className="importar-modal__btn importar-modal__btn--secundario" onClick={handleCerrar}>
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* PASO 2 — Contraseña para .ivault */}
        {paso === 'requiere-password' && (
          <>
            <div className="importar-modal__info">
              <span>🔒</span>
              <span>Archivo .ivault detectado. Ingresa la contraseña de protección para descifrarlo.</span>
            </div>
            <div className="importar-modal__campo">
              <label className="importar-modal__label" htmlFor="import-password">
                Contraseña de protección
              </label>
              <input
                id="import-password"
                className="importar-modal__input"
                type="password"
                placeholder="Contraseña usada al exportar"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDescifrarIvault()}
                autoComplete="current-password"
              />
              {errorPassword && <p className="importar-modal__error">{errorPassword}</p>}
            </div>
            <div className="importar-modal__acciones">
              <button
                className="importar-modal__btn importar-modal__btn--secundario"
                onClick={() => { setPaso('seleccionando'); setPassword(''); setErrorPassword(''); if (inputRef.current) inputRef.current.value = ''; }}
              >
                Atrás
              </button>
              <button
                className="importar-modal__btn importar-modal__btn--primario"
                onClick={handleDescifrarIvault}
                disabled={!password}
              >
                Descifrar
              </button>
            </div>
          </>
        )}

        {/* PASO 3 — Vista previa */}
        {paso === 'vista-previa' && (
          <>
            <div className="importar-modal__resumen">
              <span className="importar-modal__resumen-num">{entradas.length}</span>
              <span>entrada{entradas.length !== 1 ? 's' : ''} listas para importar como entradas <strong>personales</strong></span>
            </div>
            <div className="importar-modal__tabla-wrap">
              <table className="importar-modal__tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.slice(0, 8).map((e, i) => (
                    <tr key={i}>
                      <td>{e.nombre}</td>
                      <td>{e.usuario}</td>
                      <td className="importar-modal__tabla-url">{e.url || '—'}</td>
                    </tr>
                  ))}
                  {entradas.length > 8 && (
                    <tr>
                      <td colSpan={3} className="importar-modal__tabla-mas">
                        + {entradas.length - 8} más...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="importar-modal__nota">
              Las contraseñas se re-cifran con tu clave personal antes de guardarse. El servidor nunca las ve en texto plano.
            </p>
            <div className="importar-modal__acciones">
              <button
                className="importar-modal__btn importar-modal__btn--secundario"
                onClick={() => { setPaso('seleccionando'); setEntradas([]); if (inputRef.current) inputRef.current.value = ''; }}
              >
                Atrás
              </button>
              <button
                className="importar-modal__btn importar-modal__btn--primario"
                onClick={handleImportar}
              >
                Importar {entradas.length} entrada{entradas.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {/* PASO 4 — Progreso */}
        {paso === 'importando' && (
          <div className="importar-modal__progreso">
            <p className="importar-modal__progreso-texto">
              Cifrando e importando... {progreso.actuales} de {progreso.total}
            </p>
            <div className="importar-modal__barra-fondo">
              <div
                className="importar-modal__barra-relleno"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <p className="importar-modal__progreso-pct">{porcentaje}%</p>
          </div>
        )}

        {/* PASO 5 — Completo */}
        {paso === 'completo' && (
          <div className="importar-modal__completo">
            <div className="importar-modal__completo-icono">✓</div>
            <p className="importar-modal__completo-texto">
              {progreso.actuales - progreso.errores} entrada{progreso.actuales - progreso.errores !== 1 ? 's' : ''} importadas correctamente
            </p>
            {progreso.errores > 0 && (
              <p className="importar-modal__completo-error">
                {progreso.errores} entrada{progreso.errores !== 1 ? 's' : ''} no pudieron importarse.
              </p>
            )}
            <button className="importar-modal__btn importar-modal__btn--primario" onClick={handleCerrar}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </IVModal>
  );
}
