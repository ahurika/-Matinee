import { useEffect, useState } from 'react';

// Counts down to a server-provided expiry time. The SERVER owns the clock. The app only displays it.
// Pass expiresAtMs from the hold response. Pass serverNowMs (from the same response) to correct clock drift.
export function useHoldCountdown(expiresAtMs: number | null, serverNowMs?: number) {
  // Computed once on mount: how far this phone's clock is from the server's clock.
  const [offset] = useState(() => (serverNowMs ? serverNowMs - Date.now() : 0));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAtMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAtMs]);

  const remainingMs = expiresAtMs ? Math.max(0, expiresAtMs - (now + offset)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return { remainingMs, expired: expiresAtMs !== null && remainingMs === 0, label };
}
