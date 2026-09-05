/* Moteur A (conversion lunettes -> plan corneen -> cible lentille) et moteur B
 * (surrefraction, rotation torique). S'appuie sur le noyau de prescription
 * (outils/lentilles-souples/noyau/prescription.js) pour toute convention de
 * cylindre/axe, l'arithmetique d'arrondi et les vecteurs de puissance : aucune
 * formule de ce fichier ne duplique une constante ou une convention deja
 * definie la-bas.
 *
 * Double export : globalThis.LentillesMoteurs dans un navigateur,
 * module.exports sous Node, sur le meme modele que prescription.js.
 *
 * Aucune fonction ici ne produit silencieusement une valeur douteuse : une
 * entree hors domaine (distance, sens de rotation, prescription incoherente)
 * est signalee dans la liste "problemes" du resultat, jamais transformee en
 * chiffre.
 */
(function (racine, fabrique) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique(require('./prescription.js'));
  } else {
    racine.LentillesMoteurs = fabrique(racine.LentillesPrescription);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  'use strict';

  var PAS_CIBLE_DEFAUT = 0.25;

  /* Domaine de plausibilite d'une distance oeil/verre saisie en mm. Ce n'est
   * pas une recommandation clinique (l'outil n'en formule pas) : au-dela,
   * la valeur est presque certainement une erreur de saisie (ex. confusion
   * mm/cm) plutot qu'un cas clinique reel, donc rejetee comme aberrante. */
  var DISTANCE_MM_MAX = 20;

  function nombreFiniLocal(valeur, nom) {
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
      throw new Error('valeur numerique invalide pour ' + nom);
    }
    return valeur;
  }

  function ErreurMetier(code, message) {
    var erreur = new Error(message);
    erreur.code = code;
    return erreur;
  }

  /* Detection non destructive : renvoie un probleme ou null, jamais ne leve.
   * Utilisee a la fois pour le controle prealable dans les moteurs et,
   * enveloppee par validerDistanceMm, pour les fonctions de compensation
   * appelees directement (tests unitaires bas niveau). */
  function detecterProblemeDistance(distanceMm, parametre) {
    if (typeof distanceMm !== 'number' || !Number.isFinite(distanceMm)) {
      return {
        code: 'DISTANCE_NON_NUMERIQUE',
        gravite: 'erreur',
        parametre: parametre,
        message: parametre + ' doit etre un nombre fini',
      };
    }
    if (distanceMm < 0) {
      return {
        code: 'DISTANCE_NEGATIVE',
        gravite: 'erreur',
        parametre: parametre,
        message: parametre + ' ne peut pas etre negative',
      };
    }
    if (distanceMm > DISTANCE_MM_MAX) {
      return {
        code: 'DISTANCE_ABERRANTE',
        gravite: 'erreur',
        parametre: parametre,
        message: parametre + ' hors du domaine plausible (0 a ' + DISTANCE_MM_MAX + ' mm)',
      };
    }
    return null;
  }

  function validerDistanceMm(distanceMm, parametre) {
    var probleme = detecterProblemeDistance(distanceMm, parametre);
    if (probleme) {
      throw ErreurMetier(probleme.code, probleme.message);
    }
    return distanceMm;
  }

  /* F'' = F / (1 - d*F), d positif quand on rapproche le plan correcteur de
   * l'oeil (lunettes -> lentille). sensSigne=-1 applique la transformation
   * reciproque (lentille -> lunettes) avec la meme distance positive, ce qui
   * evite d'avoir a faire circuler une distance negative comme entree valide
   * quelque part dans l'API. */
  function appliquerVertex(puissanceD, distanceM, sensSigne) {
    var puissance = nombreFiniLocal(puissanceD, 'puissance');
    var resultat = puissance / (1 - sensSigne * distanceM * puissance);
    if (!Number.isFinite(resultat)) {
      throw ErreurMetier(
        'CALCUL_NON_INTERPRETABLE',
        'le plan corrige n\'est pas calculable pour cette combinaison de puissance et de distance',
      );
    }
    return resultat;
  }

  function compenserVertexSpherique(puissanceD, distanceMm, parametre) {
    validerDistanceMm(distanceMm, parametre || 'distance');
    return appliquerVertex(puissanceD, distanceMm / 1000, 1);
  }

  function decompenserVertexSpherique(puissanceD, distanceMm, parametre) {
    validerDistanceMm(distanceMm, parametre || 'distance');
    return appliquerVertex(puissanceD, distanceMm / 1000, -1);
  }

  /* Sphero-cylindrique : les deux meridiens principaux (M1 = S, M2 = S + C)
   * sont compenses separement puis recomposes ; l'axe n'est jamais touche
   * ici. Comme M2 <= M1 (convention cylindre negatif) et que la transformation
   * de vertex est croissante partout ou elle est definie, M2' <= M1' : le
   * cylindre recompose reste negatif ou nul, donc jamais de transposition. */
  function compenserVertexSpheroCylindrique(rx, distanceMm, parametre) {
    validerDistanceMm(distanceMm, parametre || 'distance');
    var normalise = P.normalizePrescription(rx);
    var distanceM = distanceMm / 1000;
    var m1 = appliquerVertex(normalise.sph, distanceM, 1);
    var m2 = appliquerVertex(normalise.sph + normalise.cyl, distanceM, 1);
    var cyl = m2 - m1;
    return { sph: m1, cyl: cyl, axe: cyl === 0 ? null : normalise.axe };
  }

  function decompenserVertexSpheroCylindrique(rx, distanceMm, parametre) {
    validerDistanceMm(distanceMm, parametre || 'distance');
    var normalise = P.normalizePrescription(rx);
    var distanceM = distanceMm / 1000;
    var m1 = appliquerVertex(normalise.sph, distanceM, -1);
    var m2 = appliquerVertex(normalise.sph + normalise.cyl, distanceM, -1);
    var cyl = m2 - m1;
    return { sph: m1, cyl: cyl, axe: cyl === 0 ? null : normalise.axe };
  }

  /* Rotation torique : signe unique r = +rotation si la lentille a tourne
   * vers la gauche du praticien, r = -rotation vers la droite.
   *   axe reellement porte = normalizeAxis(axe_lentille - r)
   *   axe a commander      = normalizeAxis(axe_voulu    + r)
   * Les deux sont reciproques par construction : appliquer l'une puis
   * l'autre avec la meme rotation et le meme sens redonne l'axe de depart. */
  var SENS_ROTATION = { gauche: 1, droite: -1 };

  function signeRotation(rotationDeg, sens) {
    if (!Object.prototype.hasOwnProperty.call(SENS_ROTATION, sens)) {
      throw ErreurMetier('ROTATION_INVALIDE', 'sens de rotation inconnu : ' + sens);
    }
    if (typeof rotationDeg !== 'number' || !Number.isFinite(rotationDeg)) {
      throw ErreurMetier('ROTATION_INVALIDE', 'la rotation doit etre un nombre fini');
    }
    return SENS_ROTATION[sens] * rotationDeg;
  }

  function axeReellementPorte(axeLentille, rotationDeg, sens) {
    var axe = nombreFiniLocal(axeLentille, 'axe');
    return P.normalizeAxis(axe - signeRotation(rotationDeg, sens));
  }

  function axeACommander(axeVoulu, rotationDeg, sens) {
    var axe = nombreFiniLocal(axeVoulu, 'axe');
    return P.normalizeAxis(axe + signeRotation(rotationDeg, sens));
  }

  /* Arrondit sph et cyl separement au pas clinique ; l'axe n'est jamais
   * recalcule ici, seulement reconduit (et mis a null si cyl s'arrondit a
   * zero, pour respecter l'invariant cylindre nul <-> axe null). La valeur
   * theorique passee en entree n'est jamais modifiee : cette fonction ne
   * renvoie qu'une projection supplementaire, aux cotes de la premiere. */
  function arrondirPrescription(rx, pas) {
    var pasReel = pas === undefined ? PAS_CIBLE_DEFAUT : pas;
    var detailSph = P.arrondiDetaille(rx.sph, pasReel);
    var detail = { sph: detailSph };
    var valeurs = { sph: detailSph.valeur, cyl: 0, axe: null };
    if (rx.cyl !== 0) {
      var detailCyl = P.arrondiDetaille(rx.cyl, pasReel);
      detail.cyl = detailCyl;
      valeurs.cyl = detailCyl.valeur;
      valeurs.axe = valeurs.cyl === 0 ? null : rx.axe;
    }
    return { valeurs: valeurs, detail: detail };
  }

  /* Moteur A : lunettes (sph, cyl, axe, vertexMm) -> correction theorique au
   * plan corneen + correction cible arrondie au pas clinique. Une distance
   * vertex nulle laisse la correction inchangee (identite de la formule de
   * vertex a distance 0). Toute entree hors domaine produit un probleme
   * identifie et aucune valeur (theorique et cible restent null). */
  function calculerMoteurA(entree) {
    var problemeDistance = detecterProblemeDistance(entree.vertexMm, 'vertex');
    if (problemeDistance) {
      return { entree: entree, theorique: null, cible: null, problemes: [problemeDistance] };
    }

    try {
      var lunettes = P.normalizePrescription({ sph: entree.sph, cyl: entree.cyl, axe: entree.axe });
      var theorique = compenserVertexSpheroCylindrique(lunettes, entree.vertexMm, 'vertex');
      var cibleArrondie = arrondirPrescription(theorique);
      return {
        entree: entree,
        lunettes: lunettes,
        theorique: theorique,
        cible: cibleArrondie.valeurs,
        detailArrondi: cibleArrondie.detail,
        problemes: [],
      };
    } catch (erreur) {
      return {
        entree: entree,
        theorique: null,
        cible: null,
        problemes: [{ code: erreur.code || 'PRESCRIPTION_INVALIDE', gravite: 'erreur', message: erreur.message }],
      };
    }
  }

  /* Moteur B : lentille portee + surrefraction (facultative) + rotation
   * observee -> nouvelle correction cible. La distance de surrefraction est
   * un parametre distinct de la distance vertex du moteur A ; la
   * surrefraction est combinee par vecteurs de puissance, jamais par simple
   * addition sph/cyl. Une rotation declaree instable ajoute un avertissement
   * au resultat sans supprimer la valeur calculee. */
  function calculerMoteurB(entree) {
    var problemeDistance = detecterProblemeDistance(entree.distanceSurrefractionMm, 'distanceSurrefraction');
    if (problemeDistance) {
      return { entree: entree, axePorte: null, theorique: null, cible: null, problemes: [problemeDistance] };
    }

    var rotation = entree.rotation || {};
    var rotationValeur = rotation.valeur === undefined ? 0 : rotation.valeur;
    var rotationSens = rotation.sens === undefined ? 'gauche' : rotation.sens;

    try {
      var lentille = P.normalizePrescription(entree.lentille);
      var surrefraction = P.normalizePrescription(entree.surrefraction || { sph: 0, cyl: 0, axe: null });

      var axePorte = null;
      var lentillePortee = lentille;
      if (lentille.cyl !== 0) {
        axePorte = axeReellementPorte(lentille.axe, rotationValeur, rotationSens);
        lentillePortee = { sph: lentille.sph, cyl: lentille.cyl, axe: axePorte };
      }

      var surrefractionCornee = compenserVertexSpheroCylindrique(
        surrefraction,
        entree.distanceSurrefractionMm,
        'distanceSurrefraction',
      );

      var theorique = P.combinePrescriptions(lentillePortee, surrefractionCornee);

      var axeCible = theorique.axe;
      if (theorique.cyl !== 0 && lentille.cyl !== 0) {
        axeCible = axeACommander(theorique.axe, rotationValeur, rotationSens);
      }

      var cibleArrondie = arrondirPrescription(theorique);
      var cible = cibleArrondie.valeurs;
      cible.axe = cible.cyl === 0 ? null : axeCible;

      var problemes = [];
      if (rotation.stable === false) {
        problemes.push({
          code: 'ROTATION_INSTABLE',
          gravite: 'avertissement',
          message: 'la rotation declaree n\'est pas stable : l\'axe compense est une indication a verifier, pas une valeur acquise',
        });
      }

      return {
        entree: entree,
        axePorte: axePorte,
        theorique: theorique,
        cible: cible,
        detailArrondi: cibleArrondie.detail,
        problemes: problemes,
      };
    } catch (erreur) {
      return {
        entree: entree,
        axePorte: null,
        theorique: null,
        cible: null,
        problemes: [{ code: erreur.code || 'PRESCRIPTION_INVALIDE', gravite: 'erreur', message: erreur.message }],
      };
    }
  }

  return {
    PAS_CIBLE_DEFAUT: PAS_CIBLE_DEFAUT,
    DISTANCE_MM_MAX: DISTANCE_MM_MAX,
    compenserVertexSpherique: compenserVertexSpherique,
    decompenserVertexSpherique: decompenserVertexSpherique,
    compenserVertexSpheroCylindrique: compenserVertexSpheroCylindrique,
    decompenserVertexSpheroCylindrique: decompenserVertexSpheroCylindrique,
    axeReellementPorte: axeReellementPorte,
    axeACommander: axeACommander,
    arrondirPrescription: arrondirPrescription,
    calculerMoteurA: calculerMoteurA,
    calculerMoteurB: calculerMoteurB,
  };
}));
