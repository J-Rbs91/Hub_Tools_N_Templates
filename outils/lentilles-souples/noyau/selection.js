/* Moteur de selection : disponibilite exacte d'une combinaison, recherche bornee
 * d'alternatives et score optique.
 *
 * Direction de dependance : ce fichier ne connait que le noyau de prescription
 * (outils/lentilles-souples/noyau/prescription.js), pour normalizePrescription,
 * prescriptionToPowerVector et estSurLaGrille (grille testee en entiers, jamais
 * par un epsilon flottant). Il ne connait pas catalogue.js : le format d'une
 * regle de fabrication (sph_min/sph_max/sph_step, cyl_values, axis_mode,
 * axis_min/axis_max/axis_step, axis_values, source_id) est celui du contrat de
 * modele, pas une dependance de code vers le validateur.
 *
 * Double export : globalThis.LentillesSelection dans un navigateur,
 * module.exports sous Node, sur le meme modele que le reste du noyau.
 *
 * Recherche bornee (aucun produit cartesien) : pour une regle donnee,
 * chercherAlternatives ne genere jamais plus de cinq spheres, trois cylindres
 * et trois axes autour de la cible (candidatsSphere/candidatsCylindre/
 * candidatsAxe*), soit un plafond de 45 candidats par regle quelle que soit la
 * largeur de la plage ou la finesse du pas : la generation est ancree sur
 * l'index de grille le plus proche de la cible (arrondi + petit voisinage),
 * jamais une boucle sur la plage entiere.
 */
(function (racine, fabrique) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique(require('./prescription.js'));
  } else {
    racine.LentillesSelection = fabrique(racine.LentillesPrescription);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  'use strict';

  var MAX_SPHERES_PAR_REGLE = 5;
  var MAX_CYLINDRES_PAR_REGLE = 3;
  var MAX_AXES_PAR_REGLE = 3;
  var CANDIDATS_MAX_PAR_REGLE = MAX_SPHERES_PAR_REGLE * MAX_CYLINDRES_PAR_REGLE * MAX_AXES_PAR_REGLE;
  var LIMITE_ALTERNATIVES_DEFAUT = 5;

  var RAISON_SPHERE_HORS_PLAGE = 'SPHERE_HORS_PLAGE';
  var RAISON_SPHERE_HORS_PAS = 'SPHERE_HORS_PAS';
  var RAISON_CYLINDRE_ABSENT = 'CYLINDRE_ABSENT';
  var RAISON_AXE_HORS_MODE = 'AXE_HORS_MODE';
  var RAISON_AUCUNE_REGLE_EXPLOITABLE = 'AUCUNE_REGLE_EXPLOITABLE';

  function estNombreFini(valeur) {
    return typeof valeur === 'number' && Number.isFinite(valeur);
  }

  function estNulOuIndefini(valeur) {
    return valeur === null || valeur === undefined;
  }

  /* Distance d'axe repliee a 180 degres : le domaine d'axe (1..180, cf.
   * normalizeAxis) est cyclique de periode 180, pas 360. Deux axes proches de
   * la couture (179 et 4, par exemple) sont donc a distance 5, pas 175. */
  function distanceAxe(a, b) {
    var brut = Math.abs(a - b);
    return Math.min(brut, 180 - brut);
  }

  /* Ecart optique : norme du residu entre deux prescriptions dans l'espace des
   * vecteurs de puissance (force de flou du residu). Vaut zero pour une
   * combinaison exacte, jamais negatif, et ne duplique aucune formule du
   * noyau : M/J0/J45 viennent de prescriptionToPowerVector. */
  function ecartOptique(rxCible, rxCandidat) {
    var vCible = P.prescriptionToPowerVector(P.normalizePrescription(rxCible));
    var vCandidat = P.prescriptionToPowerVector(P.normalizePrescription(rxCandidat));
    var dM = vCible.M - vCandidat.M;
    var dJ0 = vCible.J0 - vCandidat.J0;
    var dJ45 = vCible.J45 - vCandidat.J45;
    return Math.sqrt(dM * dM + dJ0 * dJ0 + dJ45 * dJ45);
  }

  /* Compile un produit : ses regles de fabrication actives, triees par
   * rule_id. Le tri fige l'ordre de parcours pour isCombinationAvailable
   * (premiere regle qui accepte gagne), independamment de l'ordre d'arrivee
   * des regles dans le catalogue source. */
  function compilerProduit(produit, regles) {
    if (!produit || typeof produit !== 'object') {
      throw new Error('produit invalide');
    }
    var actives = (Array.isArray(regles) ? regles : []).filter(function (regle) {
      return regle && String(regle.product_id) === String(produit.product_id) && regle.active === true;
    });
    actives.sort(function (a, b) {
      var idA = String(a.rule_id);
      var idB = String(b.rule_id);
      return idA < idB ? -1 : (idA > idB ? 1 : 0);
    });
    return { produit: produit, regles: actives };
  }

  /* Index bornee du catalogue entier : une entree par (produit actif, regle
   * active), triee par product_id puis rule_id. C'est sur cette liste que
   * chercherAlternatives parcourt les regles plausibles, tous produits et
   * tous fabricants confondus. */
  function compilerIndex(catalogue) {
    var products = Array.isArray(catalogue && catalogue.products) ? catalogue.products : [];
    var rules = Array.isArray(catalogue && catalogue.manufacturing_rules) ? catalogue.manufacturing_rules : [];

    var produitParId = {};
    for (var i = 0; i < products.length; i += 1) {
      if (products[i] && products[i].active === true) {
        produitParId[String(products[i].product_id)] = products[i];
      }
    }

    var entrees = [];
    for (var j = 0; j < rules.length; j += 1) {
      var regle = rules[j];
      if (!regle || regle.active !== true) {
        continue;
      }
      var produit = produitParId[String(regle.product_id)];
      if (!produit) {
        continue;
      }
      entrees.push({ produit: produit, regle: regle });
    }

    entrees.sort(function (a, b) {
      var pa = String(a.produit.product_id);
      var pb = String(b.produit.product_id);
      if (pa !== pb) {
        return pa < pb ? -1 : 1;
      }
      var ra = String(a.regle.rule_id);
      var rb = String(b.regle.rule_id);
      return ra < rb ? -1 : (ra > rb ? 1 : 0);
    });

    return entrees;
  }

  function sphereCorrespond(regle, sphere) {
    if (!estNombreFini(sphere)) {
      return false;
    }
    if (sphere < regle.sph_min || sphere > regle.sph_max) {
      return false;
    }
    return P.estSurLaGrille(sphere, regle.sph_step, regle.sph_min);
  }

  function cylindreCorrespond(regle, cylindre) {
    if (!estNombreFini(cylindre)) {
      return false;
    }
    return Array.isArray(regle.cyl_values) && regle.cyl_values.indexOf(cylindre) !== -1;
  }

  /* Un cylindre nul impose un axe null (meme convention que le noyau de
   * prescription) : le mode d'axe de la regle n'entre alors pas en jeu, ce qui
   * fait passer une lentille spherique par le meme moteur qu'une torique. */
  function axeCorrespond(regle, cylindre, axe) {
    if (cylindre === 0) {
      return estNulOuIndefini(axe);
    }
    if (estNulOuIndefini(axe) || !estNombreFini(axe)) {
      return false;
    }
    if (regle.axis_mode === 'RANGE') {
      if (axe < regle.axis_min || axe > regle.axis_max) {
        return false;
      }
      return P.estSurLaGrille(axe, regle.axis_step, regle.axis_min);
    }
    if (regle.axis_mode === 'LIST') {
      return Array.isArray(regle.axis_values) && regle.axis_values.indexOf(axe) !== -1;
    }
    return false;
  }

  /* Premiere raison de rejet rencontree pour une regle donnee, dans un ordre
   * fixe (sphere, puis cylindre, puis axe) afin que le resultat ne depende
   * jamais de l'ordre d'evaluation des controles. Renvoie null quand la regle
   * accepte la combinaison. */
  function raisonRegle(regle, sphere, cylindre, axe) {
    if (!estNombreFini(sphere) || sphere < regle.sph_min || sphere > regle.sph_max) {
      return RAISON_SPHERE_HORS_PLAGE;
    }
    if (!P.estSurLaGrille(sphere, regle.sph_step, regle.sph_min)) {
      return RAISON_SPHERE_HORS_PAS;
    }
    if (!cylindreCorrespond(regle, cylindre)) {
      return RAISON_CYLINDRE_ABSENT;
    }
    if (!axeCorrespond(regle, cylindre, axe)) {
      return RAISON_AXE_HORS_MODE;
    }
    return null;
  }

  /* Disponibilite exacte d'une combinaison pour un produit compile. Parcourt
   * les regles dans l'ordre fige par compilerProduit ; la premiere qui
   * accepte gagne, ce qui rend le resultat reproductible d'un appel a
   * l'autre. Une combinaison refusee porte la liste (dedupliquee) des raisons
   * rencontrees sur les regles evaluees. */
  function isCombinationAvailable(produitCompile, sphere, cylindre, axe) {
    var regles = (produitCompile && Array.isArray(produitCompile.regles)) ? produitCompile.regles : [];
    var raisonsRencontrees = [];

    for (var i = 0; i < regles.length; i += 1) {
      var regle = regles[i];
      var raison = raisonRegle(regle, sphere, cylindre, axe);
      if (raison === null) {
        return { available: true, matched_rule_id: regle.rule_id, source_id: regle.source_id, raisons: [] };
      }
      if (raisonsRencontrees.indexOf(raison) === -1) {
        raisonsRencontrees.push(raison);
      }
    }

    if (regles.length === 0) {
      raisonsRencontrees.push(RAISON_AUCUNE_REGLE_EXPLOITABLE);
    }

    return { available: false, matched_rule_id: null, source_id: null, raisons: raisonsRencontrees };
  }

  /* Au plus cinq spheres sur la grille de la regle (ancree sur sph_min),
   * autour de l'index le plus proche de la cible : deux voisines de chaque
   * cote, jamais un parcours de sph_min a sph_max. */
  function candidatsSphere(regle, sphereCible) {
    var step = regle.sph_step;
    var min = regle.sph_min;
    var max = regle.sph_max;
    var indexCentre = Math.round((sphereCible - min) / step);
    var vus = {};
    var candidats = [];

    for (var k = -2; k <= 2; k += 1) {
      var idx = indexCentre + k;
      if (idx < 0) {
        continue;
      }
      var valeur = min + idx * step;
      if (valeur < min || valeur > max || !P.estSurLaGrille(valeur, step, min)) {
        continue;
      }
      var cle = String(valeur);
      if (vus[cle]) {
        continue;
      }
      vus[cle] = true;
      candidats.push(valeur);
    }

    candidats.sort(function (a, b) {
      return Math.abs(a - sphereCible) - Math.abs(b - sphereCible) || (a - b);
    });
    return candidats.slice(0, MAX_SPHERES_PAR_REGLE);
  }

  /* Au plus trois cylindres : les plus proches de la cible dans la liste
   * explicite cyl_values (pas de pas suppose sur le cylindre). */
  function candidatsCylindre(regle, cylindreCible) {
    var valeurs = Array.isArray(regle.cyl_values) ? regle.cyl_values.slice() : [];
    valeurs.sort(function (a, b) {
      return Math.abs(a - cylindreCible) - Math.abs(b - cylindreCible) || (a - b);
    });
    return valeurs.slice(0, MAX_CYLINDRES_PAR_REGLE);
  }

  function candidatsAxeListe(regle, axeCible) {
    var valeurs = Array.isArray(regle.axis_values) ? regle.axis_values.slice() : [];
    var reference = estNulOuIndefini(axeCible) ? null : axeCible;
    valeurs.sort(function (a, b) {
      var da = reference === null ? 0 : distanceAxe(a, reference);
      var db = reference === null ? 0 : distanceAxe(b, reference);
      return da - db || (a - b);
    });
    return valeurs.slice(0, MAX_AXES_PAR_REGLE);
  }

  /* Au plus trois axes en mode RANGE, ancres sur l'index de grille le plus
   * proche de la cible (axis_min comme origine). Trois variantes de la cible
   * (elle-meme, -180, +180) sont projetees sur la grille afin que le
   * repliement a 180 degres soit pris en compte sans jamais parcourir la
   * plage entiere : le nombre d'iterations est fixe (3 variantes x 3
   * voisins), pas fonction de axis_step ni de la largeur axis_min..axis_max. */
  function candidatsAxeRange(regle, axeCible) {
    var step = regle.axis_step;
    var min = regle.axis_min;
    var max = regle.axis_max;
    var reference = estNulOuIndefini(axeCible) ? min : axeCible;
    var variantes = [reference, reference - 180, reference + 180];
    var vus = {};
    var candidats = [];

    for (var v = 0; v < variantes.length; v += 1) {
      var indexCentre = Math.round((variantes[v] - min) / step);
      for (var k = -1; k <= 1; k += 1) {
        var idx = indexCentre + k;
        if (idx < 0) {
          continue;
        }
        var valeur = min + idx * step;
        if (valeur < min || valeur > max || !P.estSurLaGrille(valeur, step, min)) {
          continue;
        }
        var cle = String(valeur);
        if (vus[cle]) {
          continue;
        }
        vus[cle] = true;
        candidats.push(valeur);
      }
    }

    candidats.sort(function (a, b) {
      var da = estNulOuIndefini(axeCible) ? 0 : distanceAxe(a, axeCible);
      var db = estNulOuIndefini(axeCible) ? 0 : distanceAxe(b, axeCible);
      return da - db || (a - b);
    });
    return candidats.slice(0, MAX_AXES_PAR_REGLE);
  }

  /* Candidats bornes pour une regle : au plus MAX_SPHERES_PAR_REGLE spheres,
   * chacune croisee avec au plus MAX_CYLINDRES_PAR_REGLE cylindres, chacun
   * croise avec au plus MAX_AXES_PAR_REGLE axes (un seul candidat axe=null
   * quand le cylindre du candidat est nul). Plafond total
   * CANDIDATS_MAX_PAR_REGLE, jamais depasse quelle que soit la taille de la
   * regle. */
  function candidatsRegle(regle, cible) {
    var spheres = candidatsSphere(regle, cible.sph);
    var cylindres = candidatsCylindre(regle, cible.cyl);
    var resultats = [];

    for (var i = 0; i < spheres.length; i += 1) {
      for (var j = 0; j < cylindres.length; j += 1) {
        var cyl = cylindres[j];
        var axes;
        if (cyl === 0) {
          axes = [null];
        } else if (regle.axis_mode === 'RANGE') {
          axes = candidatsAxeRange(regle, cible.axe);
        } else if (regle.axis_mode === 'LIST') {
          axes = candidatsAxeListe(regle, cible.axe);
        } else {
          axes = [];
        }
        for (var m = 0; m < axes.length; m += 1) {
          resultats.push({ sph: spheres[i], cyl: cyl, axe: axes[m] });
        }
      }
    }
    return resultats;
  }

  /* Recherche d'alternatives sur l'index entier du catalogue : jamais de
   * produit cartesien (candidatsRegle borne chaque regle independamment),
   * puis un tri en ordre total (ecart, puis ecart de sphere, de cylindre,
   * d'axe, puis product_id, rule_id) qui ne depend jamais de l'ordre
   * d'iteration des entrees. Une combinaison exacte a un ecart nul et se
   * retrouve donc toujours en tete. */
  function chercherAlternatives(index, cible, options) {
    var opts = options || {};
    var limite = estNombreFini(opts.limit) && opts.limit > 0 ? Math.floor(opts.limit) : LIMITE_ALTERNATIVES_DEFAUT;
    var cibleNormalisee = P.normalizePrescription(cible);
    var entrees = Array.isArray(index) ? index : [];
    var candidats = [];

    for (var i = 0; i < entrees.length; i += 1) {
      var produit = entrees[i].produit;
      var regle = entrees[i].regle;
      var locaux = candidatsRegle(regle, cibleNormalisee);
      for (var j = 0; j < locaux.length; j += 1) {
        var candidat = locaux[j];
        var ecart = ecartOptique(cibleNormalisee, candidat);
        candidats.push({
          product_id: produit.product_id,
          manufacturer_id: produit.manufacturer_id,
          rule_id: regle.rule_id,
          source_id: regle.source_id,
          sph: candidat.sph,
          cyl: candidat.cyl,
          axe: candidat.axe,
          ecart: ecart,
          exact: ecart === 0,
        });
      }
    }

    candidats.sort(function (a, b) {
      if (a.ecart !== b.ecart) {
        return a.ecart - b.ecart;
      }
      var dSphA = Math.abs(a.sph - cibleNormalisee.sph);
      var dSphB = Math.abs(b.sph - cibleNormalisee.sph);
      if (dSphA !== dSphB) {
        return dSphA - dSphB;
      }
      var dCylA = Math.abs(a.cyl - cibleNormalisee.cyl);
      var dCylB = Math.abs(b.cyl - cibleNormalisee.cyl);
      if (dCylA !== dCylB) {
        return dCylA - dCylB;
      }
      var dAxeA = (estNulOuIndefini(a.axe) || estNulOuIndefini(cibleNormalisee.axe)) ? 0 : distanceAxe(a.axe, cibleNormalisee.axe);
      var dAxeB = (estNulOuIndefini(b.axe) || estNulOuIndefini(cibleNormalisee.axe)) ? 0 : distanceAxe(b.axe, cibleNormalisee.axe);
      if (dAxeA !== dAxeB) {
        return dAxeA - dAxeB;
      }
      var pa = String(a.product_id);
      var pb = String(b.product_id);
      if (pa !== pb) {
        return pa < pb ? -1 : 1;
      }
      var ra = String(a.rule_id);
      var rb = String(b.rule_id);
      return ra < rb ? -1 : (ra > rb ? 1 : 0);
    });

    return candidats.slice(0, limite);
  }

  return {
    CANDIDATS_MAX_PAR_REGLE: CANDIDATS_MAX_PAR_REGLE,
    LIMITE_ALTERNATIVES_DEFAUT: LIMITE_ALTERNATIVES_DEFAUT,
    distanceAxe: distanceAxe,
    ecartOptique: ecartOptique,
    compilerProduit: compilerProduit,
    compilerIndex: compilerIndex,
    isCombinationAvailable: isCombinationAvailable,
    chercherAlternatives: chercherAlternatives,
  };
}));
