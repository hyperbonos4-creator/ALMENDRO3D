// Ruta del visor para los scripts de QA. No depende de /workspace/almendra/…
// ALMENDRA_HTML puede ser una ruta absoluta al HTML. Si se pasa un nombre de
// archivo, se busca junto a esa ruta o en publicado/.
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../..');

export function viewerUrl(file) {
  const env = process.env.ALMENDRA_HTML;
  let abs;
  if (file && path.isAbsolute(file)) abs = file;
  else if (file && (file.includes('/') || file.includes('\\'))) abs = path.resolve(file);
  else if (file && env) abs = path.join(path.dirname(path.resolve(env)), file);
  else if (env && !file) abs = path.resolve(env);
  else abs = path.join(repoRoot, 'publicado', file || 'ed_almendra_3d.html');
  const u = pathToFileURL(abs);
  u.searchParams.set('qa', '1');
  return u.href;
}
