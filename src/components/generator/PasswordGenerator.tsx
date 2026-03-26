'use client';

import { useState, useCallback } from 'react';
import {
  generatePassword,
  evaluateStrength,
  type GeneratorOptions,
  DEFAULT_OPTIONS,
} from '@/lib/password';
import { IVStrengthMeter } from '@/components/ui';
import '@/styles/components/password-generator.css';

export default function PasswordGenerator() {
  const [options, setOptions] = useState<GeneratorOptions>({ ...DEFAULT_OPTIONS });
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_OPTIONS));
  const [copied, setCopied] = useState(false);

  const strength = evaluateStrength(password);

  const handleGenerate = useCallback(() => {
    setPassword(generatePassword(options));
    setCopied(false);
  }, [options]);

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function updateOption<K extends keyof GeneratorOptions>(key: K, value: GeneratorOptions[K]) {
    const next = { ...options, [key]: value };
    setOptions(next);
    setPassword(generatePassword(next));
    setCopied(false);
  }

  return (
    <div className="pg">
      <h2 className="pg__title">Generador de contraseñas</h2>
      <p className="pg__subtitle">
        Genera contraseñas criptográficamente seguras con control total sobre su composición.
      </p>

      {/* Resultado */}
      <div className="pg__output">
        <span className="pg__password">{password}</span>
        <div className="pg__output-actions">
          <button className="pg__copy-btn" onClick={handleCopy}>
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
          <button className="pg__refresh-btn" onClick={handleGenerate}>
            Regenerar
          </button>
        </div>
      </div>

      {/* Fortaleza */}
      <div className="pg__strength">
        <IVStrengthMeter score={strength.score} label={strength.label} />
      </div>

      {/* Controles */}
      <div className="pg__controls">
        <div className="pg__slider-group">
          <div className="pg__slider-header">
            <label className="pg__control-label" htmlFor="pg-length">Longitud</label>
            <span className="pg__length-value">{options.length}</span>
          </div>
          <input
            id="pg-length"
            className="pg__slider"
            type="range"
            min={4}
            max={128}
            value={options.length}
            onChange={(e) => updateOption('length', parseInt(e.target.value))}
          />
          <div className="pg__slider-marks">
            <span>4</span>
            <span>32</span>
            <span>64</span>
            <span>128</span>
          </div>
        </div>

        <div className="pg__toggles">
          <label className={`pg__toggle ${options.uppercase ? 'pg__toggle--active' : ''}`}>
            <input
              type="checkbox"
              checked={options.uppercase}
              onChange={(e) => updateOption('uppercase', e.target.checked)}
            />
            <span className="pg__toggle-label">Mayúsculas</span>
            <span className="pg__toggle-preview">A-Z</span>
          </label>

          <label className={`pg__toggle ${options.lowercase ? 'pg__toggle--active' : ''}`}>
            <input
              type="checkbox"
              checked={options.lowercase}
              onChange={(e) => updateOption('lowercase', e.target.checked)}
            />
            <span className="pg__toggle-label">Minúsculas</span>
            <span className="pg__toggle-preview">a-z</span>
          </label>

          <label className={`pg__toggle ${options.digits ? 'pg__toggle--active' : ''}`}>
            <input
              type="checkbox"
              checked={options.digits}
              onChange={(e) => updateOption('digits', e.target.checked)}
            />
            <span className="pg__toggle-label">Números</span>
            <span className="pg__toggle-preview">0-9</span>
          </label>

          <label className={`pg__toggle ${options.symbols ? 'pg__toggle--active' : ''}`}>
            <input
              type="checkbox"
              checked={options.symbols}
              onChange={(e) => updateOption('symbols', e.target.checked)}
            />
            <span className="pg__toggle-label">Símbolos</span>
            <span className="pg__toggle-preview">!@#$</span>
          </label>
        </div>
      </div>
    </div>
  );
}
