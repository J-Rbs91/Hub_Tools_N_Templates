/* Modele de catalogue fabricant (Moteur C, volet modele et validation) : quatre
 * entites, manufacturers, products, manufacturing_rules et sources, conformes
 * au contrat de mission (Manufacturer, Product, ManufacturingRule, Source),
 * et un validateur deterministe qui renvoie la liste complete des erreurs,
 * chacune portant un code stable.
 *
 * Direction de dependance stricte (CON-017) : ce fichier ne connait que le
 * noyau de prescription (outils/lentilles-souples/noyau/prescription.js), et
 * seulement pour son domaine d'axe (1..180). Aucune reference au catalogue
 * dans l'autre sens : prescription.js et moteurs.js ne connaissent pas ce
 * fichier.
 *
 * Double export : globalThis.LentillesCatalogue dans un navigateur,
 * module.exports sous Node, sur le meme modele que prescription.js et
 * moteurs.js.
 *
 * validerCatalogue ne leve jamais : il renvoie toujours un tableau (vide si
 * le catalogue est valide). Un catalogue structurellement absent ou non
 * objet renvoie une seule erreur CATALOGUE_INVALIDE plutot que de lever.
 */
(function (racine, fabrique) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique(require('./prescription.js'));
  } else {
    racine.LentillesCatalogue = fabrique(racine.LentillesPrescription);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  'use strict';

  var LENS_TYPES = ['SPHERICAL', 'TORIC'];
  var AXIS_MODES = ['RANGE', 'LIST'];
  var SOURCE_TYPES = ['OFFICIAL_PRODUCT_PAGE', 'OFFICIAL_PDF', 'FITTING_GUIDE', 'CATALOG', 'MANUAL_ENTRY'];

  function estNombreFini(valeur) {
    return typeof valeur === 'number' && Number.isFinite(valeur);
  }

  /* S'appuie sur le seul domaine d'axe defini dans le noyau (1..180) :
   * une valeur est un axe valide quand elle est deja sa propre normalisation. */
  function estAxeValide(valeur) {
    return estNombreFini(valeur) && P.normalizeAxis(valeur) === valeur;
  }

  function estTableauNonVide(valeur) {
    return Array.isArray(valeur) && valeur.length > 0;
  }

  function erreur(code, message, contexte) {
    var e = { code: code, message: message };
    if (contexte) {
      for (var cle in contexte) {
        if (Object.prototype.hasOwnProperty.call(contexte, cle)) {
          e[cle] = contexte[cle];
        }
      }
    }
    return e;
  }

  /* Construit l'ensemble des identifiants d'une collection et signale tout
   * doublon (IDENTIFIANT_DUPLIQUE) ; un identifiant absent ou non textuel est
   * simplement compare par sa forme texte, jamais une cause de levee. */
  function indexerIdentifiants(liste, champId, nomCollection, erreurs) {
    var vus = {};
    var ensemble = {};
    for (var i = 0; i < liste.length; i += 1) {
      var id = String(liste[i][champId]);
      ensemble[id] = true;
      if (vus[id]) {
        erreurs.push(erreur(
          'IDENTIFIANT_DUPLIQUE',
          'identifiant duplique dans ' + nomCollection + ' : ' + id,
          { collection: nomCollection, id: id },
        ));
      }
      vus[id] = true;
    }
    return ensemble;
  }

  /* Verifie une regle isolement : bornes de sphere, cylindres, axe (RANGE ou
   * LIST), resolution de ses references (produit, source) et coherence avec
   * le lens_type du produit qu'elle equipe. Ne consulte jamais une autre
   * regle et renvoie la liste de ses propres erreurs. */
  function validerRegle(regle, contexte) {
    var erreurs = [];
    var ruleId = regle.rule_id;

    if (!Object.prototype.hasOwnProperty.call(contexte.productIds, String(regle.product_id))) {
      erreurs.push(erreur(
        'PRODUCT_ID_INTROUVABLE',
        'la regle ' + ruleId + ' reference un product_id introuvable : ' + regle.product_id,
        { rule_id: ruleId, product_id: regle.product_id },
      ));
    }

    if (!Object.prototype.hasOwnProperty.call(contexte.sourceIds, String(regle.source_id))) {
      erreurs.push(erreur(
        'SOURCE_ID_INTROUVABLE',
        'la regle ' + ruleId + ' reference un source_id introuvable : ' + regle.source_id,
        { rule_id: ruleId, source_id: regle.source_id },
      ));
    }

    if (!estNombreFini(regle.sph_min) || !estNombreFini(regle.sph_max) || regle.sph_min > regle.sph_max) {
      erreurs.push(erreur(
        'SPH_PLAGE_INVALIDE',
        'la regle ' + ruleId + ' a une plage de sphere invalide (sph_min=' + regle.sph_min + ', sph_max=' + regle.sph_max + ')',
        { rule_id: ruleId },
      ));
    }

    if (!estNombreFini(regle.sph_step) || regle.sph_step <= 0) {
      erreurs.push(erreur(
        'SPH_PAS_INVALIDE',
        'la regle ' + ruleId + ' a un pas de sphere invalide : ' + regle.sph_step,
        { rule_id: ruleId },
      ));
    }

    if (!estTableauNonVide(regle.cyl_values) || !regle.cyl_values.every(estNombreFini)) {
      erreurs.push(erreur(
        'CYLINDRE_NON_NUMERIQUE',
        'la regle ' + ruleId + ' a une liste cyl_values invalide (valeur non numerique ou absente)',
        { rule_id: ruleId },
      ));
    }

    if (regle.axis_mode === 'RANGE') {
      if (!estNombreFini(regle.axis_step) || regle.axis_step <= 0) {
        erreurs.push(erreur(
          'RANGE_SANS_PAS',
          'la regle ' + ruleId + ' est en mode RANGE sans axis_step exploitable',
          { rule_id: ruleId },
        ));
      }
      if (!estAxeValide(regle.axis_min) || !estAxeValide(regle.axis_max) || regle.axis_min > regle.axis_max) {
        erreurs.push(erreur(
          'AXE_HORS_PLAGE',
          'la regle ' + ruleId + ' a des bornes d\'axe hors du domaine 1..180 (axis_min=' + regle.axis_min + ', axis_max=' + regle.axis_max + ')',
          { rule_id: ruleId },
        ));
      }
    } else if (regle.axis_mode === 'LIST') {
      if (!estTableauNonVide(regle.axis_values)) {
        erreurs.push(erreur(
          'LIST_SANS_VALEURS',
          'la regle ' + ruleId + ' est en mode LIST sans axis_values exploitable',
          { rule_id: ruleId },
        ));
      } else if (!regle.axis_values.every(estAxeValide)) {
        erreurs.push(erreur(
          'AXE_HORS_PLAGE',
          'la regle ' + ruleId + ' a un axe hors du domaine 1..180 dans axis_values',
          { rule_id: ruleId },
        ));
      }
    } else {
      erreurs.push(erreur(
        'AXIS_MODE_INVALIDE',
        'la regle ' + ruleId + ' a un axis_mode inconnu : ' + regle.axis_mode,
        { rule_id: ruleId },
      ));
    }

    var produit = contexte.productParId[String(regle.product_id)];
    if (produit && Array.isArray(regle.cyl_values)) {
      var cylindresNumeriques = regle.cyl_values.filter(estNombreFini);
      var contientCylindreNonNul = cylindresNumeriques.some(function (v) { return v !== 0; });
      var toutesNulles = cylindresNumeriques.length > 0 && cylindresNumeriques.every(function (v) { return v === 0; });
      if (produit.lens_type === 'SPHERICAL' && contientCylindreNonNul) {
        erreurs.push(erreur(
          'INCOHERENCE_TYPE_LENTILLE',
          'la regle ' + ruleId + ' porte un cylindre non nul pour un produit SPHERICAL',
          { rule_id: ruleId, product_id: regle.product_id },
        ));
      }
      if (produit.lens_type === 'TORIC' && toutesNulles) {
        erreurs.push(erreur(
          'INCOHERENCE_TYPE_LENTILLE',
          'la regle ' + ruleId + ' ne porte aucun cylindre non nul pour un produit TORIC',
          { rule_id: ruleId, product_id: regle.product_id },
        ));
      }
    }

    return erreurs;
  }

  /* Validateur principal : renvoie la liste complete des erreurs du
   * catalogue, chacune avec un code stable. Un produit actif dont aucune
   * regle n'est a la fois active et exploitable (zero erreur propre) est
   * signale par PRODUIT_SANS_REGLE_EXPLOITABLE, meme si le catalogue ne
   * porte par ailleurs aucune autre erreur. */
  function validerCatalogue(catalogue) {
    if (!catalogue || typeof catalogue !== 'object') {
      return [erreur('CATALOGUE_INVALIDE', 'le catalogue doit etre un objet')];
    }

    var manufacturers = Array.isArray(catalogue.manufacturers) ? catalogue.manufacturers : [];
    var products = Array.isArray(catalogue.products) ? catalogue.products : [];
    var rules = Array.isArray(catalogue.manufacturing_rules) ? catalogue.manufacturing_rules : [];
    var sources = Array.isArray(catalogue.sources) ? catalogue.sources : [];

    var erreurs = [];
    var manufacturerIds = indexerIdentifiants(manufacturers, 'manufacturer_id', 'manufacturers', erreurs);
    var productIds = indexerIdentifiants(products, 'product_id', 'products', erreurs);
    indexerIdentifiants(rules, 'rule_id', 'manufacturing_rules', erreurs);
    var sourceIds = indexerIdentifiants(sources, 'source_id', 'sources', erreurs);

    var productParId = {};
    for (var i = 0; i < products.length; i += 1) {
      productParId[String(products[i].product_id)] = products[i];
      if (!Object.prototype.hasOwnProperty.call(manufacturerIds, String(products[i].manufacturer_id))) {
        erreurs.push(erreur(
          'MANUFACTURER_ID_INTROUVABLE',
          'le produit ' + products[i].product_id + ' reference un manufacturer_id introuvable : ' + products[i].manufacturer_id,
          { product_id: products[i].product_id, manufacturer_id: products[i].manufacturer_id },
        ));
      }
    }

    var contexte = { productIds: productIds, sourceIds: sourceIds, productParId: productParId };
    var erreursParRegle = {};
    for (var j = 0; j < rules.length; j += 1) {
      var regle = rules[j];
      var erreursRegle = validerRegle(regle, contexte);
      erreursParRegle[String(regle.rule_id)] = erreursRegle.length;
      erreurs = erreurs.concat(erreursRegle);
    }

    for (var k = 0; k < products.length; k += 1) {
      var produit = products[k];
      if (produit.active !== true) {
        continue;
      }
      var aUneRegleExploitable = rules.some(function (r) {
        return String(r.product_id) === String(produit.product_id)
          && r.active === true
          && erreursParRegle[String(r.rule_id)] === 0;
      });
      if (!aUneRegleExploitable) {
        erreurs.push(erreur(
          'PRODUIT_SANS_REGLE_EXPLOITABLE',
          'le produit actif ' + produit.product_id + ' n\'a aucune regle exploitable',
          { product_id: produit.product_id },
        ));
      }
    }

    return erreurs;
  }

  return {
    LENS_TYPES: LENS_TYPES,
    AXIS_MODES: AXIS_MODES,
    SOURCE_TYPES: SOURCE_TYPES,
    validerCatalogue: validerCatalogue,
  };
}));
