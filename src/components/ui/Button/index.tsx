import '@/styles/components/iv-button.css';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface IVButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function IVButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: IVButtonProps) {
  return (
    <button
      className={`iv-btn iv-btn--${variant} iv-btn--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
