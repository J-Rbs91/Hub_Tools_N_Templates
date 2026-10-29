# UXER : refonte du calculateur d'épaisseur des verres

Date : 29 octobre 2026
Branche : `uxer/epaisseur-parcours-20261029`
Base : `main` après PR #97 et #99
Direction : Répertoire professionnel (03)

## Intention
Remplacer une longue liste de panneaux techniques par un parcours métier explicite, sans transformer le moteur de calcul.
Le calcul reste immédiat après saisie ou sélection ; aucune étape « Valider / Calculer » n'est introduite.

## Diagnostic initial
- 380 px fixes pour la saisie, cinq colonnes d'entrée OD/OG très serrées.
- Forme et cotes A/B/D dans la même section, avec beaucoup de documentation visible en permanence.
- Synthèse placée en bas de colonne à gauche, alors que la visualisation occupe le haut de la droite.
- Options de montage, biseaux, vue 1:1 et notices détaillées monopolisent le panneau de visualisation.
- Sélection des formes par bouton visuellement active, mais sans `aria-pressed`.
- En mobile, la table OD/OG devient une grille trop dense.

## Nouvelle composition
Navigation interne : 01 Forme, 02 Monture, 03 Verre, 04 Correction, 05 Résultats, 06 3D, 07 Profils.
Les résultats sont la première carte de la colonne de droite, immédiatement visibles en desktop.
Sur tablette, saisie en grille 2 colonnes avec Forme et Correction en pleine largeur.
Sur mobile, les cinq données de chaque œil sont regroupées en deux cartes OD/OG avec des libellés visibles ; résultats et vues suivent les saisies.

### Affordances et microcopy
- La forme choisie est signalée par une bordure plus marquée, une coche et `aria-pressed`.
- Bouton de photo : « Créer une forme depuis une photo ».
- Cotes A, B, D réunies dans la section Monture.
- Indice et épaisseur au bord dans la section Verre.
- Copie des paramètres : « Copier OD vers OG ».
- Les actions de vue 3D restent visibles, mais les réglages de montage et l'aide de calibration 1:1 passent dans des `details` accessibles au clavier.
- Aide technique sur les contours rangée sous « Origine des contours ».
- Navigation par ancres sans ajout d'entrées d'historique sur Android.

## Invariants
- Neuf noms, géométries et orientation OD/OG conservés ; sept jeux OMA externes + Pilote et Hexagone historiques.
- Script `oma-shapes.js` inchangé.
- Fonctions de calcul, génération des profils, rendu 3D, sauvegarde de comparaison et extraction de forme sur photo conservées.
- Valeurs par défaut, bornes des sliders, types et identifiants de champs conservés.
- Contrôles de saisie et navigation « Entrée » conservés.
- Aucun changement des clés de stockage.
- Affichage de monture conditionnel et règles de biseau conservés.
- Modal photo complète, y compris cinq étapes et outils de contour, conservée.
- Pas de nouveau chargement distant, ni modification de GoatCounter/CGU.

## Vérifications statiques effectuées
- Comparaison de tous les IDs de saisie, `select`, canvas et boutons avec `main` : identiques.
- Aucune suppression ni duplication d'ID.
- Source OMA indépendante : même blob SHA sur base et branche.
- DOM des sections équilibré et sept ancres résolues.
- Sections et panneaux `details` structurellement présents.
- Contrôles CI et recettes navigateur à effectuer avant fusion.

## Recette requise
1. Desktop 1440px et 1280px : navigation, densité de la saisie, résultats immédiatement visibles.
2. Tablette 768px et mobile 375/320px, zoom 200 %, lecture au clavier et lecteur d'écran.
3. Changement des neuf formes ; vérification contour OD/OG, position nasal/temporal, valeurs A/B suggérées et respect d'une saisie manuelle.
4. Valeurs sphère/cylindre/axe/PD/hauteur OD et OG, puis bouton « Copier OD vers OG ».
5. Vérification calculs d'épaisseur, diamètre utile, meridiens et avertissements.
6. Activation du cercle, bases spéciales, cambrure/galbe, biseau automatique / manuel, déverrouillage des bornes.
7. Vue 3D : gestes rotation, déplacement, zoom, coupes et règle 1:1 ; panels avancés.
8. Captures des quatre profils, comparaison client 0/2 à 2/2, suppression et recalcul.
9. Assistant photo : toutes les étapes, choix côté, rotation, cadrage, contours, forme enregistrée.
10. Retour système Android/iOS, modale, page rechargée, réinitialisation éventuelle.

Statut : revue UX et validation fonctionnelle navigateur réelles nécessaires avant fusion.

## Révision de l'organisation à la demande du métier (29 octobre 2026)
Cette révision prend la place de l'organisation à sept sections décrite dans les premières parties du rapport. Architecture actuelle à **six sections**, dans cet ordre :
1. Choix de la forme à étudier (les neuf silhouettes et la forme personnelle).
2. Cotes de la forme (A, B, D) ; panneau « Personnaliser la monture » pour la base du cercle, le galbe et l'épaisseur de la monture.
3. Type de verre : correction OD/OG (sphère, cylindre, axe), indice, épaisseur minimale au bord et base spéciale.
4. Prise de mesure : demi-écart pupillaire OD/OG et hauteur de montage OD/OG. Le bouton de copie OD vers OG reste unique et recopie les cinq paramètres de correction + centrage.
5. Affichage 3D : case « Échelle 1:1 » qui reprend le mécanisme du bouton d'origine ; bouton de comparaison ; case « Afficher la monture ». Cette dernière révèle la coloration des dépassements, le montage optimisé et la personnalisation avancée du biseau. Les actions de recentrage et de vue de profil restent disponibles.
6. Vues et analyse des épaisseurs : synthèse OD/OG des bords maxi/mini, épaisseur centrale, diamètre utile, méridiens du tore et les quatre profils (face, temporal, dessus, dessous). La synthèse provient des sorties existantes `res-body`, `merid`, `notes` ; les quatre vues viennent du moteur de profils actuel.

### Choix conservateurs
- Les champs `cambrure`, `galbe`, `m-ep`, `m-bevel-od/og`, `bevel-unlock` ne disparaissent pas lorsqu'ils ne sont pas affichés initialement ; ils se déplient.
- Changement de la commande d'échelle 1:1 de bouton en checkbox, conservant son ID `btn-11`, sa variable `scale11` et la génération de la règle 1:1.
- Les `input` métier (30 existants), valeurs initiales et attributs sont identiques à ceux de `main`, à l'exception du remplacement du bouton `btn-11` par une case à cocher portant le même ID.
- Le calcul `compute()`, les fonctions `renderResult()`, `renderProfiles()`, `faceEyeHTML()`, `profileEyeHTML()` et `load3D()` sont conservés à l'identique.
- Le parcours Entrée clavier saute les éléments des panneaux avancés fermés et les selects désactivés, sans changer les saisies.

### Recette supplémentaire obligatoire
- Après décochage « Afficher la monture », vérifier que les options subordonnées disparaissent visuellement sans perdre leurs valeurs et que les vues 3D ne montrent plus le cercle.
- Après réactivation, vérifier que la coloration et le montage optimisé redeviennent accessibles.
- Vérifier l'activation/désactivation de la case 1:1, l'apparition de la règle et l'étalonnage.
- Vérifier que le bouton Copier OD vers OG recopie correction **et** mesures, même si le bouton se trouve dans la section Prise de mesure.
- Vérifier les épaisseurs mini/maxi au bord, centrale, méridiens toriques et profils pour les corrections sphériques, cylindriques et mixtes.
- Tester les panneaux refermables à clavier et lecteur d'écran, le parcours Entrée et le zoom mobile.

La PR reste en brouillon en attendant validation visuelle et tests navigateur réels.
