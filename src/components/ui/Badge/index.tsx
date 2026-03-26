import '@/styles/components/iv-badge.css';

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface IVBadgeProps {
  variant?: Variant;
  children: React.ReactNode;
}

export default function IVBadge({ variant = 'neutral', children }: IVBadgeProps) {
  return (
    <span className={`iv-badge iv-badge--${variant}`}>{children}</span>
  );
}
