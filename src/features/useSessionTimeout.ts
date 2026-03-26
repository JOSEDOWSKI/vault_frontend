'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

// 15 minutos de inactividad → cierre de sesión automático
const TIMEOUT_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useSessionTimeout() {
  const { logout } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, TIMEOUT_MS);
    }

    // Arrancar el timer inicial
    resetTimer();

    // Reiniciar con cualquier actividad del usuario
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [logout]);
}
