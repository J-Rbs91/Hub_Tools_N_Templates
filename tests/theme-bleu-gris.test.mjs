import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const css = readFileSync(join(root, 'assets/css/theme-bleu-gris.css'), 'utf8');
const pages = [
  ['index.html', 'assets/css/theme-bleu-gris.css'],
  ['cgu/index.html', '../assets/css/theme-bleu-gris.css'],
  ['outils/campagne-email/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['outils/cloture-caisse/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['outils/demande-ordonnance/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['outils/epaisseur-verres/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['outils/lentilles-souples/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['docs/rgpd-mailing/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['docs/sauvegarde-fichier/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['docs/sync-drive/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['docs/campagne-email/index.html', '../../assets/css/theme-bleu-gris.css'],
  ['docs/formes-types/oma-comparateur.html', '../../assets/css/theme-bleu-gris.css'],
  ['docs/formes-types/scanner.html', '../../assets/css/theme-bleu-gris.css'],
];

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map(c => parseInt(c, 16) / 255);
  assert.equal(channels?.length, 3);
  const linear = channels.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function ratio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

test('palette UXER approuvée et contrastes lisibles', () => {
  const colors = ['--blue:#475569;', '--blue-d:#3d4a5b;', '--muted-2:#6b7280;',
    '--line:#dde3e9;', '--bg:#fafbfc;'];
  for (const color of colors) assert.ok(css.includes(color), 'Jeton manquant: ' + color);
  assert.ok(ratio('#475569', '#fafbfc') >= 4.5, 'Accent trop peu contrasté');
  assert.ok(ratio('#626e7c', '#fafbfc') >= 4.5, 'Texte secondaire trop peu contrasté');
  assert.ok(ratio('#ffffff', '#475569') >= 4.5, 'Texte du bouton insuffisamment contrasté');
});

test('thème limité aux écrans, sans réécriture de l’impression métier', () => {
  assert.match(css, /@media screen\s*\{/);
  assert.doesNotMatch(css, /@media print\s*\{/);
  // Les états succès/erreur/avertissement conservent leurs couleurs distinctives.
  assert.doesNotMatch(css, /\.(?:er-val\.pos|er-val\.neg|ht-pos|ht-neg|verdict--yes|verdict--no|probleme-erreur|probleme-avert)\s*\{/);
});

for (const [path, href] of pages) {
  test('page raccordée au thème commun : ' + path, () => {
    const html = readFileSync(join(root, path), 'utf8');
    const link = '<link rel="stylesheet" href="' + href + '">';
    assert.equal(html.split(link).length - 1, 1, 'Lien unique attendu');
    const before = html.indexOf('</style>'), linked = html.indexOf(link), head = html.indexOf('</head>');
    assert.ok(before !== -1 && before < linked && linked < head,
      'La palette doit être chargée après les styles existants et avant le contenu');
  });
}
