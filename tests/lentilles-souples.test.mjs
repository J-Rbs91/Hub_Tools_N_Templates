/* Garde-fous du noyau de prescription lentilles souples.
 *
 * Execution (aucune dependance, aucun package manager) :
 *     node tests/lentilles-souples.test.mjs
 *
 * Ces controles executent le vrai module (outils/lentilles-souples/noyau/prescription.js),
 * charge une fois par require (branche Node du double export) et une fois par
 * node:vm dans un contexte sans module/require (branche globalThis, celle que
 * verra un navigateur). Aucune formule n'est recopiee ici : chaque assertion
 * porte sur une propriete du calcul (reciprocite, invariance, egalite exacte),
 * jamais sur une valeur recalculee a la main avec la meme formule.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const cheminNoyau = join(racine, 'outils/lentilles-souples/noyau/prescription.js');
const cheminMoteurs = join(racine, 'outils/lentilles-souples/noyau/moteurs.js');

const echecs = [];
let passes = 0;

function verifier(nom, condition, detail) {
  if (condition) {
    passes += 1;
    return;
  }
  echecs.push(nom + (detail ? ' -> ' + detail : ''));
}

function presque(a, b, tolerance) {
  return Math.abs(a - b) <= (tolerance === undefined ? 1e-9 : tolerance);
}

function leve(fn) {
  try {
    fn();
    return false;
  } catch (e) {
    return true;
  }
}

/* ── Chargement, deux branches du double export ────────────────────────── */

const require = createRequire(import.meta.url);
const P = require(cheminNoyau);

verifier('module.exports expose les dix fonctions attendues', [
  'normalizeAxis', 'transposePrescription', 'normalizePrescription',
  'prescriptionToPowerVector', 'powerVectorToPrescription',
  'addPowerVectors', 'combinePrescriptions',
  'roundToStep', 'arrondiDetaille', 'estSurLaGrille',
].every((nom) => typeof P[nom] === 'function'));

const contexteNavigateur = vm.createContext({});
vm.runInContext(readFileSync(cheminNoyau, 'utf8'), contexteNavigateur, { filename: cheminNoyau });
const PNavigateur = contexteNavigateur.LentillesPrescription;

verifier(
  'le fichier s\'expose sur globalThis dans un contexte sans module/require (navigateur)',
  PNavigateur && typeof PNavigateur.normalizeAxis === 'function',
);
verifier(
  'la branche navigateur calcule comme la branche Node',
  PNavigateur && PNavigateur.normalizeAxis(361) === P.normalizeAxis(361),
);

const M = require(cheminMoteurs);

verifier('module.exports (moteurs) expose les dix fonctions attendues', [
  'compenserVertexSpherique', 'decompenserVertexSpherique',
  'compenserVertexSpheroCylindrique', 'decompenserVertexSpheroCylindrique',
  'axeReellementPorte', 'axeACommander', 'arrondirPrescription',
  'calculerMoteurA', 'calculerMoteurB',
].every((nom) => typeof M[nom] === 'function'));

const contexteNavigateurMoteurs = vm.createContext({});
vm.runInContext(readFileSync(cheminNoyau, 'utf8'), contexteNavigateurMoteurs, { filename: cheminNoyau });
vm.runInContext(readFileSync(cheminMoteurs, 'utf8'), contexteNavigateurMoteurs, { filename: cheminMoteurs });
const MNavigateur = contexteNavigateurMoteurs.LentillesMoteurs;

verifier(
  'moteurs.js s\'expose sur globalThis dans un contexte sans module/require (navigateur)',
  MNavigateur && typeof MNavigateur.calculerMoteurA === 'function',
);
verifier(
  'la branche navigateur de moteurs.js calcule comme la branche Node',
  MNavigateur && presque(
    MNavigateur.compenserVertexSpherique(-8, 12, 'vertex'),
    M.compenserVertexSpherique(-8, 12, 'vertex'),
  ),
);

/* ── normalizeAxis ──────────────────────────────────────────────────────── */

verifier('normalizeAxis(0) === 180', P.normalizeAxis(0) === 180);
verifier('normalizeAxis(360) === 180', P.normalizeAxis(360) === 180);
verifier('normalizeAxis(180) === 180 (inchange)', P.normalizeAxis(180) === 180);
verifier('normalizeAxis(1) === 1 (inchange)', P.normalizeAxis(1) === 1);
verifier('normalizeAxis(90) === 90 (inchange)', P.normalizeAxis(90) === 90);
verifier('normalizeAxis(181) === 1 (au-dessus du domaine)', P.normalizeAxis(181) === 1);
verifier('normalizeAxis(-1) === 179 (en-dessous du domaine)', P.normalizeAxis(-1) === 179);
verifier('normalizeAxis(720) === 180 (plusieurs tours)', P.normalizeAxis(720) === 180);
verifier('normalizeAxis(90.4) === 90 (arrondi)', P.normalizeAxis(90.4) === 90);
verifier('normalizeAxis(non numerique) leve', leve(() => P.normalizeAxis('x')));
verifier('normalizeAxis(NaN) leve', leve(() => P.normalizeAxis(NaN)));

/* ── transposePrescription : involution + invariance du vecteur ──────────── */

const CAS_TRANSPOSITION = [
  { sph: 0, cyl: 0, axe: null },
  { sph: -1.25, cyl: -0.75, axe: 60 },
  { sph: 2, cyl: -1.5, axe: 1 },
  { sph: -3, cyl: -2, axe: 180 },
];

for (const rx of CAS_TRANSPOSITION) {
  const t1 = P.transposePrescription(rx);
  const t2 = P.transposePrescription(t1);
  verifier(
    'transposePrescription est involutive pour axe=' + rx.axe,
    t2.sph === rx.sph && t2.cyl === rx.cyl && t2.axe === rx.axe,
    JSON.stringify({ depart: rx, apresDeuxFois: t2 }),
  );

  const vAvant = P.prescriptionToPowerVector(rx);
  const vApres = P.prescriptionToPowerVector(t1);
  verifier(
    'transposePrescription laisse le vecteur de puissance inchange pour axe=' + rx.axe,
    presque(vAvant.M, vApres.M) && presque(vAvant.J0, vApres.J0) && presque(vAvant.J45, vApres.J45),
    JSON.stringify({ vAvant, vApres }),
  );
}

/* ── normalizePrescription ─────────────────────────────────────────────── */

const positifTranspose = P.normalizePrescription({ sph: -1, cyl: 1.5, axe: 30 });
verifier(
  'normalizePrescription force le cylindre negatif',
  positifTranspose.cyl < 0,
  JSON.stringify(positifTranspose),
);
verifier(
  'normalizePrescription transpose correctement axe+90',
  positifTranspose.cyl === -1.5 && positifTranspose.sph === 0.5 && positifTranspose.axe === P.normalizeAxis(30 + 90),
  JSON.stringify(positifTranspose),
);

const dejaNegatif = P.normalizePrescription({ sph: -1, cyl: -1.5, axe: 30 });
verifier(
  'normalizePrescription laisse un cylindre deja negatif inchange',
  dejaNegatif.sph === -1 && dejaNegatif.cyl === -1.5 && dejaNegatif.axe === 30,
);

const spherePure = P.normalizePrescription({ sph: -2, cyl: 0, axe: 77 });
verifier(
  'normalizePrescription met axe a null quand le cylindre est nul, meme si un axe parasite est fourni',
  spherePure.cyl === 0 && spherePure.axe === null,
  JSON.stringify(spherePure),
);

verifier(
  'normalizePrescription refuse un cylindre non nul sans axe (null)',
  leve(() => P.normalizePrescription({ sph: -1, cyl: -0.5, axe: null })),
);
verifier(
  'normalizePrescription refuse un cylindre non nul sans axe (absent)',
  leve(() => P.normalizePrescription({ sph: -1, cyl: -0.5 })),
);
verifier(
  'normalizePrescription refuse un axe non numerique',
  leve(() => P.normalizePrescription({ sph: -1, cyl: -0.5, axe: 'x' })),
);

/* ── prescriptionToPowerVector / powerVectorToPrescription : round-trip exact ── */

for (const axe of [1, 45, 90, 135, 179, 180]) {
  const depart = { sph: -1.25, cyl: -2.5, axe };
  const vecteur = P.prescriptionToPowerVector(depart);
  const retour = P.powerVectorToPrescription(vecteur);
  verifier(
    'round-trip exact prescription -> vecteur -> prescription pour axe=' + axe,
    retour.sph === depart.sph && retour.cyl === depart.cyl && retour.axe === depart.axe,
    JSON.stringify({ depart, retour }),
  );
}

const spherePureVecteur = P.prescriptionToPowerVector({ sph: 1.5, cyl: 0, axe: null });
const spherePureRetour = P.powerVectorToPrescription(spherePureVecteur);
verifier(
  'round-trip d\'une prescription spherique pure (cyl=0) redonne axe=null',
  spherePureRetour.sph === 1.5 && spherePureRetour.cyl === 0 && spherePureRetour.axe === null,
  JSON.stringify(spherePureRetour),
);

verifier(
  'prescriptionToPowerVector refuse une sphere non numerique',
  leve(() => P.prescriptionToPowerVector({ sph: 'x', cyl: 0, axe: null })),
);
verifier(
  'powerVectorToPrescription refuse un vecteur incomplet',
  leve(() => P.powerVectorToPrescription({ M: 1, J0: 0 })),
);

/* ── addPowerVectors ───────────────────────────────────────────────────── */

const sommeVecteurs = P.addPowerVectors({ M: 1, J0: 2, J45: 3 }, { M: 4, J0: 5, J45: 6 });
verifier(
  'addPowerVectors additionne composante par composante',
  sommeVecteurs.M === 5 && sommeVecteurs.J0 === 7 && sommeVecteurs.J45 === 9,
  JSON.stringify(sommeVecteurs),
);

/* ── combinePrescriptions : axes identiques, orthogonaux, obliques ───────── */

const rxIdentique1 = { sph: -1, cyl: -1, axe: 100 };
const rxIdentique2 = { sph: -0.5, cyl: -0.5, axe: 100 };
const combineIdentique = P.combinePrescriptions(rxIdentique1, rxIdentique2);
verifier(
  'combinePrescriptions sur des axes identiques equivaut a additionner sph et cyl',
  presque(combineIdentique.sph, rxIdentique1.sph + rxIdentique2.sph)
    && presque(combineIdentique.cyl, rxIdentique1.cyl + rxIdentique2.cyl)
    && combineIdentique.axe === 100,
  JSON.stringify(combineIdentique),
);

const rxOrtho1 = { sph: -1, cyl: -2, axe: 90 };
const rxOrtho2 = { sph: -1, cyl: -2, axe: 180 };
const combineOrtho = P.combinePrescriptions(rxOrtho1, rxOrtho2);
verifier(
  'combinePrescriptions sur deux cylindres orthogonaux de meme amplitude annule le cylindre',
  presque(combineOrtho.sph, -4) && combineOrtho.cyl === 0 && combineOrtho.axe === null,
  JSON.stringify(combineOrtho),
);

const rxOblique = { sph: -0.75, cyl: -1.5, axe: 63 };
const vecteurOblique = P.prescriptionToPowerVector(rxOblique);
const oppose = { M: -vecteurOblique.M, J0: -vecteurOblique.J0, J45: -vecteurOblique.J45 };
const rxOpposeOblique = P.powerVectorToPrescription(oppose);
const combineOblique = P.combinePrescriptions(rxOblique, rxOpposeOblique);
verifier(
  'combinePrescriptions d\'une correction obliquee avec son opposee vectorielle redonne un plano',
  presque(combineOblique.sph, 0) && combineOblique.cyl === 0 && combineOblique.axe === null,
  JSON.stringify(combineOblique),
);

const combineSymA = P.combinePrescriptions(rxOrtho1, rxOblique);
const combineSymB = P.combinePrescriptions(rxOblique, rxOrtho1);
verifier(
  'combinePrescriptions est symetrique (l\'addition vectorielle commute)',
  presque(combineSymA.sph, combineSymB.sph) && presque(combineSymA.cyl, combineSymB.cyl),
  JSON.stringify({ combineSymA, combineSymB }),
);

const planoNeutre = { sph: 0, cyl: 0, axe: null };
const combineNeutre = P.combinePrescriptions(rxOblique, planoNeutre);
verifier(
  'combinePrescriptions avec un plano ne change pas la correction',
  presque(combineNeutre.sph, P.normalizePrescription(rxOblique).sph)
    && presque(combineNeutre.cyl, P.normalizePrescription(rxOblique).cyl),
  JSON.stringify(combineNeutre),
);

/* ── roundToStep / arrondiDetaille ─────────────────────────────────────── */

verifier('roundToStep(7.20, 0.25) === 7.25 (positif, pas de tie)', P.roundToStep(7.20, 0.25) === 7.25);
verifier('roundToStep(-7.20, 0.25) === -7.25 (negatif, pas de tie)', P.roundToStep(-7.20, 0.25) === -7.25);

const tiePositif = P.arrondiDetaille(7.125, 0.25);
verifier(
  'arrondiDetaille(7.125, 0.25) signale l\'egalite et arrondit a l\'ecart de zero',
  tiePositif.egalite === true && tiePositif.valeur === 7.25
    && tiePositif.voisinBas === 7 && tiePositif.voisinHaut === 7.25,
  JSON.stringify(tiePositif),
);

const tieNegatif = P.arrondiDetaille(-7.125, 0.25);
verifier(
  'arrondiDetaille(-7.125, 0.25) signale l\'egalite et arrondit a l\'ecart de zero (cote negatif)',
  tieNegatif.egalite === true && tieNegatif.valeur === -7.25
    && tieNegatif.voisinBas === -7.25 && tieNegatif.voisinHaut === -7,
  JSON.stringify(tieNegatif),
);

const pasDeTie = P.arrondiDetaille(7.25, 0.25);
verifier(
  'arrondiDetaille(7.25, 0.25) : valeur deja sur la grille, aucune egalite signalee',
  pasDeTie.egalite === false && pasDeTie.valeur === 7.25,
  JSON.stringify(pasDeTie),
);

const bruitFlottant = P.arrondiDetaille(0.1 + 0.2, 0.1);
verifier(
  'arrondiDetaille absorbe le bruit flottant de 0.1 + 0.2',
  bruitFlottant.valeur === 0.3,
  JSON.stringify({ entree: 0.1 + 0.2, resultat: bruitFlottant }),
);

verifier('arrondiDetaille refuse un pas nul', leve(() => P.arrondiDetaille(1, 0)));
verifier('arrondiDetaille refuse un pas negatif', leve(() => P.arrondiDetaille(1, -0.25)));
verifier('roundToStep refuse un pas nul', leve(() => P.roundToStep(1, 0)));

/* ── estSurLaGrille ────────────────────────────────────────────────────── */

verifier('estSurLaGrille(7.25, 0.25) === true', P.estSurLaGrille(7.25, 0.25) === true);
verifier('estSurLaGrille(7.30, 0.25) === false', P.estSurLaGrille(7.30, 0.25) === false);
verifier(
  'estSurLaGrille detecte le bruit flottant de 0.1 + 0.2 sur le pas 0.1',
  P.estSurLaGrille(0.1 + 0.2, 0.1) === true,
);
verifier(
  'estSurLaGrille avec une origine non nulle',
  P.estSurLaGrille(0.60, 0.25, 0.10) === true && P.estSurLaGrille(0.60, 0.25, 0.05) === false,
);
verifier('estSurLaGrille refuse un pas nul', leve(() => P.estSurLaGrille(1, 0)));
verifier('estSurLaGrille refuse un pas negatif', leve(() => P.estSurLaGrille(1, -0.25)));

/* ── Moteur A / Moteur B (outils/lentilles-souples/noyau/moteurs.js) ────── */

/* -- compenserVertexSpherique / decompenserVertexSpherique -- */

verifier(
  'vertex 0 laisse la puissance inchangee',
  M.compenserVertexSpherique(-5.5, 0, 'vertex') === -5.5,
);
verifier(
  'vertex a faible puissance : compensation quasi nulle',
  presque(M.compenserVertexSpherique(-0.25, 12, 'vertex'), -0.25, 1e-3),
);
verifier(
  'sphere negative de forte puissance devient moins negative au plan corneen (exemple de reference -8.00 D a 12 mm)',
  presque(M.compenserVertexSpherique(-8, 12, 'vertex'), -7.2993, 1e-3)
    && M.compenserVertexSpherique(-8, 12, 'vertex') > -8,
);
verifier(
  'sphere positive de forte puissance devient plus positive au plan corneen (exemple de reference +8.00 D a 12 mm)',
  presque(M.compenserVertexSpherique(8, 12, 'vertex'), 8.8496, 1e-3)
    && M.compenserVertexSpherique(8, 12, 'vertex') > 8,
);
verifier(
  'vertex standard (12 mm) sur une puissance moderee reste plausible',
  presque(M.compenserVertexSpherique(-3, 12, 'vertex'), -3 / (1 - 0.012 * -3)),
);

for (const [sph, distanceMm] of [[-8, 12], [8, 12], [-0.25, 8], [4.5, 16], [-12, 20]]) {
  const compense = M.compenserVertexSpherique(sph, distanceMm, 'vertex');
  const retour = M.decompenserVertexSpherique(compense, distanceMm, 'vertex');
  verifier(
    'compensation aller puis retour (spherique, sph=' + sph + ', d=' + distanceMm + 'mm) redonne la valeur de depart a moins de 0.001 D',
    presque(retour, sph, 1e-3),
    JSON.stringify({ sph, distanceMm, compense, retour }),
  );
}

verifier(
  'compenserVertexSpherique refuse une distance negative',
  leve(() => M.compenserVertexSpherique(-5, -3, 'vertex')),
);
verifier(
  'compenserVertexSpherique refuse une distance aberrante',
  leve(() => M.compenserVertexSpherique(-5, 500, 'vertex')),
);
verifier(
  'compenserVertexSpherique refuse une distance non numerique',
  leve(() => M.compenserVertexSpherique(-5, 'x', 'vertex')) && leve(() => M.compenserVertexSpherique(-5, undefined, 'vertex')),
);

/* -- compenserVertexSpheroCylindrique -- */

const sphCylNul = M.compenserVertexSpheroCylindrique({ sph: -4, cyl: 0, axe: null }, 12, 'vertex');
verifier(
  'sphero-cylindrique a cylindre nul equivaut au cas spherique',
  presque(sphCylNul.sph, M.compenserVertexSpherique(-4, 12, 'vertex')) && sphCylNul.cyl === 0 && sphCylNul.axe === null,
  JSON.stringify(sphCylNul),
);

const deuxMeridiensEleves = M.compenserVertexSpheroCylindrique({ sph: -1, cyl: -6, axe: 45 }, 12, 'vertex');
verifier(
  'sphero-cylindrique a deux meridiens eleves compense chaque meridien separement (pas seulement la sphere)',
  presque(deuxMeridiensEleves.sph, M.compenserVertexSpherique(-1, 12, 'vertex'))
    && presque(deuxMeridiensEleves.sph + deuxMeridiensEleves.cyl, M.compenserVertexSpherique(-1 + -6, 12, 'vertex'))
    && deuxMeridiensEleves.axe === 45,
  JSON.stringify(deuxMeridiensEleves),
);

const correctionMixte = M.compenserVertexSpheroCylindrique({ sph: 2, cyl: -3, axe: 170 }, 12, 'vertex');
verifier(
  'sphero-cylindrique en correction mixte (sph positive, cyl negatif) reconduit l\'axe inchange',
  correctionMixte.axe === 170,
  JSON.stringify(correctionMixte),
);
verifier(
  'sphero-cylindrique ne compense pas seulement la sphere : le cylindre change avec la distance vertex',
  M.compenserVertexSpheroCylindrique({ sph: -1, cyl: -6, axe: 45 }, 12, 'vertex').cyl !== -6,
);

for (const rx of [{ sph: -1, cyl: -6, axe: 45 }, { sph: 2, cyl: -3, axe: 170 }, { sph: -8, cyl: -1, axe: 90 }]) {
  const compense = M.compenserVertexSpheroCylindrique(rx, 12, 'vertex');
  const retour = M.decompenserVertexSpheroCylindrique(compense, 12, 'vertex');
  verifier(
    'compensation aller puis retour (sphero-cylindrique, axe=' + rx.axe + ') redonne la valeur de depart a moins de 0.001 D',
    presque(retour.sph, rx.sph, 1e-3) && presque(retour.cyl, rx.cyl, 1e-3) && retour.axe === rx.axe,
    JSON.stringify({ rx, compense, retour }),
  );
}

/* -- axeReellementPorte / axeACommander : reciprocite de la rotation -- */

for (const sens of ['gauche', 'droite']) {
  for (const rotation of [0, 8, 25]) {
    const porte = M.axeReellementPorte(60, rotation, sens);
    const commande = M.axeACommander(porte, rotation, sens);
    verifier(
      'axeACommander(axeReellementPorte(axe, r, ' + sens + '), r, ' + sens + ') redonne l\'axe de depart (r=' + rotation + ')',
      commande === 60,
      JSON.stringify({ sens, rotation, porte, commande }),
    );
  }
}

verifier(
  'rotation nulle ne modifie pas l\'axe',
  M.axeReellementPorte(75, 0, 'gauche') === 75 && M.axeACommander(75, 0, 'droite') === 75,
);
verifier(
  'axeReellementPorte enveloppe correctement autour de 180/0',
  M.axeReellementPorte(5, 10, 'gauche') === P.normalizeAxis(5 - 10),
);
verifier(
  'axeReellementPorte refuse un sens inconnu',
  leve(() => M.axeReellementPorte(60, 10, 'haut')),
);

/* -- calculerMoteurA -- */

const moteurAVertexNul = M.calculerMoteurA({ sph: -3.5, cyl: -1, axe: 90, vertexMm: 0 });
verifier(
  'moteurA : vertex nul laisse la correction inchangee',
  moteurAVertexNul.problemes.length === 0
    && moteurAVertexNul.theorique.sph === -3.5 && moteurAVertexNul.theorique.cyl === -1 && moteurAVertexNul.theorique.axe === 90,
  JSON.stringify(moteurAVertexNul),
);

const moteurASphereSeule = M.calculerMoteurA({ sph: -6, cyl: 0, axe: null, vertexMm: 12 });
verifier(
  'moteurA : correction spherique, la theorique et la cible arrondie coexistent sans que la seconde efface la premiere',
  presque(moteurASphereSeule.theorique.sph, -6 / (1 - 0.012 * -6))
    && moteurASphereSeule.cible.sph === P.roundToStep(moteurASphereSeule.theorique.sph, 0.25)
    && moteurASphereSeule.theorique.sph !== moteurASphereSeule.cible.sph,
  JSON.stringify(moteurASphereSeule),
);

const moteurASpheroCyl = M.calculerMoteurA({ sph: -1, cyl: -6, axe: 45, vertexMm: 12 });
verifier(
  'moteurA : sphero-cylindrique, les deux meridiens sont compenses separement et l\'axe est reconduit',
  moteurASpheroCyl.problemes.length === 0
    && moteurASpheroCyl.theorique.axe === 45
    && moteurASpheroCyl.theorique.cyl !== -6,
  JSON.stringify(moteurASpheroCyl),
);

for (const vertexMm of [-5, 500, NaN, 'x', undefined]) {
  const resultat = M.calculerMoteurA({ sph: -3, cyl: 0, axe: null, vertexMm });
  verifier(
    'moteurA : vertex invalide (' + String(vertexMm) + ') produit un probleme identifie et aucune valeur',
    resultat.theorique === null && resultat.cible === null && resultat.problemes.length === 1 && resultat.problemes[0].gravite === 'erreur',
    JSON.stringify(resultat),
  );
}
verifier(
  'moteurA : les codes de probleme distinguent negatif, aberrant et non numerique',
  M.calculerMoteurA({ sph: -3, cyl: 0, axe: null, vertexMm: -5 }).problemes[0].code === 'DISTANCE_NEGATIVE'
    && M.calculerMoteurA({ sph: -3, cyl: 0, axe: null, vertexMm: 500 }).problemes[0].code === 'DISTANCE_ABERRANTE'
    && M.calculerMoteurA({ sph: -3, cyl: 0, axe: null, vertexMm: 'x' }).problemes[0].code === 'DISTANCE_NON_NUMERIQUE',
);

/* -- calculerMoteurB -- */

const rotationNulle = M.calculerMoteurB({
  lentille: { sph: -2, cyl: -1, axe: 90 },
  surrefraction: { sph: 0, cyl: 0, axe: null },
  distanceSurrefractionMm: 0,
  rotation: { valeur: 0, sens: 'gauche', stable: true },
});
verifier(
  'moteurB : rotation nulle et surrefraction nulle redonnent la lentille portee',
  rotationNulle.problemes.length === 0
    && rotationNulle.cible.sph === -2 && rotationNulle.cible.cyl === -1 && rotationNulle.cible.axe === 90,
  JSON.stringify(rotationNulle),
);

for (const sens of ['gauche', 'droite']) {
  const rotationObservee = M.calculerMoteurB({
    lentille: { sph: -2, cyl: -1, axe: 90 },
    surrefraction: { sph: 0, cyl: 0, axe: null },
    distanceSurrefractionMm: 0,
    rotation: { valeur: 12, sens, stable: true },
  });
  verifier(
    'moteurB : rotation observee (' + sens + ') avec surrefraction nulle redonne la lentille portee',
    rotationObservee.problemes.length === 0
      && rotationObservee.cible.sph === -2 && rotationObservee.cible.cyl === -1 && rotationObservee.cible.axe === 90,
    JSON.stringify(rotationObservee),
  );
}

const distinctionDistances = M.calculerMoteurB({
  lentille: { sph: -2, cyl: 0, axe: null },
  surrefraction: { sph: -0.5, cyl: 0, axe: null },
  distanceSurrefractionMm: 12,
  rotation: { valeur: 0, sens: 'gauche', stable: true },
});
const memeCalculVertexA = M.calculerMoteurA({ sph: -2, cyl: 0, axe: null, vertexMm: 12 });
verifier(
  'moteurB : la distance de surrefraction est un parametre distinct de la distance vertex du moteur A (memes 12 mm, resultats differents car les entrees different)',
  distinctionDistances.theorique.sph !== memeCalculVertexA.theorique.sph,
  JSON.stringify({ distinctionDistances, memeCalculVertexA }),
);

const surrefractionAxeDifferent = M.calculerMoteurB({
  lentille: { sph: -2, cyl: -2, axe: 90 },
  surrefraction: { sph: -0.5, cyl: -1, axe: 30 },
  distanceSurrefractionMm: 0,
  rotation: { valeur: 0, sens: 'gauche', stable: true },
});
const additionNaive = { sph: -2 + -0.5, cyl: -2 + -1 };
verifier(
  'moteurB : une surrefraction sphero-cylindrique d\'axe different est combinee par vecteurs de puissance, jamais par addition composante a composante',
  !presque(surrefractionAxeDifferent.theorique.cyl, additionNaive.cyl, 1e-6)
    || !presque(surrefractionAxeDifferent.theorique.sph, additionNaive.sph, 1e-6),
  JSON.stringify({ surrefractionAxeDifferent, additionNaive }),
);
verifier(
  'moteurB : la combinaison ci-dessus correspond bien a combinePrescriptions du noyau (meme code, pas une formule reecrite)',
  presque(
    surrefractionAxeDifferent.theorique.sph,
    P.combinePrescriptions({ sph: -2, cyl: -2, axe: 90 }, { sph: -0.5, cyl: -1, axe: 30 }).sph,
  ),
);

const rotationInstable = M.calculerMoteurB({
  lentille: { sph: -2, cyl: -1, axe: 90 },
  surrefraction: { sph: 0, cyl: 0, axe: null },
  distanceSurrefractionMm: 0,
  rotation: { valeur: 12, sens: 'gauche', stable: false },
});
verifier(
  'moteurB : une rotation declaree instable est signalee sans supprimer la valeur calculee',
  rotationInstable.cible !== null
    && rotationInstable.problemes.some((p) => p.code === 'ROTATION_INSTABLE' && p.gravite === 'avertissement'),
  JSON.stringify(rotationInstable),
);

for (const distanceSurrefractionMm of [-5, 500, NaN]) {
  const resultat = M.calculerMoteurB({
    lentille: { sph: -2, cyl: 0, axe: null },
    surrefraction: { sph: 0, cyl: 0, axe: null },
    distanceSurrefractionMm,
    rotation: { valeur: 0, sens: 'gauche', stable: true },
  });
  verifier(
    'moteurB : distance de surrefraction invalide (' + String(distanceSurrefractionMm) + ') produit un probleme identifie et aucune valeur',
    resultat.theorique === null && resultat.cible === null && resultat.problemes.length === 1 && resultat.problemes[0].gravite === 'erreur',
    JSON.stringify(resultat),
  );
}

/* ── Bilan ─────────────────────────────────────────────────────────────── */

if (echecs.length > 0) {
  console.error(`${echecs.length} echec(s) sur ${passes + echecs.length} controle(s) :`);
  for (const echec of echecs) {
    console.error('  - ' + echec);
  }
  process.exitCode = 1;
} else {
  console.log(`${passes} controle(s) passe(s), 0 echec.`);
}
