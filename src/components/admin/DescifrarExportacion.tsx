'use client';

import { useState, useRef } from 'react';
import { deriveEncryptionKey, decrypt } from '@/lib/crypto';
import '@/styles/components/descifrar-exportacion.css';

interface IVaultFile {
  version: number;
  app: string;
  entradas: number;
  salt: string;
  iv: string;
  encrypted_data: string;
}

interface EntradaExportada {
  nombre: string;
  usuario: string;
  contraseña: string;
  url: string;
  notas: string;
  coleccion: string;
  creado: string;
  actualizado: string;
}

type Estado = 'esperando-archivo' | 'archivo-cargado' | 'procesando' | 'listo' | 'error';

export default function DescifrarExportacion() {
  const [estado, setEstado] = useState<Estado>('esperando-archivo');
  const [archivo, setArchivo] = useState<IVaultFile | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [password, setPassword] = useState('');
  const [entradas, setEntradas] = useState<EntradaExportada[]>([]);
  const [mensajeError, setMensajeError] = useState('');
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.ivault')) {
      setMensajeError('El archivo debe tener extensión .ivault');
      setEstado('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as IVaultFile;

        if (parsed.version !== 1 || parsed.app !== 'IDEMAVault' || !parsed.encrypted_data) {
          throw new Error('Formato inválido');
        }

        setArchivo(parsed);
        setNombreArchivo(file.name);
        setEstado('archivo-cargado');
        setMensajeError('');
      } catch {
        setMensajeError('El archivo no es un .ivault válido de IDEMAVault.');
        setEstado('error');
      }
    };
    reader.readAsText(file);
  }

  async function handleDescifrar() {
    if (!archivo || !password) return;

    setEstado('procesando');
    setMensajeError('');

    try {
      const clave = await deriveEncryptionKey(password, archivo.salt);
      const datos = await decrypt(archivo.encrypted_data, archivo.iv, clave);

      // El resultado es el array de entradas
      if (!Array.isArray(datos)) throw new Error('Formato inesperado');

      setEntradas(datos as EntradaExportada[]);
      setEstado('listo');
    } catch {
      setMensajeError('Contraseña incorrecta o archivo corrupto.');
      setEstado('archivo-cargado');
    }
  }

  function descargarCSV() {
    const cabeceras = ['Nombre', 'Usuario', 'Contraseña', 'URL', 'Notas', 'Colección', 'Creado', 'Actualizado'];
    const filas = entradas.map((e) =>
      [e.nombre, e.usuario, e.contraseña, e.url, e.notas, e.coleccion, e.creado, e.actualizado]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    );
    const csv = [cabeceras.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    descargarBlob(blob, nombreArchivo.replace('.ivault', '.csv'));
  }

  function descargarJSON() {
    const blob = new Blob([JSON.stringify(entradas, null, 2)], { type: 'application/json' });
    descargarBlob(blob, nombreArchivo.replace('.ivault', '.json'));
  }

  function descargarBlob(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function reiniciar() {
    setEstado('esperando-archivo');
    setArchivo(null);
    setNombreArchivo('');
    setPassword('');
    setEntradas([]);
    setMensajeError('');
    if (inputArchivoRef.current) inputArchivoRef.current.value = '';
  }

  return (
    <div className="descifrar-exp">
      <div className="descifrar-exp__header">
        <h2 className="descifrar-exp__titulo">Descifrar exportación</h2>
        <p className="descifrar-exp__subtitulo">
          Abre un archivo <code>.ivault</code> exportado desde IDEMAVault e ingresa la contraseña de protección para acceder al contenido.
        </p>
      </div>

      <div className="descifrar-exp__card">

        {/* Paso 1: Seleccionar archivo */}
        <div className={`descifrar-exp__paso${estado !== 'esperando-archivo' && estado !== 'error' ? ' descifrar-exp__paso--completado' : ''}`}>
          <div className="descifrar-exp__paso-numero">1</div>
          <div className="descifrar-exp__paso-contenido">
            <p className="descifrar-exp__paso-label">Seleccionar archivo .ivault</p>

            {archivo ? (
              <div className="descifrar-exp__archivo-seleccionado">
                <span className="descifrar-exp__archivo-icono">📄</span>
                <span className="descifrar-exp__archivo-nombre">{nombreArchivo}</span>
                <span className="descifrar-exp__archivo-meta">{archivo.entradas} entrada{archivo.entradas !== 1 ? 's' : ''}</span>
                <button className="descifrar-exp__btn-link" onClick={reiniciar}>Cambiar</button>
              </div>
            ) : (
              <label className="descifrar-exp__upload-area">
                <input
                  ref={inputArchivoRef}
                  type="file"
                  accept=".ivault"
                  className="descifrar-exp__file-input"
                  onChange={handleArchivoSeleccionado}
                />
                <span className="descifrar-exp__upload-texto">
                  Haz clic para seleccionar o arrastra el archivo aquí
                </span>
                <span className="descifrar-exp__upload-hint">Solo archivos .ivault</span>
              </label>
            )}
          </div>
        </div>

        {/* Paso 2: Ingresar contraseña */}
        {(estado === 'archivo-cargado' || estado === 'procesando' || estado === 'listo') && (
          <div className={`descifrar-exp__paso${estado === 'listo' ? ' descifrar-exp__paso--completado' : ''}`}>
            <div className="descifrar-exp__paso-numero">2</div>
            <div className="descifrar-exp__paso-contenido">
              <label className="descifrar-exp__paso-label" htmlFor="descifrar-password">
                Contraseña de protección
              </label>
              <div className="descifrar-exp__password-fila">
                <input
                  id="descifrar-password"
                  className="descifrar-exp__input"
                  type="password"
                  placeholder="Contraseña usada al exportar"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={estado === 'procesando' || estado === 'listo'}
                  onKeyDown={(e) => e.key === 'Enter' && estado === 'archivo-cargado' && handleDescifrar()}
                  autoComplete="current-password"
                />
                {estado === 'archivo-cargado' && (
                  <button
                    className="descifrar-exp__btn descifrar-exp__btn--primario"
                    onClick={handleDescifrar}
                    disabled={!password}
                  >
                    Descifrar
                  </button>
                )}
                {estado === 'procesando' && (
                  <button className="descifrar-exp__btn descifrar-exp__btn--primario" disabled>
                    Descifrando...
                  </button>
                )}
              </div>
              {mensajeError && <p className="descifrar-exp__error">{mensajeError}</p>}
            </div>
          </div>
        )}

        {/* Paso 3: Descargar */}
        {estado === 'listo' && (
          <div className="descifrar-exp__paso">
            <div className="descifrar-exp__paso-numero">3</div>
            <div className="descifrar-exp__paso-contenido">
              <p className="descifrar-exp__paso-label">
                Contenido descifrado — {entradas.length} entrada{entradas.length !== 1 ? 's' : ''}
              </p>
              <p className="descifrar-exp__aviso-descarga">
                ⚠ El archivo descargado contendrá contraseñas en texto plano. Guárdalo de forma segura.
              </p>
              <div className="descifrar-exp__descarga-botones">
                <button className="descifrar-exp__btn descifrar-exp__btn--descarga" onClick={descargarCSV}>
                  Descargar CSV
                </button>
                <button className="descifrar-exp__btn descifrar-exp__btn--descarga" onClick={descargarJSON}>
                  Descargar JSON
                </button>
                <button className="descifrar-exp__btn-link" onClick={reiniciar}>
                  Abrir otro archivo
                </button>
              </div>
            </div>
          </div>
        )}

        {estado === 'error' && (
          <div className="descifrar-exp__error-bloque">
            <p>{mensajeError}</p>
            <button className="descifrar-exp__btn-link" onClick={reiniciar}>Intentar de nuevo</button>
          </div>
        )}
      </div>
    </div>
  );
}
