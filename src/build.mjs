// Build canónico. Se ejecuta desde cualquier cwd:
//   npm run build          (raíz del repo)
//   cd src && npm run build
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const r = await build({
  absWorkingDir: here,
  entryPoints: [path.join(here, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  target: 'es2020',
  legalComments: 'none',
});
const app = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const readJson = (f) => fs.readFileSync(f, 'utf8').replace(/</g, '\\u003c');
const b64 = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
const tex = path.join(root, 'texturas');
const data = `window.__SCENE__=${readJson(path.join(root, 'datos/scene.json'))};window.__INT__=${readJson(path.join(root, 'datos/interior.json'))};window.__TEX__=${JSON.stringify({
  door: b64(path.join(tex, 'door_v5.jpg')),
  sign: b64(path.join(tex, 'sign.jpg')),
  puerta: b64(path.join(tex, 'puerta_foto10.jpg')),
  letrero: b64(path.join(tex, 'letrero_foto10.jpg')),
})};`;
let html = fs.readFileSync(path.join(here, 'src/template.html'), 'utf8');
html = html.replace('<script>/*DATA*/</script>', () => `<script>${data}</script>`).replace('<script>/*APP*/</script>', () => `<script>${app}</script>`);
const out = path.join(root, 'publicado', 'ed_almendra_3d.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('ok', (html.length / 1024).toFixed(0) + ' KB', '→', path.relative(root, out));
