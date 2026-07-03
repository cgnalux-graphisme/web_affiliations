import { useCallback, useRef } from "react";

/** Empêche une double soumission rapide (double-clic, re-clic pendant le chargement). */
export function useOnceSubmit() {
  const lockRef = useRef(false);

  const acquire = useCallback((): boolean => {
    if (lockRef.current) return false;
    lockRef.current = true;
    return true;
  }, []);

  const release = useCallback(() => {
    lockRef.current = false;
  }, []);

  return { acquire, release };
}
