/* Catalogue fabricant de demonstration : DONNEES FICTIVES.
 *
 * Aucun fabricant, produit, gamme ou fiche technique ci-dessous ne correspond
 * a une entite reelle. Les deux fabricants sont marques `fictional: true` et
 * leur nom porte la mention "(fabricant fictif)" ; les sites et fiches
 * techniques utilisent le domaine reserve .invalid (RFC 2606), qui ne
 * resoudra jamais. Aucune caracteristique reelle d'un fabricant existant
 * n'est reprise ici. Ce fichier sert uniquement a demontrer et a tester le
 * modele et le validateur de outils/lentilles-souples/noyau/catalogue.js.
 *
 * Double export : globalThis.LentillesCatalogueDemo dans un navigateur,
 * module.exports sous Node, sur le meme modele que le reste du noyau.
 */
(function (racine, fabrique) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique();
  } else {
    racine.LentillesCatalogueDemo = fabrique();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var catalogueDemo = {
    manufacturers: [
      {
        manufacturer_id: 'MFR-DEMO-001',
        name: 'Vertessa Optique (fabricant fictif, donnees de demonstration)',
        official_website: 'https://vertessa-optique.invalid/',
        active: true,
        fictional: true,
      },
      {
        manufacturer_id: 'MFR-DEMO-002',
        name: 'Clarolens Fictive (fabricant fictif, donnees de demonstration)',
        official_website: 'https://clarolens-fictive.invalid/',
        active: true,
        fictional: true,
      },
    ],

    products: [
      {
        product_id: 'PRD-DEMO-SPH-001',
        manufacturer_id: 'MFR-DEMO-001',
        name: 'Vertessa Spherique Jour (fictif)',
        lens_type: 'SPHERICAL',
        active: true,
      },
      {
        product_id: 'PRD-DEMO-TOR-001',
        manufacturer_id: 'MFR-DEMO-001',
        name: 'Vertessa Torique Regulier (fictif)',
        lens_type: 'TORIC',
        active: true,
      },
      {
        product_id: 'PRD-DEMO-TOR-002',
        manufacturer_id: 'MFR-DEMO-002',
        name: 'Clarolens Torique Complexe (fictif)',
        lens_type: 'TORIC',
        active: true,
      },
    ],

    manufacturing_rules: [
      {
        rule_id: 'RUL-DEMO-001',
        product_id: 'PRD-DEMO-SPH-001',
        sph_min: -12,
        sph_max: 8,
        sph_step: 0.25,
        cyl_values: [0],
        axis_mode: 'RANGE',
        axis_min: 1,
        axis_max: 180,
        axis_step: 1,
        bc_values: [8.4, 8.6, 8.8],
        dia_values: [14.0, 14.2],
        source_id: 'SRC-DEMO-001',
        verified_at: '2026-01-15',
        active: true,
      },
      {
        rule_id: 'RUL-DEMO-002',
        product_id: 'PRD-DEMO-TOR-001',
        sph_min: -6,
        sph_max: 4,
        sph_step: 0.25,
        cyl_values: [-0.75, -1.25, -1.75, -2.25],
        axis_mode: 'RANGE',
        axis_min: 1,
        axis_max: 180,
        axis_step: 10,
        bc_values: [8.6],
        dia_values: [14.5],
        source_id: 'SRC-DEMO-001',
        verified_at: '2026-01-15',
        active: true,
      },
      {
        rule_id: 'RUL-DEMO-003',
        product_id: 'PRD-DEMO-TOR-001',
        sph_min: -12,
        sph_max: -6.25,
        sph_step: 0.5,
        cyl_values: [-0.75, -1.25, -1.75],
        axis_mode: 'LIST',
        axis_values: [20, 70, 110, 160],
        bc_values: [8.6],
        dia_values: [14.5],
        source_id: 'SRC-DEMO-001',
        verified_at: '2026-01-15',
        active: true,
      },
      {
        rule_id: 'RUL-DEMO-004',
        product_id: 'PRD-DEMO-TOR-002',
        sph_min: -8,
        sph_max: 2,
        sph_step: 0.5,
        cyl_values: [-0.75, -1.25, -2.25, -3.5],
        axis_mode: 'LIST',
        axis_values: [10, 20, 45, 70, 110, 160],
        bc_values: [8.4, 8.7, 9.0],
        dia_values: [14.0, 14.5, 15.0],
        source_id: 'SRC-DEMO-002',
        verified_at: '2026-02-01',
        active: true,
      },
    ],

    sources: [
      {
        source_id: 'SRC-DEMO-001',
        manufacturer_id: 'MFR-DEMO-001',
        source_type: 'MANUAL_ENTRY',
        url: 'https://vertessa-optique.invalid/fiche-technique-demonstration',
        document_name: 'Fiche technique fictive Vertessa (demonstration)',
        document_date: '2026-01-10',
        last_checked: '2026-01-15',
        content_hash: 'demo-vertessa-0001',
      },
      {
        source_id: 'SRC-DEMO-002',
        manufacturer_id: 'MFR-DEMO-002',
        source_type: 'MANUAL_ENTRY',
        url: 'https://clarolens-fictive.invalid/fiche-technique-demonstration',
        document_name: 'Fiche technique fictive Clarolens (demonstration)',
        document_date: '2026-01-20',
        last_checked: '2026-02-01',
        content_hash: 'demo-clarolens-0001',
      },
    ],
  };

  return {
    catalogueDemo: catalogueDemo,
  };
}));
