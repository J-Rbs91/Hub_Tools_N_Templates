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
