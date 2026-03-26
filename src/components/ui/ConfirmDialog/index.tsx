import IVModal from '../Modal';
import IVButton from '../Button';

interface ConfirmDialogProps {
  open: boolean;
  titulo: string;
  mensaje: string;
  etiquetaConfirmar?: string;
  etiquetaCancelar?: string;
  peligroso?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function IVConfirmDialog({
  open,
  titulo,
  mensaje,
  etiquetaConfirmar = 'Confirmar',
  etiquetaCancelar = 'Cancelar',
  peligroso = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    <IVModal open={open} onClose={onCancelar} maxWidth="400px">
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
        {titulo}
      </h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.6 }}>
        {mensaje}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
        <IVButton variant="secondary" onClick={onCancelar}>
          {etiquetaCancelar}
        </IVButton>
        <IVButton variant={peligroso ? 'danger' : 'primary'} onClick={onConfirmar}>
          {etiquetaConfirmar}
        </IVButton>
      </div>
    </IVModal>
  );
}
