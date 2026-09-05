/* Noyau de prescription : conventions de cylindre et d'axe, arithmetique entiere
 * en milliemes de dioptrie, arrondi centralise avec detection d'egalite,
 * transposition, normalisation, vecteurs de puissance et combinaison.
 *
 * Aucune constante metier ne doit etre ecrite ailleurs que dans ce fichier.
 * Double export : globalThis.LentillesPrescription dans un navigateur,
 * module.exports sous Node. Aucune dependance, aucun build.
 */
(function (racine, fabrique) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique();
  } else {
    racine.LentillesPrescription = fabrique();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ECHELLE_MILLIEME = 1000;

  function versMilliemes(valeurEnDioptries) {
    return Math.round(valeurEnDioptries * ECHELLE_MILLIEME);
  }

  function depuisMilliemes(milliemes) {
    return milliemes / ECHELLE_MILLIEME;
  }

  function nombreFini(valeur, nom) {
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
      throw new Error('valeur numerique invalide pour ' + nom);
    }
    return valeur;
  }

  function axeOuNull(rx) {
    return rx.axe === null || rx.axe === undefined ? null : nombreFini(rx.axe, 'axe');
  }

  function pasMilliemeValide(pas) {
    var pasMillieme = versMilliemes(nombreFini(pas, 'pas'));
    if (pasMillieme <= 0) {
      throw new Error('le pas doit etre strictement positif');
    }
    return pasMillieme;
  }

  /* Domaine 1..180, 180 designant l'horizontale ; 0 et 360 sont renvoyes sur 180. */
  function normalizeAxis(axe) {
    var a = Math.round(nombreFini(axe, 'axe'));
    return (((a - 1) % 180 + 180) % 180) + 1;
  }

  /* Convention cylindre negatif <-> positif. Involutive par construction :
   * la sphere absorbe puis restitue le cylindre, l'axe pivote de 90 degres
   * dans un sens puis dans l'autre, ce qui revient a un tour complet. */
  function transposePrescription(rx) {
    var cyl = nombreFini(rx.cyl, 'cyl');
    var axeDepart = axeOuNull(rx);
    return {
      sph: nombreFini(rx.sph, 'sph') + cyl,
      cyl: -cyl,
      axe: axeDepart === null ? null : normalizeAxis(axeDepart + 90),
    };
  }

  /* Impose le cylindre negatif, met l'axe a null quand le cylindre est nul,
   * refuse un cylindre non nul sans axe plutot que d'en deviner un. */
  function normalizePrescription(rx) {
    var sph = nombreFini(rx.sph, 'sph');
    var cyl = nombreFini(rx.cyl, 'cyl');
    var axeDepart = axeOuNull(rx);

    if (cyl !== 0 && axeDepart === null) {
      throw new Error('cylindre non nul sans axe');
    }

    var resultat = { sph: sph, cyl: cyl, axe: cyl === 0 ? null : axeDepart };
    if (resultat.cyl > 0) {
      resultat = transposePrescription(resultat);
    }
    resultat.axe = resultat.cyl === 0 ? null : normalizeAxis(resultat.axe);
    return resultat;
  }

  /* M = S + C/2, J0 = -(C/2)cos(2a), J45 = -(C/2)sin(2a). Invariant sous
   * transposition, quelle que soit la convention de signe du cylindre. */
  function prescriptionToPowerVector(rx) {
    var sph = nombreFini(rx.sph, 'sph');
    var cyl = nombreFini(rx.cyl, 'cyl');
    var axeDepart = axeOuNull(rx);
    var axeRad = (axeDepart === null ? 0 : axeDepart) * Math.PI / 180;
    return {
      M: sph + cyl / 2,
      J0: -(cyl / 2) * Math.cos(2 * axeRad),
      J45: -(cyl / 2) * Math.sin(2 * axeRad),
    };
  }

  /* Retour par J = hypot(J0, J45), C = -2J (donc toujours <= 0), a = atan2(J45, J0)/2.
   * Le resultat est ramene a l'echelle du milliemes de dioptrie pour effacer le
   * bruit flottant introduit par cos/sin/hypot avant de composer sph et cyl. */
  function powerVectorToPrescription(vecteur) {
    var M = nombreFini(vecteur.M, 'M');
    var J0 = nombreFini(vecteur.J0, 'J0');
    var J45 = nombreFini(vecteur.J45, 'J45');
    var J = Math.hypot(J0, J45);
    var cylMillieme = versMilliemes(-2 * J);

    if (cylMillieme === 0) {
      return { sph: depuisMilliemes(versMilliemes(M)), cyl: 0, axe: null };
    }

    var cyl = depuisMilliemes(cylMillieme);
    var sphMillieme = versMilliemes(M - cyl / 2);
    var axeDeg = (Math.atan2(J45, J0) / 2) * 180 / Math.PI;
    return {
      sph: depuisMilliemes(sphMillieme),
      cyl: cyl,
      axe: normalizeAxis(axeDeg),
    };
  }

  function addPowerVectors(a, b) {
    return {
      M: nombreFini(a.M, 'M') + nombreFini(b.M, 'M'),
      J0: nombreFini(a.J0, 'J0') + nombreFini(b.J0, 'J0'),
      J45: nombreFini(a.J45, 'J45') + nombreFini(b.J45, 'J45'),
    };
  }

  /* Combine deux prescriptions par leurs vecteurs de puissance, jamais par
   * addition directe de sph/cyl : deux cylindres d'axes differents ne
   * s'additionnent pas terme a terme. */
  function combinePrescriptions(rx1, rx2) {
    var v1 = prescriptionToPowerVector(normalizePrescription(rx1));
    var v2 = prescriptionToPowerVector(normalizePrescription(rx2));
    return powerVectorToPrescription(addPowerVectors(v1, v2));
  }

  /* Arrondi a l'ecart de zero a egalite exacte ; les deux voisines et le
   * drapeau d'egalite permettent a l'interface de ne jamais choisir seule
   * a la place de l'opticien. Arithmetique entiere en milliemes de dioptrie :
   * aucun epsilon, aucune comparaison flottante naive. */
  function arrondiDetaille(valeur, pas) {
    var vMillieme = versMilliemes(nombreFini(valeur, 'valeur'));
    var pasMillieme = pasMilliemeValide(pas);

    var signe = vMillieme < 0 ? -1 : 1;
    var abs = Math.abs(vMillieme);
    var quotientBas = Math.floor(abs / pasMillieme);
    var resteBas = abs - quotientBas * pasMillieme;
    var resteHaut = pasMillieme - resteBas;

    var procheZero = signe * quotientBas * pasMillieme;
    var loinZero = signe * (quotientBas + 1) * pasMillieme;
    var egalite = resteBas === resteHaut;
    var choisi = egalite ? loinZero : (resteBas < resteHaut ? procheZero : loinZero);

    return {
      valeur: depuisMilliemes(choisi),
      voisinBas: depuisMilliemes(Math.min(procheZero, loinZero)),
      voisinHaut: depuisMilliemes(Math.max(procheZero, loinZero)),
      egalite: egalite,
    };
  }

  function roundToStep(valeur, pas) {
    return arrondiDetaille(valeur, pas).valeur;
  }

  /* Appartenance a la grille testee en entiers, jamais par un modulo flottant
   * ni par un epsilon metier : (mD(v) - mD(origine)) % mD(pas) === 0. */
  function estSurLaGrille(valeur, pas, origine) {
    var pasMillieme = pasMilliemeValide(pas);
    var vMillieme = versMilliemes(nombreFini(valeur, 'valeur'));
    var oMillieme = versMilliemes(nombreFini(origine === undefined ? 0 : origine, 'origine'));
    return (vMillieme - oMillieme) % pasMillieme === 0;
  }

  return {
    normalizeAxis: normalizeAxis,
    transposePrescription: transposePrescription,
    normalizePrescription: normalizePrescription,
    prescriptionToPowerVector: prescriptionToPowerVector,
    powerVectorToPrescription: powerVectorToPrescription,
    addPowerVectors: addPowerVectors,
    combinePrescriptions: combinePrescriptions,
    roundToStep: roundToStep,
    arrondiDetaille: arrondiDetaille,
    estSurLaGrille: estSurLaGrille,
  };
}));
