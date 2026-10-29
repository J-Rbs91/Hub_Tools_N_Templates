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
  const sections = ['form-shape', 'form-monture', 'form-verre', 'form-measures', 'view-3d', 'profiles'];
  for (const id of sections) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'section absente ou dupliquée : ' + id);
    assert.ok(html.includes('href="#' + id + '"'), 'lien de navigation absent : ' + id);
  }
  const viewsAt = html.indexOf('id="profiles"');
  const visualsAt = html.indexOf('id="view-3d"');
  const outputsAt = html.indexOf('class="layout-col layout-col--results"');
  const summaryAt = html.indexOf('class="thickness-summary"');
  assert.ok(outputsAt < visualsAt && visualsAt < viewsAt && viewsAt < summaryAt,
    'la 3D doit précéder les vues, avec la synthèse dans la section analyse');
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
  const markup = html.slice(0, html.indexOf('<script src="oma-shapes.js">'));
  const allIds = [...markup.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length, 'identifiants HTML dupliqués');
  for (const id of ids) assert.ok(allIds.includes(id), 'contrôle métier absent : ' + id);
  assert.match(html, /aria-pressed.*currentShape/);
  assert.match(html, /class="advanced-panel" id="mount-settings"/);
  assert.match(html, /class="advanced-panel frame-customization" id="frame-customization"/);
  assert.match(html, /type="checkbox" id="btn-11"/);
  assert.match(html, /id="frame-options"/);
  assert.match(html, /class="thickness-summary"/);
  assert.match(html, /for="od-pd">½ écart pupillaire/);
  assert.match(html, /for="og-h">Hauteur/);
});

/* Interaction tests run the actual compact event handlers extracted from the
 * browser source. No fabricated implementations and no browser dependency. */
const logic = html.slice(html.indexOf('  <script>\n  (function'), html.lastIndexOf('</script>'));
function listenerSource(id, event) {
  const marker = "el('" + id + "').addEventListener('" + event + "', function () {";
  const start = logic.indexOf(marker);
  assert.ok(start >= 0, 'gestionnaire manquant : ' + id + '/' + event);
  const end = logic.indexOf('\n    });', start);
  assert.ok(end > start, 'fin de gestionnaire manquante : ' + id);
  return logic.slice(start, end + '\n    });'.length);
}
function functionSource(name) {
  const marker = 'function ' + name + '() {';
  const start = logic.indexOf(marker);
  assert.ok(start >= 0, 'fonction manquante : ' + name);
  const end = logic.indexOf('\n    }', start);
  assert.ok(end > start, 'fin de fonction manquante : ' + name);
  return logic.slice(start, end + '\n    }'.length);
}
function control(checked = false, value = '') {
  const handlers = {};
  return {
    checked, value, hidden: false, handlers,
    addEventListener(name, fn) { handlers[name] = fn; },
    fire(name) { assert.equal(typeof handlers[name], 'function'); handlers[name].call(this); }
  };
}

test('3D : la case Échelle 1:1 active et désactive le mode/règle', () => {
  const toggle = control(false);
  let rules = 0, refreshes = 0;
  const ctx = {
    scale11: false,
    renderer3d: { refresh() { refreshes++; } },
    updateRuler() { rules++; },
    el(id) { assert.equal(id, 'btn-11'); return toggle; }
  };
  runInNewContext(listenerSource('btn-11', 'change'), ctx);
  toggle.checked = true; toggle.fire('change');
  assert.equal(ctx.scale11, true);
  toggle.checked = false; toggle.fire('change');
  assert.equal(ctx.scale11, false);
  assert.equal(rules, 2);
  assert.equal(refreshes, 2);
});

test('3D : la monture pilote ses options et la légende du débordement', () => {
  const nodes = {
    'show-frame': control(true), 'show-overhang': control(false),
    'frame-options': control(), 'overhang-legend': control()
  };
  let refreshes = 0, comparisons = 0;
  const ctx = {
    showFrame: true, showOverhang: false,
    renderer3d: { refresh() { refreshes++; } },
    refreshComparison3D() { comparisons++; },
    el(id) { assert.ok(nodes[id], 'contrôle absent : ' + id); return nodes[id]; }
  };
  runInNewContext(functionSource('applyFrameOptVisibility'), ctx);
  runInNewContext(listenerSource('show-frame', 'change'), ctx);
  runInNewContext(listenerSource('show-overhang', 'change'), ctx);
  ctx.applyFrameOptVisibility();
  assert.equal(nodes['frame-options'].hidden, false);
  assert.equal(nodes['overhang-legend'].hidden, true);

  nodes['show-overhang'].checked = true;
  nodes['show-overhang'].fire('change');
  assert.equal(nodes['overhang-legend'].hidden, false);

  nodes['show-frame'].checked = false;
  nodes['show-frame'].fire('change');
  assert.equal(ctx.showFrame, false);
  assert.equal(nodes['frame-options'].hidden, true);
  assert.equal(nodes['overhang-legend'].hidden, true);
  // Revoir la monture : les choix précédents restent disponibles.
  nodes['show-frame'].checked = true;
  nodes['show-frame'].fire('change');
  assert.equal(nodes['frame-options'].hidden, false);
  assert.equal(nodes['show-overhang'].checked, true);
  assert.equal(nodes['overhang-legend'].hidden, false);
  assert.equal(refreshes, 3);
  assert.equal(comparisons, 3);
});

test('Mesures : Copier OD vers OG transporte correction ET centrage', () => {
  const names = ['sph','cyl','axe','pd','h'];
  const nodes = { 'copy-od-og': control() };
  names.forEach((name, index) => {
    nodes['od-' + name] = control(false, ['-3.50','-1.25','125','31.5','18'][index]);
    nodes['og-' + name] = control(false, 'inchange');
  });
  let computes = 0;
  const ctx = {
    el(id) { assert.ok(nodes[id], 'contrôle absent : ' + id); return nodes[id]; },
    compute() { computes++; }
  };
  runInNewContext(listenerSource('copy-od-og', 'click'), ctx);
  nodes['copy-od-og'].fire('click');
  names.forEach(name => assert.equal(nodes['og-' + name].value, nodes['od-' + name].value));
  assert.equal(computes, 1);
});
