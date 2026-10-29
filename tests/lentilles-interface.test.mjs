import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('outils/lentilles-souples/index.html', 'utf8');
const css = readFileSync('outils/lentilles-souples/interface.css', 'utf8');

function ids() {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
}

test('une identité dédiée remplace les styles historiques en cascade', () => {
  assert.match(html, /<style>\/\* Styles métier dédiés dans interface\.css\. \*\/<\/style>/);
  const theme = html.indexOf('href="../../assets/css/theme-bleu-gris.css"');
  const interfaceStyle = html.indexOf('href="./interface.css"');
  assert.ok(theme > -1 && interfaceStyle > theme);
  assert.doesNotMatch(html, /--blue:#1F6FB2|--blue:#425d4f/);
  assert.match(css, /--lentilles-accent:\s*var\(--blue/);
  assert.match(css, /\.sheet\s*\{/);
  assert.match(css, /\.oeils\s*\{/);
  assert.match(css, /\.onglets button\[aria-selected="true"\]/);
});

test('trois modules et commandes métier toujours présents', () => {
  for (const [tab, panel] of [['ong-a', 'bloc-a'], ['ong-b', 'bloc-b'], ['ong-c', 'bloc-c']]) {
    assert.match(html, new RegExp('id="' + tab + '"[^>]*aria-controls="' + panel + '"'));
    assert.match(html, new RegExp('id="' + panel + '"[^>]*role="tabpanel"'));
  }
  for (const id of ['a-calculer', 'b-calculer', 'c-chercher', 'a-suite', 'b-suite', 'c-suite',
    'a-od-out', 'a-og-out', 'b-od-out', 'b-og-out', 'c-od-out', 'c-og-out',
    'b-od-rot-sens', 'b-og-rot-sens', 'b-od-rot-stable', 'b-og-rot-stable',
    'verrou-form', 'verrou-code', 'reverrouiller', 'c-provenance', 'c-vider']) {
    assert.ok(ids().includes(id), 'Identifiant métier absent : ' + id);
  }
});

test('identifiants uniques et relations de saisie accessibles', () => {
  const list = ids();
  assert.equal(new Set(list).size, list.length);
  const references = [...html.matchAll(/\b(?:aria-labelledby|aria-controls|aria-describedby|for)="([^"]+)"/g)];
  for (const ref of references) {
    for (const target of ref[1].split(/\s+/)) assert.ok(list.includes(target), 'Cible absente : ' + target);
  }
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-invalid/);
});

test('statuts, avertissements, mobile et mouvement réduit préservés', () => {
  assert.match(html, /Catalogue de démonstration/);
  assert.match(html, /sans valeur de prescription/);
  for (const selector of ['.probleme-erreur', '.probleme-avert', '.bandeau-demo',
    '.resultat-c', '.val-tier-4', '.champ-case', '.ios-back']) {
    assert.ok(css.includes(selector), 'Style absent : ' + selector);
  }
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /html\.deverrouille #outil\s*\{\s*display:\s*block/);
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});
