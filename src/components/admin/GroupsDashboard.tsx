'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/features/useAuth';
import { useGroups } from '@/features/useGroups';
import { IVConfirmDialog, IVModal, IVButton, IVInput } from '@/components/ui';
import {
  IconGroups,
  IconPlus,
  IconTrash,
  IconUsers,
  IconUser,
  IconVault,
  IconShield,
  IconEye,
  IconEdit,
  IconKey,
  IconInbox,
} from '@/components/ui';
import type { Group } from '@/types/groups';
import '@/styles/components/groups-dashboard.css';

const ETIQUETAS_ROL: Record<string, string> = {
  admin: 'Administrador',
  member: 'Miembro',
};

const ETIQUETAS_PERMISO: Record<string, string> = {
  read: 'Solo lectura',
  write: 'Lectura y escritura',
  manage: 'Gestión completa',
};

const ICONOS_PERMISO: Record<string, React.ReactNode> = {
  read: <IconEye size={14} />,
  write: <IconEdit size={14} />,
  manage: <IconShield size={14} />,
};

const COLORES_PERMISO: Record<string, string> = {
  read: 'info',
  write: 'warning',
  manage: 'success',
};

type TabDetalle = 'miembros' | 'colecciones';

interface GroupCollectionAccess {
  access_id: number;
  collection_id: number;
  collection_name: string;
  permission: string;
}

export default function GroupsDashboard() {
  const user = getCurrentUser();
  const esAdmin = user?.org_role === 'org_admin';

  const {
    groups,
    members,
    selectedGroup,
    collections,
    loading,
    error,
    fetchGroups,
    fetchCollections,
    selectGroup,
    createGroup,
    deleteGroup,
    addMember,
    removeMember,
    createCollection,
    grantCollectionAccess,
  } = useGroups();

  const [tabDetalle, setTabDetalle] = useState<TabDetalle>('miembros');

  // Estado formulario nuevo grupo
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [mostrarFormGrupo, setMostrarFormGrupo] = useState(false);

  // Estado modal agregar miembro
  const [mostrarAgregarMiembro, setMostrarAgregarMiembro] = useState(false);
  const [emailMiembro, setEmailMiembro] = useState('');
  const [rolMiembro, setRolMiembro] = useState<'member' | 'admin'>('member');
  const [guardandoMiembro, setGuardandoMiembro] = useState(false);

  // Estado confirmación eliminar grupo
  const [grupoAEliminar, setGrupoAEliminar] = useState<Group | null>(null);

  // Estado colecciones
  const [mostrarFormColeccion, setMostrarFormColeccion] = useState(false);
  const [nombreColeccion, setNombreColeccion] = useState('');
  const [descColeccion, setDescColeccion] = useState('');
  const [guardandoColeccion, setGuardandoColeccion] = useState(false);

  // Estado otorgar acceso
  const [mostrarOtorgarAcceso, setMostrarOtorgarAcceso] = useState(false);
  const [coleccionSeleccionada, setColeccionSeleccionada] = useState<number | ''>('');
  const [permisoSeleccionado, setPermisoSeleccionado] = useState<'read' | 'write' | 'manage'>('read');
  const [otorgandoAcceso, setOtorgandoAcceso] = useState(false);

  // Accesos de colección del grupo seleccionado
  const [accesosGrupo, setAccesosGrupo] = useState<GroupCollectionAccess[]>([]);
  const [cargandoAccesos, setCargandoAccesos] = useState(false);
  const [actualizandoAcceso, setActualizandoAcceso] = useState<number | null>(null);

  useEffect(() => {
    fetchGroups();
    if (esAdmin) fetchCollections();
  }, [fetchGroups, fetchCollections, esAdmin]);

  useEffect(() => {
    if (!selectedGroup || tabDetalle !== 'colecciones') return;
    setCargandoAccesos(true);
    import('@/lib/api').then(({ api }) =>
      api<GroupCollectionAccess[]>(`/api/org/groups/${selectedGroup.id}/collections/`)
        .then(setAccesosGrupo)
        .catch(() => setAccesosGrupo([]))
        .finally(() => setCargandoAccesos(false))
    );
  }, [selectedGroup, tabDetalle]);

  async function handleCrearGrupo() {
    if (!nuevoNombre.trim()) return;
    const ok = await createGroup(nuevoNombre, nuevaDesc);
    if (ok) {
      setNuevoNombre('');
      setNuevaDesc('');
      setMostrarFormGrupo(false);
    }
  }

  async function handleAgregarMiembro() {
    if (!emailMiembro.trim()) return;
    setGuardandoMiembro(true);
    const ok = await addMember(emailMiembro.trim(), rolMiembro);
    setGuardandoMiembro(false);
    if (ok) {
      setEmailMiembro('');
      setRolMiembro('member');
      setMostrarAgregarMiembro(false);
    }
  }

  async function handleCrearColeccion() {
    if (!nombreColeccion.trim()) return;
    setGuardandoColeccion(true);
    const created = await createCollection(nombreColeccion, descColeccion);
    setGuardandoColeccion(false);
    if (created) {
      setNombreColeccion('');
      setDescColeccion('');
      setMostrarFormColeccion(false);
    }
  }

  async function handleOtorgarAcceso() {
    if (!selectedGroup || !coleccionSeleccionada) return;
    setOtorgandoAcceso(true);
    const ok = await grantCollectionAccess(
      Number(coleccionSeleccionada),
      selectedGroup.id,
      permisoSeleccionado
    );
    setOtorgandoAcceso(false);
    if (ok) {
      setMostrarOtorgarAcceso(false);
      setColeccionSeleccionada('');
      setTabDetalle('colecciones');
      if (selectedGroup) {
        import('@/lib/api').then(({ api }) =>
          api<GroupCollectionAccess[]>(`/api/org/groups/${selectedGroup.id}/collections/`)
            .then(setAccesosGrupo)
            .catch(() => {})
        );
      }
    }
  }

  async function confirmarEliminarGrupo() {
    if (!grupoAEliminar) return;
    await deleteGroup(grupoAEliminar.id);
    setGrupoAEliminar(null);
  }

  async function handleActualizarPermiso(acceso: GroupCollectionAccess, nuevoPerm: string) {
    setActualizandoAcceso(acceso.access_id);
    try {
      const { api } = await import('@/lib/api');
      await api(`/api/org/collections/${acceso.collection_id}/access/${acceso.access_id}/update/`, {
        method: 'PATCH',
        body: { permission: nuevoPerm },
      });
      setAccesosGrupo((prev) =>
        prev.map((a) => a.access_id === acceso.access_id ? { ...a, permission: nuevoPerm } : a)
      );
    } catch {
      // ignorar error
    } finally {
      setActualizandoAcceso(null);
    }
  }

  async function handleRevocarAcceso(acceso: GroupCollectionAccess) {
    setActualizandoAcceso(acceso.access_id);
    try {
      const { api } = await import('@/lib/api');
      await api(`/api/org/collections/${acceso.collection_id}/access/${acceso.access_id}/`, {
        method: 'DELETE',
      });
      setAccesosGrupo((prev) => prev.filter((a) => a.access_id !== acceso.access_id));
    } catch {
      // ignorar error
    } finally {
      setActualizandoAcceso(null);
    }
  }

  // Generar iniciales del grupo para el avatar
  function getInitials(name: string) {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  return (
    <>
      {/* Header de página */}
      <div className="groups-page__header">
        <div>
          <h2 className="groups-page__title">Grupos y Colecciones</h2>
          <p className="groups-page__desc">
            Organiza tu equipo en grupos y controla qué credenciales puede ver cada uno.
          </p>
        </div>
      </div>

      {/* Explicación visual del modelo */}
      <div className="groups-page__explainer">
        <div className="groups-page__explainer-step">
          <div className="groups-page__explainer-icon groups-page__explainer-icon--users">
            <IconUsers size={18} />
          </div>
          <div className="groups-page__explainer-text">
            <span className="groups-page__explainer-label">Usuarios</span>
            <span className="groups-page__explainer-detail">Se agregan a grupos</span>
          </div>
        </div>
        <div className="groups-page__explainer-arrow">→</div>
        <div className="groups-page__explainer-step">
          <div className="groups-page__explainer-icon groups-page__explainer-icon--groups">
            <IconGroups size={18} />
          </div>
          <div className="groups-page__explainer-text">
            <span className="groups-page__explainer-label">Grupos</span>
            <span className="groups-page__explainer-detail">Reciben acceso a colecciones</span>
          </div>
        </div>
        <div className="groups-page__explainer-arrow">→</div>
        <div className="groups-page__explainer-step">
          <div className="groups-page__explainer-icon groups-page__explainer-icon--collections">
            <IconVault size={18} />
          </div>
          <div className="groups-page__explainer-text">
            <span className="groups-page__explainer-label">Colecciones</span>
            <span className="groups-page__explainer-detail">Contienen las credenciales</span>
          </div>
        </div>
      </div>

      {error && <div className="groups-page__error">{error}</div>}

      <div className="groups-dashboard">
        {/* Sidebar: lista de grupos + colecciones */}
        <div className="groups-dashboard__sidebar">
          {/* Sección de grupos */}
          <div className="groups-dashboard__sidebar-section">
            <div className="groups-dashboard__sidebar-header">
              <h3 className="groups-dashboard__section-title">
                <IconGroups size={16} />
                Grupos
              </h3>
              {esAdmin && (
                <button
                  className="groups-dashboard__new-btn"
                  onClick={() => setMostrarFormGrupo(!mostrarFormGrupo)}
                  title="Crear grupo"
                >
                  <IconPlus size={14} />
                </button>
              )}
            </div>

            {/* Formulario nuevo grupo inline */}
            {mostrarFormGrupo && esAdmin && (
              <div className="groups-dashboard__inline-form">
                <input
                  className="groups-dashboard__input"
                  type="text"
                  placeholder="Nombre del grupo"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCrearGrupo()}
                />
                <input
                  className="groups-dashboard__input"
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                />
                <div className="groups-dashboard__inline-form-actions">
                  <button className="groups-dashboard__btn-cancel" onClick={() => setMostrarFormGrupo(false)}>
                    Cancelar
                  </button>
                  <button className="groups-dashboard__btn-save" onClick={handleCrearGrupo} disabled={!nuevoNombre.trim()}>
                    Crear
                  </button>
                </div>
              </div>
            )}

            {/* Lista de grupos */}
            {loading ? (
              <div className="groups-dashboard__placeholder">Cargando...</div>
            ) : groups.length === 0 ? (
              <div className="groups-dashboard__placeholder">
                {esAdmin ? 'Crea tu primer grupo para organizar a tu equipo.' : 'No perteneces a ningún grupo.'}
              </div>
            ) : (
              <ul className="groups-dashboard__list">
                {groups.map((g) => (
                  <li
                    key={g.id}
                    className={`groups-dashboard__item${selectedGroup?.id === g.id ? ' groups-dashboard__item--active' : ''}`}
                    onClick={() => selectGroup(g)}
                  >
                    <div className="groups-dashboard__item-avatar">
                      {getInitials(g.name)}
                    </div>
                    <div className="groups-dashboard__item-info">
                      <span className="groups-dashboard__item-name">{g.name}</span>
                      <span className="groups-dashboard__item-count">
                        {g.member_count} {g.member_count === 1 ? 'miembro' : 'miembros'}
                      </span>
                    </div>
                    {esAdmin && (
                      <button
                        className="groups-dashboard__item-delete"
                        onClick={(e) => { e.stopPropagation(); setGrupoAEliminar(g); }}
                        title="Eliminar grupo"
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sección de colecciones en sidebar (solo admin) */}
          {esAdmin && (
            <div className="groups-dashboard__sidebar-section">
              <div className="groups-dashboard__sidebar-header">
                <h3 className="groups-dashboard__section-title">
                  <IconVault size={16} />
                  Colecciones
                </h3>
                <button
                  className="groups-dashboard__new-btn"
                  onClick={() => setMostrarFormColeccion(true)}
                  title="Crear colección"
                >
                  <IconPlus size={14} />
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="groups-dashboard__placeholder">
                  Las colecciones agrupan credenciales que se comparten con grupos.
                </div>
              ) : (
                <ul className="groups-dashboard__collections-list">
                  {collections.map((c) => (
                    <li key={c.id} className="groups-dashboard__collection-item">
                      <div className="groups-dashboard__collection-dot" />
                      <span className="groups-dashboard__collection-name">{c.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Panel de detalle */}
        <div className="groups-dashboard__detail">
          {!selectedGroup ? (
            <div className="groups-dashboard__empty-state">
              <div className="groups-dashboard__empty-icon">
                <IconGroups size={40} />
              </div>
              <h3 className="groups-dashboard__empty-title">Selecciona un grupo</h3>
              <p className="groups-dashboard__empty-desc">
                Haz clic en un grupo del panel izquierdo para ver sus miembros y las colecciones a las que tiene acceso.
              </p>
            </div>
          ) : (
            <>
              {/* Header del grupo seleccionado */}
              <div className="groups-dashboard__detail-header">
                <div className="groups-dashboard__detail-avatar">
                  {getInitials(selectedGroup.name)}
                </div>
                <div>
                  <h3 className="groups-dashboard__detail-title">{selectedGroup.name}</h3>
                  {selectedGroup.description && (
                    <p className="groups-dashboard__detail-desc">{selectedGroup.description}</p>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="groups-dashboard__tabs">
                <button
                  className={`groups-dashboard__tab${tabDetalle === 'miembros' ? ' groups-dashboard__tab--active' : ''}`}
                  onClick={() => setTabDetalle('miembros')}
                >
                  <IconUsers size={15} />
                  Miembros ({members.length})
                </button>
                {esAdmin && (
                  <button
                    className={`groups-dashboard__tab${tabDetalle === 'colecciones' ? ' groups-dashboard__tab--active' : ''}`}
                    onClick={() => setTabDetalle('colecciones')}
                  >
                    <IconVault size={15} />
                    Colecciones ({accesosGrupo.length})
                  </button>
                )}
              </div>

              {/* Tab: Miembros */}
              {tabDetalle === 'miembros' && (
                <div className="groups-dashboard__tab-content">
                  {esAdmin && (
                    <div className="groups-dashboard__tab-actions">
                      <button
                        className="groups-dashboard__action-btn"
                        onClick={() => setMostrarAgregarMiembro(true)}
                      >
                        <IconPlus size={14} />
                        Agregar miembro
                      </button>
                    </div>
                  )}
                  {members.length === 0 ? (
                    <div className="groups-dashboard__empty-state groups-dashboard__empty-state--compact">
                      <IconInbox size={32} />
                      <p>Este grupo no tiene miembros aún.</p>
                      {esAdmin && <p className="groups-dashboard__empty-hint">Agrega miembros para que puedan acceder a las colecciones del grupo.</p>}
                    </div>
                  ) : (
                    <div className="groups-dashboard__members-grid">
                      {members.map((m) => (
                        <div key={m.id} className="groups-dashboard__member-card">
                          <div className="groups-dashboard__member-avatar">
                            <IconUser size={16} />
                          </div>
                          <div className="groups-dashboard__member-info">
                            <span className="groups-dashboard__member-email">{m.user_email}</span>
                            <span className={`groups-dashboard__member-role groups-dashboard__member-role--${m.role}`}>
                              {ETIQUETAS_ROL[m.role] ?? m.role}
                            </span>
                          </div>
                          {esAdmin && (
                            <button
                              className="groups-dashboard__member-remove"
                              onClick={() => removeMember(m.id)}
                              title="Quitar del grupo"
                            >
                              <IconTrash size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Colecciones */}
              {tabDetalle === 'colecciones' && esAdmin && (
                <div className="groups-dashboard__tab-content">
                  <div className="groups-dashboard__tab-actions">
                    <button
                      className="groups-dashboard__action-btn"
                      onClick={() => setMostrarOtorgarAcceso(true)}
                    >
                      <IconKey size={14} />
                      Otorgar acceso
                    </button>
                  </div>
                  {cargandoAccesos ? (
                    <div className="groups-dashboard__placeholder">Cargando...</div>
                  ) : accesosGrupo.length === 0 ? (
                    <div className="groups-dashboard__empty-state groups-dashboard__empty-state--compact">
                      <IconVault size={32} />
                      <p>Este grupo no tiene acceso a ninguna colección.</p>
                      <p className="groups-dashboard__empty-hint">
                        Otorga acceso para que los miembros puedan ver las credenciales compartidas.
                      </p>
                    </div>
                  ) : (
                    <div className="groups-dashboard__access-grid">
                      {accesosGrupo.map((a) => {
                        const guardando = actualizandoAcceso === a.access_id;
                        return (
                          <div key={a.access_id} className="groups-dashboard__access-card">
                            <div className="groups-dashboard__access-header">
                              <div className={`groups-dashboard__access-icon groups-dashboard__access-icon--${COLORES_PERMISO[a.permission] ?? 'info'}`}>
                                {ICONOS_PERMISO[a.permission] ?? <IconEye size={14} />}
                              </div>
                              <div className="groups-dashboard__access-info">
                                <span className="groups-dashboard__access-name">{a.collection_name}</span>
                                <span className={`groups-dashboard__access-permission groups-dashboard__access-permission--${COLORES_PERMISO[a.permission] ?? 'info'}`}>
                                  {ETIQUETAS_PERMISO[a.permission] ?? a.permission}
                                </span>
                              </div>
                            </div>
                            <div className="groups-dashboard__access-actions">
                              <select
                                className="groups-dashboard__select-inline"
                                value={a.permission}
                                disabled={guardando}
                                onChange={(e) => handleActualizarPermiso(a, e.target.value)}
                              >
                                <option value="read">Solo lectura</option>
                                <option value="write">Lectura y escritura</option>
                                <option value="manage">Gestión completa</option>
                              </select>
                              <button
                                className="groups-dashboard__revoke-btn"
                                disabled={guardando}
                                onClick={() => handleRevocarAcceso(a)}
                                title="Revocar acceso"
                              >
                                {guardando ? '...' : <IconTrash size={14} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal agregar miembro */}
      <IVModal
        open={mostrarAgregarMiembro}
        onClose={() => setMostrarAgregarMiembro(false)}
        maxWidth="420px"
      >
        <div className="groups-dashboard__modal">
          <div className="groups-dashboard__modal-header">
            <div className="groups-dashboard__modal-icon groups-dashboard__modal-icon--accent">
              <IconUsers size={20} />
            </div>
            <h3 className="groups-dashboard__modal-title">Agregar miembro</h3>
            <p className="groups-dashboard__modal-subtitle">
              Agregar usuario al grupo <strong>{selectedGroup?.name}</strong>
            </p>
          </div>

          {error && <div className="groups-dashboard__modal-error">{error}</div>}

          <div className="groups-dashboard__modal-fields">
            <IVInput
              id="miembro-email"
              label="Correo electrónico"
              type="email"
              placeholder="usuario@empresa.com"
              value={emailMiembro}
              onChange={(e) => setEmailMiembro(e.target.value)}
              autoFocus
            />

            <div className="groups-dashboard__field">
              <label className="groups-dashboard__field-label" htmlFor="miembro-rol">Rol en el grupo</label>
              <select
                id="miembro-rol"
                className="groups-dashboard__select"
                value={rolMiembro}
                onChange={(e) => setRolMiembro(e.target.value as 'member' | 'admin')}
              >
                <option value="member">Miembro — acceso a las colecciones del grupo</option>
                <option value="admin">Administrador — puede gestionar miembros del grupo</option>
              </select>
            </div>
          </div>

          <div className="groups-dashboard__modal-actions">
            <IVButton variant="secondary" onClick={() => setMostrarAgregarMiembro(false)}>
              Cancelar
            </IVButton>
            <IVButton
              variant="primary"
              onClick={handleAgregarMiembro}
              disabled={guardandoMiembro || !emailMiembro.trim()}
            >
              {guardandoMiembro ? 'Agregando...' : 'Agregar'}
            </IVButton>
          </div>
        </div>
      </IVModal>

      {/* Modal: Nueva colección */}
      <IVModal open={mostrarFormColeccion} onClose={() => setMostrarFormColeccion(false)} maxWidth="420px">
        <div className="groups-dashboard__modal">
          <div className="groups-dashboard__modal-header">
            <div className="groups-dashboard__modal-icon groups-dashboard__modal-icon--info">
              <IconVault size={20} />
            </div>
            <h3 className="groups-dashboard__modal-title">Nueva colección</h3>
            <p className="groups-dashboard__modal-subtitle">
              Las colecciones agrupan credenciales que se comparten entre grupos.
            </p>
          </div>

          <div className="groups-dashboard__modal-fields">
            <IVInput
              id="col-nombre"
              label="Nombre"
              type="text"
              placeholder="Ej: Infraestructura IT, Redes Sociales"
              value={nombreColeccion}
              onChange={(e) => setNombreColeccion(e.target.value)}
              autoFocus
            />
            <IVInput
              id="col-desc"
              label="Descripción (opcional)"
              type="text"
              placeholder="¿Qué tipo de credenciales se guardarán aquí?"
              value={descColeccion}
              onChange={(e) => setDescColeccion(e.target.value)}
            />
          </div>
          <div className="groups-dashboard__modal-actions">
            <IVButton variant="secondary" onClick={() => setMostrarFormColeccion(false)}>
              Cancelar
            </IVButton>
            <IVButton
              variant="primary"
              onClick={handleCrearColeccion}
              disabled={guardandoColeccion || !nombreColeccion.trim()}
            >
              {guardandoColeccion ? 'Creando...' : 'Crear colección'}
            </IVButton>
          </div>
        </div>
      </IVModal>

      {/* Modal: Otorgar acceso a colección */}
      <IVModal open={mostrarOtorgarAcceso} onClose={() => setMostrarOtorgarAcceso(false)} maxWidth="420px">
        <div className="groups-dashboard__modal">
          <div className="groups-dashboard__modal-header">
            <div className="groups-dashboard__modal-icon groups-dashboard__modal-icon--success">
              <IconKey size={20} />
            </div>
            <h3 className="groups-dashboard__modal-title">Otorgar acceso</h3>
            <p className="groups-dashboard__modal-subtitle">
              Permitir al grupo <strong>{selectedGroup?.name}</strong> acceder a una colección de credenciales.
            </p>
          </div>

          <div className="groups-dashboard__modal-fields">
            <div className="groups-dashboard__field">
              <label className="groups-dashboard__field-label" htmlFor="acceso-col">Colección</label>
              <select
                id="acceso-col"
                className="groups-dashboard__select"
                value={coleccionSeleccionada}
                onChange={(e) => setColeccionSeleccionada(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecciona una colección</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="groups-dashboard__field">
              <label className="groups-dashboard__field-label" htmlFor="acceso-permiso">Nivel de permiso</label>
              <select
                id="acceso-permiso"
                className="groups-dashboard__select"
                value={permisoSeleccionado}
                onChange={(e) => setPermisoSeleccionado(e.target.value as 'read' | 'write' | 'manage')}
              >
                <option value="read">Solo lectura — ver y copiar credenciales</option>
                <option value="write">Lectura y escritura — crear y editar credenciales</option>
                <option value="manage">Gestión completa — todo + otorgar acceso a otros</option>
              </select>
            </div>
          </div>
          <div className="groups-dashboard__modal-actions">
            <IVButton variant="secondary" onClick={() => setMostrarOtorgarAcceso(false)}>
              Cancelar
            </IVButton>
            <IVButton
              variant="primary"
              onClick={handleOtorgarAcceso}
              disabled={otorgandoAcceso || !coleccionSeleccionada}
            >
              {otorgandoAcceso ? 'Otorgando...' : 'Otorgar acceso'}
            </IVButton>
          </div>
        </div>
      </IVModal>

      {/* Confirmación eliminar grupo */}
      <IVConfirmDialog
        open={!!grupoAEliminar}
        titulo="Eliminar grupo"
        mensaje={`¿Estás seguro de que quieres eliminar el grupo "${grupoAEliminar?.name}"? Los miembros perderán el acceso a sus colecciones.`}
        etiquetaConfirmar="Eliminar"
        peligroso
        onConfirmar={confirmarEliminarGrupo}
        onCancelar={() => setGrupoAEliminar(null)}
      />
    </>
  );
}
