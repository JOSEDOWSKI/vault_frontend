'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useVault } from '@/features/useVault';
import { getCurrentUser } from '@/features/useAuth';
import { api } from '@/lib/api';
import VaultList from '@/components/vault/VaultList';
import VaultEntryForm from '@/components/vault/VaultEntryForm';
import ExportCifradoModal from '@/components/vault/ExportCifradoModal';
import ImportarModal from '@/components/vault/ImportarModal';
import { IVConfirmDialog, IconPlus, IconSearch, IconDownload, IconUpload, IconInbox, IconShieldCheck, IconLock } from '@/components/ui';
import type { VaultEntryDecrypted, VaultEntryFormData } from '@/types/vault';
import type { Collection } from '@/types/groups';
import '@/styles/components/vault-dashboard.css';

const FILTRO_TODAS = 'todas';
const FILTRO_PERSONAL = 'personal';

export default function VaultDashboard() {
  const { entries, loading, error, fetchAndDecryptEntries, addEntry, updateEntry, deleteEntry } = useVault();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [entradaEditando, setEntradaEditando] = useState<VaultEntryDecrypted | null>(null);
  const [entradaAEliminar, setEntradaAEliminar] = useState<VaultEntryDecrypted | null>(null);
  const [inicializado, setInicializado] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroColeccion, setFiltroColeccion] = useState<string>(FILTRO_TODAS);
  const [collectionNames, setCollectionNames] = useState<Map<number, string>>(new Map());
  const [collectionPermissions, setCollectionPermissions] = useState<Map<number, string | null>>(new Map());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [menuExportAbierto, setMenuExportAbierto] = useState(false);
  const [modalExportCifradoAbierto, setModalExportCifradoAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const esAdmin = getCurrentUser()?.org_role === 'org_admin';

  useEffect(() => {
    fetchAndDecryptEntries().then(() => setInicializado(true));
    // Cargar colecciones para los filtros y badges
    api<Collection[]>('/api/org/collections/')
      .then((cols) => {
        setCollections(cols);
        setCollectionNames(new Map(cols.map((c) => [c.id, c.name])));
        setCollectionPermissions(new Map(cols.map((c) => [c.id, c.user_permission])));
      })
      .catch(() => {});
  }, [fetchAndDecryptEntries]);

  const entradesFiltradas = useMemo(() => {
    let resultado = entries;

    // Filtro por colección
    if (filtroColeccion === FILTRO_PERSONAL) {
      resultado = resultado.filter((e) => e.collection === null);
    } else if (filtroColeccion !== FILTRO_TODAS) {
      const colId = parseInt(filtroColeccion, 10);
      resultado = resultado.filter((e) => e.collection === colId);
    }

    // Filtro por búsqueda (nombre o usuario)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          (e.url ?? '').toLowerCase().includes(q)
      );
    }

    return resultado;
  }, [entries, filtroColeccion, busqueda]);

  function handleEditar(entrada: VaultEntryDecrypted) {
    setEntradaEditando(entrada);
    setMostrarFormulario(true);
  }

  function handleEliminar(id: number) {
    const entrada = entries.find((e) => e.id === id) ?? null;
    setEntradaAEliminar(entrada);
  }

  async function confirmarEliminar() {
    if (!entradaAEliminar) return;
    await deleteEntry(entradaAEliminar.id);
    setEntradaAEliminar(null);
  }

  async function handleGuardar(data: VaultEntryFormData) {
    if (entradaEditando) {
      await updateEntry(entradaEditando.id, data);
    } else {
      await addEntry(data);
    }
    setMostrarFormulario(false);
    setEntradaEditando(null);
  }

  function handleCancelar() {
    setMostrarFormulario(false);
    setEntradaEditando(null);
  }

  // Cerrar menú de exportación al hacer clic fuera
  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setMenuExportAbierto(false);
      }
    }
    if (menuExportAbierto) {
      document.addEventListener('mousedown', handleClickFuera);
    }
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [menuExportAbierto]);

  function exportarJSON() {
    const datos = entries.map((e) => ({
      nombre: e.name,
      usuario: e.username,
      contraseña: e.password,
      url: e.url ?? '',
      notas: e.notes ?? '',
      coleccion: e.collection ? (collectionNames.get(e.collection) ?? `Colección ${e.collection}`) : 'Personal',
      creado: e.created_at,
      actualizado: e.updated_at,
    }));

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    descargarArchivo(blob, 'boveda-export.json');
    setMenuExportAbierto(false);
  }

  function exportarCSV() {
    const cabeceras = ['Nombre', 'Usuario', 'Contraseña', 'URL', 'Notas', 'Colección', 'Creado', 'Actualizado'];
    const filas = entries.map((e) => [
      e.name,
      e.username,
      e.password,
      e.url ?? '',
      e.notes ?? '',
      e.collection ? (collectionNames.get(e.collection) ?? `Colección ${e.collection}`) : 'Personal',
      e.created_at,
      e.updated_at,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`));

    const csv = [cabeceras.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    descargarArchivo(blob, 'boveda-export.csv');
    setMenuExportAbierto(false);
  }

  function descargarArchivo(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  // Colecciones que realmente tienen entradas (para no mostrar filtros vacíos)
  const coleccionesConEntradas = useMemo(() => {
    const idsUsados = new Set(entries.map((e) => e.collection).filter(Boolean) as number[]);
    return collections.filter((c) => idsUsados.has(c.id));
  }, [entries, collections]);

  const hayPersonal = entries.some((e) => e.collection === null);

  return (
    <>
      <div className="vault-dashboard__toolbar">
        <div className="vault-dashboard__title-row">
          <h2 className="vault-dashboard__title">Bóveda</h2>
          {inicializado && entries.length > 0 && (
            <span className="vault-dashboard__count">
              {entradesFiltradas.length}{entradesFiltradas.length !== entries.length ? ` de ${entries.length}` : ''} entradas
            </span>
          )}
        </div>
        <div className="vault-dashboard__actions">
          {esAdmin && entries.length > 0 && (
            <div className="vault-dashboard__export" ref={exportMenuRef}>
              <button
                className="vault-dashboard__action-btn"
                onClick={() => setMenuExportAbierto((v) => !v)}
                title="Exportar bóveda"
              >
                <IconDownload size={16} />
                <span className="vault-dashboard__action-label">Exportar</span>
              </button>
              {menuExportAbierto && (
                <div className="vault-dashboard__export-menu">
                  <div className="vault-dashboard__export-aviso">
                    <IconShieldCheck size={14} />
                    <span>El archivo contendrá contraseñas en texto plano</span>
                  </div>
                  <button className="vault-dashboard__export-option" onClick={exportarJSON}>
                    Exportar como JSON
                  </button>
                  <button className="vault-dashboard__export-option" onClick={exportarCSV}>
                    Exportar como CSV
                  </button>
                  <hr className="vault-dashboard__export-separador" />
                  <button
                    className="vault-dashboard__export-option vault-dashboard__export-option--cifrado"
                    onClick={() => { setMenuExportAbierto(false); setModalExportCifradoAbierto(true); }}
                  >
                    <IconLock size={14} />
                    Exportar cifrado (.ivault)
                  </button>
                </div>
              )}
            </div>
          )}
          {esAdmin && (
            <button
              className="vault-dashboard__action-btn"
              onClick={() => setModalImportarAbierto(true)}
              title="Importar entradas"
            >
              <IconUpload size={16} />
              <span className="vault-dashboard__action-label">Importar</span>
            </button>
          )}
          <button className="vault-dashboard__add-btn" onClick={() => setMostrarFormulario(true)}>
            <IconPlus size={16} />
            Nueva entrada
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      {inicializado && entries.length > 0 && (
        <div className="vault-dashboard__filters">
          <div className="vault-dashboard__search-wrapper">
            <IconSearch size={16} className="vault-dashboard__search-icon" />
            <input
              className="vault-dashboard__search"
              type="search"
              placeholder="Buscar por nombre, usuario o URL..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="vault-dashboard__filter-pills">
            <button
              className={`vault-dashboard__pill${filtroColeccion === FILTRO_TODAS ? ' vault-dashboard__pill--active' : ''}`}
              onClick={() => setFiltroColeccion(FILTRO_TODAS)}
            >
              Todas
            </button>
            {hayPersonal && (
              <button
                className={`vault-dashboard__pill${filtroColeccion === FILTRO_PERSONAL ? ' vault-dashboard__pill--active' : ''}`}
                onClick={() => setFiltroColeccion(FILTRO_PERSONAL)}
              >
                Personal
              </button>
            )}
            {coleccionesConEntradas.map((col) => (
              <button
                key={col.id}
                className={`vault-dashboard__pill${filtroColeccion === String(col.id) ? ' vault-dashboard__pill--active' : ''}`}
                onClick={() => setFiltroColeccion(String(col.id))}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="auth-form__error">{error}</div>}

      {!inicializado || loading ? (
        <div className="vault-dashboard__loading">
          <div className="vault-dashboard__spinner" />
          <span>Descifrando bóveda...</span>
        </div>
      ) : entries.length === 0 && !error ? (
        <div className="vault-dashboard__empty">
          <div className="vault-dashboard__empty-icon">
            <IconInbox size={48} />
          </div>
          <h3 className="vault-dashboard__empty-title">Tu bóveda está vacía</h3>
          <p className="vault-dashboard__empty-desc">
            Agrega tu primera entrada para almacenar credenciales de forma segura.
          </p>
          <button className="vault-dashboard__empty-btn" onClick={() => setMostrarFormulario(true)}>
            <IconPlus size={16} />
            Crear primera entrada
          </button>
        </div>
      ) : entradesFiltradas.length === 0 ? (
        <div className="vault-dashboard__empty">
          <div className="vault-dashboard__empty-icon vault-dashboard__empty-icon--search">
            <IconSearch size={40} />
          </div>
          <h3 className="vault-dashboard__empty-title">Sin resultados</h3>
          <p className="vault-dashboard__empty-desc">
            No se encontraron entradas que coincidan con tu búsqueda.
          </p>
        </div>
      ) : (
        <VaultList
          entries={entradesFiltradas}
          collectionNames={collectionNames}
          collectionPermissions={collectionPermissions}
          onEdit={handleEditar}
          onDelete={handleEliminar}
        />
      )}

      {mostrarFormulario && (
        <VaultEntryForm
          entry={entradaEditando}
          onSubmit={handleGuardar}
          onCancel={handleCancelar}
        />
      )}

      <IVConfirmDialog
        open={!!entradaAEliminar}
        titulo="Eliminar entrada"
        mensaje={`¿Estás seguro de que quieres eliminar "${entradaAEliminar?.name}"? Esta acción no se puede deshacer.`}
        etiquetaConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminar}
        onCancelar={() => setEntradaAEliminar(null)}
      />

      <ExportCifradoModal
        open={modalExportCifradoAbierto}
        entries={entries}
        collectionNames={collectionNames}
        onClose={() => setModalExportCifradoAbierto(false)}
      />

      <ImportarModal
        open={modalImportarAbierto}
        onClose={() => setModalImportarAbierto(false)}
        onImportado={fetchAndDecryptEntries}
      />
    </>
  );
}
