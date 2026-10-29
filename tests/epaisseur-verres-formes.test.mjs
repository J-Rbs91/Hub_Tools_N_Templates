// Vérification des gabarits natifs du calculateur d'épaisseur.
// Exécution locale : node --test tests/epaisseur-verres-formes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../outils/epaisseur-verres/index.html', import.meta.url), 'utf8');
const match = html.match(/var SHAPES\s*=\s*(\{[\s\S]*?\n\s*\});/);
assert.ok(match, 'Objet SHAPES absent du calculateur');
const shapes = runInNewContext('(' + match[1] + ')');

function signedTurn(prev, curr, next) {
  return (curr[0] - prev[0]) * (next[1] - curr[1])
    - (curr[1] - prev[1]) * (next[0] - curr[0]);
}

function signedArea(points) {
  return points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p[0] * next[1] - p[1] * next[0];
  }, 0) / 2;
}

test('les neuf gabarits natifs sont présents', () => {
  assert.equal(Object.keys(shapes).length, 9);
});

for (const [key, shape] of Object.entries(shapes)) {
  test(`gabarit ${key} : contour convexe, fermé et boxing inchangé`, () => {
    assert.equal(shape.pts.length, 72, '72 points attendus');
    assert.ok(shape.defA > 0 && shape.defB > 0);
    const points = shape.pts.map(([x, y]) => {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      assert.ok(Math.abs(x) <= 1.000001 && Math.abs(y) <= 1.000001);
      return [x * shape.defA / 2, y * shape.defB / 2];
    });
    assert.ok(signedArea(points) > 0, 'ordre trigonométrique requis');
    for (let i = 0; i < points.length; i++) {
      const turn = signedTurn(
        points[(i + points.length - 1) % points.length],
        points[i],
        points[(i + 1) % points.length]
      );
      // Tolérance purement numérique (mm²), aucune concavité géométrique permise.
      assert.ok(turn >= -1e-8, `concavité à l'index ${i} (${turn} mm²)`);
    }
    const xs = shape.pts.map(p => p[0]), ys = shape.pts.map(p => p[1]);
    assert.ok(Math.min(...xs) <= -0.99 && Math.max(...xs) >= 0.99);
    assert.ok(Math.min(...ys) <= -0.99 && Math.max(...ys) >= 0.99);
  });
}

test('parcours UXER : les sept sections métiers restent navigables', () => {
  const sections = ['form-shape', 'form-monture', 'form-verre', 'form-prescription', 'results', 'view-3d', 'profiles'];
  for (const id of sections) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'section absente ou dupliquée : ' + id);
    assert.ok(html.includes('href="#' + id + '"'), 'lien de navigation absent : ' + id);
  }
  const resultsAt = html.indexOf('id="results"');
  const visualsAt = html.indexOf('id="view-3d"');
  const outputsAt = html.indexOf('class="layout-col layout-col--results"');
  assert.ok(outputsAt < resultsAt && resultsAt < visualsAt, 'résultats attendus avant la 3D dans la colonne de droite');
});

test('parcours UXER : champs OD/OG, monture et assistant photo préservés', () => {
  const ids = [
    'shapes','coteA','coteB','coteD','cambrure','galbe','m-ep','show-frame',
    'indice','base-speciale','base','cerclage',
    ...['od', 'og'].flatMap(eye => ['sph', 'cyl', 'axe', 'pd', 'h'].map(field => eye + '-' + field)),
    'copy-od-og','res-body','merid','notes','viewport','m-bevel-auto',
    'm-bevel-od','m-bevel-og','bevel-unlock','show-overhang','btn-reset-vue',
    'btn-coupe','btn-11','cal-reset','compare-save','compare-clear',
    'profiles-carousel','profile-face','profile-temporal','profile-top','profile-bottom',
    'photo-modal','pm-input','pm-canvas','pm-side-od','pm-side-og','pm-mirror',
    'pm-rot','pm-sens','pm-a','pm-b','pm-name','pm-prev','pm-next'
  ];
  const allIds = [...html.matchAll(/\\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length, 'identifiants HTML dupliqués');
  for (const id of ids) assert.ok(allIds.includes(id), 'contrôle métier absent : ' + id);
  assert.match(html, /aria-pressed.*currentShape/);
  assert.match(html, /class="advanced-panel" id="mount-settings"/);
  assert.match(html, /data-label="½ écart"/);
});
