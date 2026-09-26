// src/utils/runInBatches.js
// ════════════════════════════════════════════════════════════════════
// UTILITAIRE — runInBatches
//
// Exécute une fonction async sur un tableau d'items par lots (batches)
// pour éviter de saturer le backend / la mémoire.
//
// Utilisation :
//   await runInBatches(ids, async (id) => { await api.remove(id); }, 5);
// ════════════════════════════════════════════════════════════════════

/**
 * Exécute `fn(item)` sur chaque item, par lots de `size`.
 * Les items d'un même lot sont exécutés en parallèle via Promise.all.
 * Le lot suivant démarre uniquement quand le lot courant est terminé.
 *
 * @param {Array} items - Items à traiter
 * @param {Function} fn - Fonction async à exécuter sur chaque item
 * @param {number} [size=5] - Taille du lot (défaut : 5)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 *
 * @example
 * const result = await runInBatches(
 *   ecoleIds,
 *   async (id) => await removeEcole({ ecoleId: id, userId }),
 *   5
 * );
 * console.log(`${result.success} OK, ${result.failed} échecs`);
 */
export async function runInBatches(items, fn, size = 5) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const safeSize = Math.max(1, Math.min(size, items.length));
  const errors = [];
  let success = 0;

  for (let i = 0; i < items.length; i += safeSize) {
    const batch = items.slice(i, i + safeSize);

    const results = await Promise.allSettled(
      batch.map((item) => fn(item))
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        success++;
      } else {
        errors.push(r.reason);
      }
    }
  }

  return {
    success,
    failed: errors.length,
    errors,
  };
}

/**
 * Variante avec callback de progression.
 * Utile pour afficher une barre de progression.
 *
 * @param {Array} items
 * @param {Function} fn
 * @param {object} options
 * @param {number} [options.size=5]
 * @param {Function} [options.onProgress] - (progress) => void
 * @returns {Promise<{success, failed, errors}>}
 */
export async function runInBatchesWithProgress(
  items,
  fn,
  { size = 5, onProgress } = {}
) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const safeSize = Math.max(1, Math.min(size, items.length));
  const errors = [];
  let success = 0;
  let processed = 0;

  for (let i = 0; i < items.length; i += safeSize) {
    const batch = items.slice(i, i + safeSize);

    const results = await Promise.allSettled(
      batch.map((item) => fn(item))
    );

    for (const r of results) {
      if (r.status === "fulfilled") success++;
      else errors.push(r.reason);
    }

    processed += batch.length;

    if (typeof onProgress === "function") {
      onProgress({
        processed,
        total: items.length,
        success,
        failed: errors.length,
        percent: Math.round((processed / items.length) * 100),
      });
    }
  }

  return {
    success,
    failed: errors.length,
    errors,
  };
}

export default runInBatches;