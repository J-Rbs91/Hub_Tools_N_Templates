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
