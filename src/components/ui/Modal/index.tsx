import '@/styles/components/iv-modal.css';

interface IVModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function IVModal({ open, onClose, children, maxWidth = '480px' }: IVModalProps) {
  if (!open) return null;

  return (
    <div className="iv-modal-overlay" onClick={onClose}>
      <div
        className="iv-modal"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
