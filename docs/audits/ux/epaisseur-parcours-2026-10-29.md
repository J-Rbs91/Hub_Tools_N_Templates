# UXER — Refonte du calculateur d'épaisseur

**Date :** 29 octobre 2026  
**Branche :** `uxer/epaisseur-parcours-20261029`  
**PR :** #100 — brouillon, non fusionnée  
**Référence :** direction visuelle 03 « Répertoire professionnel »

## Objectif

Améliorer le parcours métier, les affordances, la navigation et la lisibilité mobile, sans modification des modèles optiques ni des neuf géométries. Les valeurs sont recalculées automatiquement pendant la saisie ; il n'y a pas de bouton « Calculer ».

## Organisation actuelle — six sections

1. **Choix de la forme à étudier** : neuf formes natives et import d'une forme personnelle par photo. Sélection visuelle explicite et `aria-pressed`.
2. **Cotes de la forme** : A, B, D ; panneau « Personnaliser la monture » pour base du cercle, galbe et épaisseur du cercle. Le panneau est facultatif et reste utilisable indépendamment de l'affichage 3D du cercle.
3. **Type de verre** : correction OD/OG (sphère, cylindre, axe), indice, épaisseur minimale au bord et base spéciale conditionnelle.
4. **Prise de mesure** : demi-écarts pupillaires OD/OG et hauteurs OD/OG. « Copier correction et mesures OD vers OG » recopie les cinq paramètres de l'œil droit.
5. **Affichage 3D** : case « Échelle 1:1 » (même variable de calcul `scale11`), enregistrement de deux configurations pour comparaison, case « Afficher la monture » (cochée par défaut) qui révèle coloration, montage optimisé et paramètres avancés du biseau. Recentrage, vue de profil, règle de calibrage et légendes sont conservés.
6. **Vues et analyse des épaisseurs** : tableau des épaisseurs maximales/minimales au bord et au centre, diamètre utile, méridiens du tore, carte de face avec mesures à 30°, vues temporale, de dessus et de dessous, ainsi que les deux emplacements de comparaison. L'épaisseur centrale est une valeur unique par verre ; minima et maxima concernent les bords et les coupes.

Sur ordinateur, saisie à gauche et visualisation à droite ; sur tablette et mobile, lecture en sections successives. La navigation est collante et n'ajoute pas d'étapes à l'historique Android.

## Invariants vérifiés par comparaison de fichiers

- Les neuf formes natives (7 OMA + Pilote et Hexagone historiques), l'ordre, les contours et l'orientation OD/OG sont conservés ; `oma-shapes.js` n'est pas modifié.
- Les 30 éléments `input` d'origine (hors transformation volontaire de « Vue 1:1 » en checkbox) conservent leur HTML, types, valeurs par défaut et identifiants ; tous les `select` restent identiques.
- Aucun ancien identifiant HTML n'a disparu ; pas de doublon.
- Les fonctions `compute()`, `renderResult()`, `renderProfiles()`, `profileEyeHTML()`, `faceEyeHTML()`, `load3D()` restent identiques.
- Le moteur de photo, ses cinq étapes, la 3D, les profils, le calcul optique et les clés de stockage ne sont pas modifiés.
- Les sections et `details` possèdent un balisage équilibré ; les six ancres ciblent une section existante.
- Le traitement des profils comprend déjà la mesure de bord tous les 30° et l'axe/contre-axe du tore ; pas de nouvel algorithme de méridiens introduit.

## Interactions adaptées

- `btn-11` devient une checkbox, avec un gestionnaire `change` qui contrôle le même mode `scale11`, rafraîchit la règle et la 3D.
- `show-frame` pilote la visibilité de `frame-options` et de la légende de dépassement, sans effacer les choix précédents ; la visibilité des tracés en 3D reste contrôlée par le code existant.
- La copie OD → OG conserve son gestionnaire, ses cinq paramètres et un recalcul.
- Le parcours Entrée est aligné sur l'ordre du formulaire et ignore les champs dans les panneaux fermés.
- Les options de biseau et le calibrage 1:1 restent disponibles dans des panneaux natifs `details`, utilisables au clavier.

## Tests automatisés

Les tests préexistants sur les neuf contours, les références OMA et l'inversion OD/OG sont conservés.

De nouveaux tests dans `tests/epaisseur-verres-formes.test.mjs` exécutent, depuis le script réel de la page, les gestionnaires :
- du mode 1:1 (activation puis désactivation, rafraîchissement),
- de l'affichage de la monture (panneau d'options et légende),
- de la copie OD vers OG (sphère, cylindre, axe, demi-écart, hauteur).

La CI « Contrôle & hygiène » exécute ces tests, les contrôles de liens et le contrat de navigation. Le contrôle « Sécurité » est exécuté séparément.

## Recette manuelle restant nécessaire avant fusion

- Rendu Chromium / Firefox sur desktop (1280/1440), tablette (768), mobile (320/375), zoom 200 % et navigation clavier.
- Vérification visuelle de **chacune des neuf formes** et du sens OD/OG (nasal/temporal).
- Changement de forme après retouche manuelle A/B : conserver les valeurs saisies.
- Correction OD/OG sphérique, cylindrique, mixte ; bord mini/maxi, centre, diamètre utile et axes du tore.
- Visibilité monture, coloration, montage optimisé, positionnement manuel/déverrouillage du biseau.
- Rotation, zoom, déplacement, coupe 3D, échelle 1:1, règle calibrée.
- Comparaison 0/2 → 2/2 → retrait et re-sauvegarde.
- Assistant photo complet : import, OD/OG, miroir, rotation, boxing, retouche, nom, enregistrement.
- Fonctionnement du bouton retour Android/iOS, fermeture des panneaux/modale sans perte des saisies.

**Statut :** modifications codées et vérifications statiques/CI automatisées ; validation en navigateur réel restant à effectuer. Ne pas fusionner sur la seule base des captures de composition, qui ne représentent pas le moteur 3D exécuté.
