/** Délai maximal d'une promesse (sans dépendance, utilisable côté navigateur). */

/** Résout `null` si la promesse n'a pas abouti dans `ms` millisecondes (elle continue en arrière-plan). */
export function avecDelai<T>(promesse: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const minuterie = setTimeout(() => resolve(null), ms);
    Promise.resolve(promesse).then(
      (v) => {
        clearTimeout(minuterie);
        resolve(v);
      },
      (e) => {
        clearTimeout(minuterie);
        reject(e);
      }
    );
  });
}
