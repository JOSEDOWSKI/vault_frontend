import { forwardRef } from 'react';
import '@/styles/components/iv-input.css';

interface IVInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  id: string;
}

const IVInput = forwardRef<HTMLInputElement, IVInputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div className="iv-input">
        {label && (
          <label className="iv-input__label" htmlFor={id}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`iv-input__field${error ? ' iv-input__field--error' : ''} ${className}`.trim()}
          {...props}
        />
        {error && <span className="iv-input__error">{error}</span>}
      </div>
    );
  }
);
IVInput.displayName = 'IVInput';
export default IVInput;
