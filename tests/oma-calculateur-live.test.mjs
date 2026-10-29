// Audit des contours OMA utilisés effectivement par le calculateur d'épaisseur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('outils/epaisseur-verres/index.html');
const dataJS = read('outils/epaisseur-verres/oma-shapes.js');
const ctx = { window: {} };
runInNewContext(dataJS,ctx);
const block = html.match(/var SHAPES\s*=\s*(\{[\s\S]*?\n\s*\});/);
assert.ok(block, 'SHAPES natif introuvable');
const original = runInNewContext('('+block[1]+')');
const names = Object.fromEntries(Object.entries(original).map(([k,v])=>[k,v.label]));
const keysMatch = html.match(/var SHAPE_KEYS = ([^;]+);/);
assert.ok(keysMatch);
const start = html.indexOf('/* OMA_INSTALL_START */');
const end = html.indexOf('/* OMA_INSTALL_END */');
assert.ok(start > 0 && end > start);
const frameStart = html.indexOf('function omaFrameRadius(');
const frameEnd = html.indexOf('/* ═══════════ CALCUL OPTIQUE',frameStart);
assert.ok(frameStart > 0 && frameEnd > frameStart);
runInNewContext('var SHAPES='+block[1]+'; var SHAPE_KEYS='+keysMatch[1]+';\n'+
  html.slice(start,end)+ '\n'+html.slice(frameStart,frameEnd),ctx);
const { SHAPES, SHAPE_KEYS } = ctx;
const mapping = {
  rectangle:'R360_1.oma', rectangledoux:'R360_2.oma',
  carree:'R1000_1.oma', pantos:'R1000_2.oma',
  papillon:'STHKFMT.oma', ronde:'R1000_3.oma',
  ovale:'R360_3.oma'
};
const toNative = x => JSON.parse(JSON.stringify(x));
function sourceRadii(file) {
  let side=null, count=0; const out={};
  for(const line of read('docs/formes-types/references-oma/'+file).split(/\r?\n/)){
    if(line.startsWith('TRCFMT=')){
      const parts=line.slice(7).split(';');
      count=Number(parts[1]); side=parts[3]; out[side]=[];
    } else if(side && line.startsWith('R=')){
      out[side].push(...line.slice(2).split(';').filter(Boolean).map(Number));
    }
  }
  assert.equal(out.R.length,count);
  assert.equal(out.L.length,count);
  return out;
}
function rayScan(cfg,phi,ax,by) {
  let best=0; const dx=Math.cos(phi),dy=Math.sin(phi),p=cfg.pts;
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length];
    const px=a[0]*ax,py=a[1]*by,ex=(b[0]-a[0])*ax,ey=(b[1]-a[1])*by;
    const det=ex*dy-dx*ey;
    if(Math.abs(det)<1e-10)continue;
    const t=(ex*py-px*ey)/det,u=(dx*py-dy*px)/det;
    if(t>0 && u>=-1e-5 && u<=1+1e-5 && t>best)best=t;
  }
  return best;
}
test('9 noms conservés, 7 OMA actifs et Pilote / Hexagone historiques',()=>{
  assert.deepEqual(toNative(SHAPE_KEYS), [
    'rectangle','rectangledoux','carree','pantos','papillon',
    'hexagone','ronde','pilote','ovale'
  ]);
  assert.equal(Object.keys(SHAPES).length,9);
  assert.equal(ctx.omaLoaded,true);
  assert.equal(Object.values(SHAPES).filter(s=>s.omaSource).length,7);
  assert.equal(Object.keys(ctx.window.OMA_SHAPE_DATA).length,7);
  assert.equal(ctx.window.OMA_SHAPE_DATA.pilote,undefined);
  assert.equal(SHAPES.hexagone.omaSource,undefined);
  for(const key of SHAPE_KEYS)assert.equal(SHAPES[key].label,names[key]);
  assert.deepEqual(toNative(SHAPES.hexagone.pts),toNative(original.hexagone.pts));
  assert.deepEqual(toNative(SHAPES.pilote),toNative(original.pilote));
});
for(const [key,file] of Object.entries(mapping)){
  test(key+' : correspondance à '+file+' et données natives des deux yeux',()=>{
    const raw=sourceRadii(file),meta=ctx.window.OMA_SHAPE_DATA[key],shape=SHAPES[key];
    assert.ok(meta && shape);
    assert.equal(shape.omaSource,file);
    assert.equal(shape.og.omaSource,file);
    // L’OMA R est bien l’œil droit, L l’œil gauche : seuls leurs
    // repères internes sont convertis (pas de permutation des fichiers).
    assert.equal(meta.od,raw.R.join(';'));
    assert.equal(meta.og,raw.L.join(';'));
    assert.equal(shape.pts.length,meta.n);
    assert.equal(shape.og.pts.length,meta.n);
    // Selon ISO 16284, 0° OMA de R = nasal, 0° de L = temporal.
    // Le moteur emploie temporal +X pour les DEUX yeux.
    // L'ordre OD est inversé pour garder le sens trigonométrique.
    assert.ok(shape.pts[meta.n-1][0] < -0.7, 'OD : premier rayon R coté nasal en repère canonique');
    assert.ok(shape.og.pts[0][0] > 0.7, 'OG : premier rayon L coté temporal en repère canonique');
    assert.ok(shape.pts[meta.n-1][1] < 0.001 && shape.pts[meta.n-1][1] > -0.001);
    assert.ok(shape.og.pts[0][1] < 0.001 && shape.og.pts[0][1] > -0.001);
    for(const cfg of [shape,shape.og]){
      assert.equal(cfg._omaPolar.length,meta.n);
      const xs=cfg.pts.map(p=>p[0]),ys=cfg.pts.map(p=>p[1]);
      assert.ok(Math.abs(Math.min(...xs)+1)<1e-10);
      assert.ok(Math.abs(Math.max(...xs)-1)<1e-10);
      assert.ok(Math.abs(Math.min(...ys)+1)<1e-10);
      assert.ok(Math.abs(Math.max(...ys)-1)<1e-10);
      for(let k=0;k<120;k++){
        const phi=2*Math.PI*k/120,ax=shape.defA/2,by=shape.defB/2;
        const optimized=ctx.frameRadius(cfg,phi,ax,by);
        const brute=rayScan(cfg,phi,ax,by);
        assert.ok(brute>0 && Math.abs(optimized-brute)<1e-6,
          file+' at '+k+' / '+(optimized-brute));
      }
    }
  });
}
test('Pilote : retour intégral à la forme d’avant GlassOn (54 x 48 mm, 72 points)',()=>{
  assert.equal(SHAPES.pilote.label,'Pilote');
  assert.equal(SHAPES.pilote.defA,54);
  assert.equal(SHAPES.pilote.defB,48);
  assert.equal(SHAPES.pilote.pts.length,72);
  assert.equal(SHAPES.pilote.omaSource,undefined);
  assert.deepEqual(toNative(SHAPES.pilote.pts),toNative(original.pilote.pts));
  assert.match(html,/if \(cfg\.omaSource && side === 'og'\) \{ cfg = cfg\.og; \}/);
  assert.match(html,/<script src="oma-shapes\.js"><\/script>/);
});
test('Le repère OMA est conforme ISO 16284 et aucun label OD/OG n’est permuté',()=>{
  assert.match(html,/x = \(side === 'od' \? -1 : 1\) \* raw\[i\] \* Math\.cos\(angle\)/);
  assert.match(html,/if \(side === 'od'\) \{ pts\.reverse\(\); \}/);
  assert.match(html,/var od = omaAsContour\(src\.od,'od',src\.n\)/);
  assert.match(html,/var og = omaAsContour\(src\.og,'og',src\.n\)/);
});
test('script métier inline du calculateur : syntaxe JavaScript valide',()=>{
  const openTag = '  <script>\n  (function () {';
  const closeTag = '  </script>';
  const start = html.indexOf(openTag);
  const end = html.indexOf(closeTag, start);
  assert.ok(start > 0 && end > start);
  const js = html.slice(start + '  <script>'.length, end);
  assert.doesNotThrow(()=>new Script(js));
});
