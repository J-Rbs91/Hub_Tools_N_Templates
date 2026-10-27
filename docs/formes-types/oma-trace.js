/* Laboratoire de références OMA, aucun envoi réseau vers un tiers. */
(function (root) {
  "use strict";
  const TAU = Math.PI * 2;
  function parse(text) {
    if (typeof text !== "string" || text.length > 1500000) throw new Error("Fichier OMA invalide ou trop volumineux (1,5 Mo maximum).");
    const metadata = {}, traces = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith(";")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const tag = line.slice(0, separator).trim().toUpperCase();
      const value = line.slice(separator + 1).trim();
      if (tag === "TRCFMT") {
        const parts = value.split(";");
        if (parts[0] !== "1" || parts[2] !== "E" || !["R", "L"].includes(parts[3])) {
          throw new Error("Tracé non compatible : seul le format OMA ASCII absolu (TRCFMT=1;N;E;R/L;F/P) est accepté.");
        }
        const count = Number(parts[1]);
        if (!Number.isInteger(count) || count < 72 || count > 5000) throw new Error("Nombre de rayons hors limites.");
        current = {side:parts[3],kind:parts[4]||"",expected:count,radii:[]};
        if (traces.some(t=>t.side===current.side)) throw new Error("Plusieurs tracés pour le même œil.");
        traces.push(current);
      } else if (tag === "R") {
        if (!current) throw new Error("Rayons R sans déclaration TRCFMT préalable.");
        for (const part of value.split(";")) {
          if (!/^\d+$/.test(part.trim())) throw new Error("Valeur de rayon invalide.");
          const radius = Number(part)/100;
          if (!Number.isFinite(radius) || radius < 5 || radius > 70) throw new Error("Rayon hors limites réalistes.");
          current.radii.push(radius);
          if (current.radii.length > current.expected) throw new Error("Trop de rayons pour ce tracé.");
        }
      } else if (["FMFR","FRAM","EYESIZ","HBOX","VBOX","DBL"].includes(tag)) {
        metadata[tag] = value.slice(0,100);
      }
    }
    if (!traces.length) throw new Error("Aucun tracé OMA pris en charge.");
    for (const t of traces) {
      if (t.radii.length !== t.expected) throw new Error("Tracé "+t.side+" incomplet : "+t.radii.length+"/"+t.expected+" rayons.");
      t.points = t.radii.map((r,i)=>[r*Math.cos(TAU*i/t.expected), r*Math.sin(TAU*i/t.expected)]);
      const bb = bounds(t.points);
      t.box = [bb.width,bb.height];
      if (bb.width < 20 || bb.width > 80 || bb.height < 14 || bb.height > 65) throw new Error("Boxing du tracé hors limites.");
    }
    return {metadata,traces};
  }
  function bounds(points) {
    if (!Array.isArray(points) || points.length < 3) throw new Error("Contour incomplet.");
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const width=maxX-minX,height=maxY-minY;
    if (!(width>0 && height>0)) throw new Error("Contour de dimension nulle.");
    return {minX,maxX,minY,maxY,width,height,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function normalized(points) {
    const b=bounds(points);
    return points.map(p=>[(p[0]-b.cx)*2/b.width,(p[1]-b.cy)*2/b.height]);
  }
  function asPolyline(points,side,reverseX=false) {
    const sign=(side==="R"?-1:1)*(reverseX?-1:1);
    return points.map(p=>[p[0]*sign,p[1]]);
  }
  function rayRadius(points,angle) {
    const dx=Math.cos(angle),dy=Math.sin(angle);let best=0;
    for (let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],ex=b[0]-a[0],ey=b[1]-a[1];
      const determinant=dx*ey-dy*ex;
      if(Math.abs(determinant)<1e-12)continue;
      const radius=(a[0]*ey-a[1]*ex)/determinant;
      const position=(a[0]*dy-a[1]*dx)/determinant;
      if(radius>0 && position>=-1e-8 && position<=1+1e-8 && radius>best)best=radius;
    }
    return best;
  }
  function similarity(hubPoints,omaPoints) {
    const a=normalized(hubPoints),b=normalized(omaPoints);
    let diff=0,mean=0,missing=0;
    for(let k=0;k<180;k++){
      const angle=TAU*k/180, r1=rayRadius(a,angle),r2=rayRadius(b,angle);
      if(!r1||!r2){missing++;continue;}
      diff+=Math.pow(r1-r2,2);mean+=r1;
    }
    if(missing)throw new Error("Contour non étoilé depuis le centre-boîte.");
    return Math.sqrt(diff/180)/(mean/180)*100;
  }
  root.OMATrace={parse,bounds,normalized,asPolyline,rayRadius,similarity};
})(typeof window==="undefined"?globalThis:window);
