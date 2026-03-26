import '@/styles/components/strength-meter.css';

interface PasswordStrengthMeterProps {
  score: number;
  label: string;
  feedback?: string[];
}

export default function IVStrengthMeter({ score, label, feedback }: PasswordStrengthMeterProps) {
  return (
    <div className="strength-meter">
      <div className="strength-meter__bar">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`strength-meter__segment${i < score ? ` strength-meter__segment--${score}` : ''}`}
          />
        ))}
      </div>
      <span className={`strength-meter__label strength-meter__label--${score}`}>{label}</span>
      {feedback && feedback.length > 0 && (
        <ul className="strength-meter__feedback">
          {feedback.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
