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
  const colors = ['--blue:#445d6c;', '--blue-d:#3a525e;', '--muted-2:#6b7280;',
    '--line:#dce6ea;', '--bg:#fafbfc;'];
  for (const color of colors) assert.ok(css.includes(color), 'Jeton manquant: ' + color);
  assert.ok(ratio('#445d6c', '#fafbfc') >= 4.5, 'Accent trop peu contrasté');
  assert.ok(ratio('#626e7c', '#fafbfc') >= 4.5, 'Texte secondaire trop peu contrasté');
  assert.ok(ratio('#ffffff', '#445d6c') >= 4.5, 'Texte du bouton insuffisamment contrasté');
});

// Référence : bleu gris atténué validé le 29/10/2026. Les accents gagnent
// 20 % de saturation HSL relative (arrondi RVB sur 8 bits).
function hsl(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255);
  const max = Math.max(...channels), min = Math.min(...channels);
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  const [r, g, b] = channels;
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { lightness, saturation, hue };
}

test('saturation des accents augmentée de 20 % sans variation de luminosité', () => {
  const accents = [
    ['--blue-900', '#273343', '#243b46'],
    ['--blue-800', '#39495d', '#355361'],
    ['--blue-d', '#3d4a5b', '#3a525e'],
    ['--blue', '#475569', '#445d6c'],
    ['--blue-300', '#9cabbc', '#99b4bf'],
    ['--blue-100', '#dfe6ed', '#deeaee'],
    ['--blue-50', '#f1f4f7', '#f0f6f8'],
    ['--sky', '#7b8d9e', '#7897a2'],
  ];
  for (const [token, before, after] of accents) {
    assert.ok(css.includes(token + ':' + after + ';'), 'Accent absent : ' + token);
    const original = hsl(before), updated = hsl(after);
    // Les tons très clairs comportent peu de niveaux RVB : quantification tolérée.
    assert.ok(Math.abs(updated.saturation - original.saturation * 1.2) <= .04,
      'Saturation inattendue : ' + token);
    assert.ok(Math.abs(updated.lightness - original.lightness) <= .004,
      'Luminosité modifiée : ' + token);
    assert.ok(updated.hue >= 190 && updated.hue <= 205,
      'Teinte bleue-acier trop violacée : ' + token);
  }
  assert.ok(css.includes('rgba(68,93,108,.42)'), 'Focus non synchronisé avec le bleu');
});

test('la teinte primaire corrige le reflet violacé sans modifier la saturation', () => {
  const previous = hsl('#44546c');
  const steelBlue = hsl('#445d6c');
  assert.ok(steelBlue.hue <= previous.hue - 10, 'La teinte reste trop proche du bleu violacé');
  assert.ok(Math.abs(steelBlue.saturation - previous.saturation) <= .01);
  assert.ok(Math.abs(steelBlue.lightness - previous.lightness) <= .004);
  assert.ok(ratio('#ffffff', '#445d6c') >= 4.5);
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
