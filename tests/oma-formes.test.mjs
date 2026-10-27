import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

const root = new URL('../', import.meta.url);
function source(path) { return readFileSync(new URL(path, root), 'utf8'); }
const context = {};
runInNewContext(source('docs/formes-types/oma-trace.js'), context);
const OMA = context.OMATrace;

test('les neuf gabarits du comparateur sont synchronisés avec le calculateur', () => {
  const original = source('outils/epaisseur-verres/index.html');
  const block = original.match(/var SHAPES\s*=\s*(\{[\s\S]*?\n\s*\});/);
  assert.ok(block);
  const shapes = runInNewContext('(' + block[1] + ')');
  const snapshot = JSON.parse(source('docs/formes-types/hub-shapes.json')).shapes;
  assert.equal(snapshot.length, 9);
  for (const item of snapshot) {
    assert.ok(shapes[item.key], 'Gabarit absent : ' + item.key);
    assert.equal(item.A, shapes[item.key].defA);
    assert.equal(item.B, shapes[item.key].defB);
    assert.equal(item.label, shapes[item.key].label);
    assert.deepEqual(item.pts, JSON.parse(JSON.stringify(shapes[item.key].pts)));
  }
});

for(const [name,n] of [
  ['R1000_1.oma',1000],['R1000_2.oma',1000],['R1000_3.oma',1000],
  ['R360_1.oma',360],['R360_2.oma',360],['R360_3.oma',360],['STHKFMT.oma',360]
]){
  test(name + ' : deux tracés OMA valides, rayons intacts',()=>{
    const data=OMA.parse(source('docs/formes-types/references-oma/'+name));
    assert.equal(data.traces.length,2);
    for(const side of ['R','L']){
      const tracing=data.traces.find(x=>x.side===side);
      assert.ok(tracing,'Œil manquant '+side);
      assert.equal(tracing.radii.length,n);
      assert.equal(tracing.points.length,n);
      assert.ok(tracing.box[0] >= 20 && tracing.box[0] <= 80);
      assert.ok(tracing.box[1] >= 14 && tracing.box[1] <= 65);
      assert.ok(OMA.similarity(tracing.points,tracing.points)<1e-7);
    }
    // Les éléments d'une commande ne doivent pas être diffusés avec les exemples.
    assert.doesNotMatch(source('docs/formes-types/references-oma/'+name),/^(JOB|SPH|CYL|ADD|PATIENT|ACCN)=/m);
  });
}

test('refuser les formats non pris en charge plutôt que dessiner une fausse forme',()=>{
  assert.throws(()=>OMA.parse('TRCFMT=6;360;E;R;F\nR=1234\n'),/non compatible/);
  assert.throws(()=>OMA.parse('TRCFMT=1;360;E;R;F\nR=2000\n'),/incomplet/);
  assert.throws(()=>OMA.parse('TRCFMT=1;72;E;R;F\nR=abc\n'),/invalide/);
  assert.throws(()=>OMA.parse('TRCFMT=1;72;E;R;F\nR=100000\n'),/limites/);
});
test('les coordonnées normalisées respectent le boxing',()=>{
  const t=OMA.parse(source('docs/formes-types/references-oma/R360_1.oma')).traces[0];
  const normalized=OMA.normalized(t.points);
  const bb=OMA.bounds(normalized);
  assert.ok(Math.abs(bb.width-2)<1e-9);
  assert.ok(Math.abs(bb.height-2)<1e-9);
  assert.ok(normalized.every(x=>x.every(Number.isFinite)));
});
test('le laboratoire est disponible sans modification des formes du calculateur',()=>{
  const html=source('docs/formes-types/oma-comparateur.html');
  assert.match(html, /src="oma-trace\.js"/);
  assert.match(html, /hub-shapes\.json/);
  assert.match(html, /références/);
  assert.match(html, /id="overlay"/);
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:js|css)/);
});

test('le script interactif du comparateur est du JavaScript valide', () => {
  const page=source('docs/formes-types/oma-comparateur.html');
  const scripts=[...page.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)];
  assert.equal(scripts.length,1,'un script interactif inline attendu');
  assert.doesNotThrow(()=>new Script(scripts[0][1]));
  assert.match(page,/function closest\\(hub,side\\)/);
  assert.match(page,/function recommendClosest\\(\\)/);
});
