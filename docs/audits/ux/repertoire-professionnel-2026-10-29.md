# UXER : refonte Répertoire professionnel

Date : 2026-10-29
Branche : `uxer/repertoire-professionnel-20261029`
Profil : standard (cadrage, direction, implémentation, revue statique)

## Brief et limites
Refaire l'habillage du hub d'outils d'optique. Direction 03 validée.
Sobre, minimaliste, professionnel, textes de l'accueil télégraphiques.
Ne pas répéter les promesses de confidentialité. Éviter le tiret cadratin dans la rédaction.
Hors périmètre : toute modification de la mise en page et du texte de Demande / Ordonnance.
Phase ultérieure : refonte de la navigation et de la saisie du calculateur d'épaisseur.

## Diagnostic initial
Accueil avec deux colonnes de cartes, icônes animées, éphéméride, filigrane, longues descriptions repliées.
Couleurs bleues dominantes et fonds animés dans plusieurs outils.
Page de documents éclatée en cartes.
Chaque outil fonctionne avec son HTML/CSS/JS autonome ; aucune bibliothèque distante.

## Direction
Répertoire numéroté, séparation par filets fins, fond papier, vert grisé, titrage de forte lisibilité.
Hiérarchie : nom > fonction courte > état d'accès.
L'information règlementaire et les précisions techniques restent dans leurs pages dédiées.
Identité de référence : `.uxer/identity.md`.

## Travaux
- `index.html` : textes courts et réduction de l'accueil, tout en gardant les identifiants des scripts et la modale magasin.
- `assets/css/repertoire.css` : direction visuelle du hub, chargée après les styles existants pour réduire le risque de régression.
- Clôture, épaisseur, lentilles, campagne et trois documents : palette et traitement des surfaces uniquement.
- Aucun outil actuellement verrouillé n'est ouvert par cette refonte.

## Contrôles
Vérification statique : revue des chemins, ID indispensables, liens, structure des cartes et portée des changements.
À effectuer avant fusion : rendu navigateur réel desktop et mobile 320px, zoom 200 %, clavier, modale magasin, sauvegarde / restauration, retour aux outils, états d'accès, contrastes et versions imprimées.
Contrôler aussi : calculs OD/OG, contours OMA, 3D, caisse, lentilles, campagne fermée.
Rendu navigateur de cette branche : NON VÉRIFIÉ dans cet environnement (navigateur distant non disponible).

## Phase 2
Avec UXER navigation-audit, revoir entièrement navigation et saisie du calculateur d'épaisseur.
Préserver les formules, les formes validées et l'orientation OD/OG.
Exiger des tests fonctionnels et visuels séparés avant toute fusion.
