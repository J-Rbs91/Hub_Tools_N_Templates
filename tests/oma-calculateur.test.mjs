// Contrôle de l'utilisation des tracés OMA originaux par le calculateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, createContext, runInContext, Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const load = path=>readFileSync(new URL(path,root),'utf8');
const html=load('outils/epaisseur-verres/index.html');
const start=html.indexOf('var SHAPES = {');
const init=html.indexOf("var currentShape = 'oma-r1000-1';",start);
const fastStart=html.indexOf('function omaRayon(',init);
const fastEnd=html.indexOf('/* ═══════════ CALCUL OPTIQUE',fastStart);
assert.ok(start>=0 && init>start && fastStart>init && fastEnd>fastStart);
const ctx=createContext({});
runInContext(html.slice(start,init)+html.slice(fastStart,fastEnd),ctx);
const json=x=>JSON.parse(JSON.stringify(x));
const sourceFiles=[
  ['R1000_1.oma','oma-r1000-1','Silhouette 1559',1000],
  ['R1000_2.oma','oma-r1000-2','Silhouette 1575',1000],
  ['R1000_3.oma','oma-r1000-3','Silhouette 7580',1000],
  ['R360_1.oma','oma-r360-1','R360_1',360],
  ['R360_2.oma','oma-r360-2','R360_2',360],
  ['R360_3.oma','oma-r360-3','R360_3',360],
  ['STHKFMT.oma','oma-sthkfmt','STHKFMT',360]
];

function parseRaw(file){
  const text=load('docs/formes-types/references-oma/'+file), out={};
  let side=null;
  for(const line of text.split(/\r?\n/)){
    if(line.startsWith('TRCFMT='))side=line.slice(7).split(';')[3];
    else if(side && line.startsWith('R=')){
      out[side]??=[];
      out[side].push(...line.slice(2).split(';').map(Number));
    }
  }
  return out;
}

function area(points){
  return points.reduce((sum,p,i)=>{
    const q=points[(i+1)%points.length];
    return sum+p[0]*q[1]-p[1]*q[0];
  },0)/2;
}
function box(points){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return [Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)];
}
function slowRadius(points,angle,ax,by){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  let best=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    const px=a[0]*ax,py=a[1]*by,ex=(b[0]-a[0])*ax,ey=(b[1]-a[1])*by;
    const det=ex*dy-dx*ey;
    if(Math.abs(det)<1e-12)continue;
    const t=(ex*py-px*ey)/det,s=(dx*py-dy*px)/det;
    if(t>0 && s>=-1e-4 && s<=1+1e-4 && t>best)best=t;
  }
  return best;
}
test('neuf noms historiques intacts et sept fichiers OMA supplémentaires',()=>{
  const expected=['Rectangle','Rectangle doux','Carrée','Pantos','Papillon','Hexagone','Ronde','Pilote','Ovale'];
  assert.deepEqual(json(ctx.SHAPE_KEYS.map(k=>ctx.SHAPES[k].label)),expected);
  assert.equal(ctx.OMA_SHAPE_KEYS.length,7);
  assert.equal(Object.keys(ctx.SHAPES).length,16);
  assert.equal(sourceFiles.length,7);
  assert.ok(html.includes("var currentShape = 'oma-r1000-1'"));
  assert.ok(html.includes('OMA_SHAPE_KEYS.concat(SHAPE_KEYS'));
  assert.ok(html.includes("if (cfg.oma && side === 'og') { cfg = cfg.og; }"));
});
for(const [file,key,label,n] of sourceFiles){
  test(file+': rayons d’origine et OD/OG consommés à pleine résolution',()=>{
    const raw=parseRaw(file);
    const cfg=ctx.SHAPES[key],meta=ctx.OMA_TRACES.find(x=>x.key===key);
    assert.ok(cfg && cfg.oma && cfg.og && cfg._omaPolar && cfg.og._omaPolar);
    assert.equal(cfg.label,label);
    assert.equal(meta.file,file);
    assert.equal(meta.n,n);
    assert.deepEqual(meta.od.split(';').map(Number),raw.R);
    assert.deepEqual(meta.og.split(';').map(Number),raw.L);
    for(const part of [cfg,cfg.og]){
      assert.equal(part.pts.length,n);
      assert.ok(area(part.pts)>0,'contour trigonométrique requis');
      const [xmin,xmax,ymin,ymax]=box(part.pts);
      assert.ok(Math.abs(xmin+1)<1e-10);
      assert.ok(Math.abs(xmax-1)<1e-10);
      assert.ok(Math.abs(ymin+1)<1e-10);
      assert.ok(Math.abs(ymax-1)<1e-10);
      assert.ok(part._omaPolar.every((p,i,a)=>i===0||a[i-1].angle<=p.angle));
      const sorted=part._omaPolar;
      assert.ok(sorted.every((p,i)=> (p.index+1)%n===sorted[(i+1)%n].index),
        'les arêtes utilisées par l’optimisation doivent être celles du contour original');
      assert.ok(part.defA>28&&part.defA<70 && part.defB>14&&part.defB<60);
    }
    assert.ok(Math.abs(cfg.defA-cfg.og.defA)<.011);
    assert.ok(Math.abs(cfg.defB-cfg.og.defB)<.011);
    for(const part of [cfg,cfg.og]){
      for(let k=0;k<180;k++){
        const phi=2*Math.PI*k/180,ax=part.defA/2,by=part.defB/2;
        const fast=ctx.frameRadius(part,phi,ax,by),slow=slowRadius(part.pts,phi,ax,by);
        assert.ok(Math.abs(fast-slow)<1e-6,
          file+' rayon '+k+' différence '+(fast-slow));
      }
    }
  });
}
test('les gabarits historiques ne sont pas retournés à 180°',()=>{
  const raw=load('docs/formes-types/hub-shapes.json');
  const snap=JSON.parse(raw).shapes;
  for(const old of snap){
    const current=ctx.SHAPES[old.key];
    assert.equal(current.label,old.label);
    assert.equal(current.defA,old.A);
    assert.equal(current.defB,old.B);
    assert.deepEqual(json(current.pts),old.pts);
  }
});
test('les scripts inline du calculateur sont valides',()=>{
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>=1);
  for(const script of scripts)assert.doesNotThrow(()=>new Script(script[1]));
});
