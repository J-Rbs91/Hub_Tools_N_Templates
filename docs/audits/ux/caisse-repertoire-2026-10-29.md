# UXER : répertoire professionnel, comptage de caisse

Date : 29 octobre 2026
Branche : `uxer/caisse-repertoire-20261029`
Base : `uxer/repertoire-professionnel-20261029` (PR #96)

## Diagnostic
L'outil couvre les pièces, billets, quatre moyens de paiement, réserve de monnaie, fond cible, montant du logiciel métier, différence calculée et historique de clôture.
L'interface existante présentait trois panneaux très colorés (« La Ferraille », « Le Papier », « L'Électronique ») et plusieurs couleurs sans fonction. Les chiffres étaient répartis sur deux rangées et l'historique requiert un défilement horizontal sur mobile.

## Refonte
- Style fond papier, titres discrets, filets fins, vert grisé ; suppression des aplats orange, vert, violet et bleu purement décoratifs.
- Six sections : 01 Pièces, 02 Billets, 03 Paiements, 04 Espèces comptées, 05 Écart de caisse, 06 Historique.
- Barre de navigation entre sections ; défilement sans ajouter d'étapes à l'historique du navigateur.
- Grilles adaptatives à trois colonnes sur grand écran, deux puis une colonne sur mobile.
- Champs de quantités et montants agrandis ; totaux avec chiffres tabulaires.
- Résultats d'écart conservent les couleurs fonctionnelles positif, négatif et états d'alerte.
- Historique conservé dans son conteneur à défilement horizontal.
- Légendes et actions plus courtes ; mention légale discrète, sans répétition.

## Invariants statiques contrôlés
- Script original complet identique, en particulier calculs, arrondis, contrôle de saisie, report de la veille et historique des 15 derniers jours.
- CSS d'origine inchangé ; règles complémentaires `@media screen`.
- Tous les identifiants de base préservés et pas de doublon.
- Aucun champ ajouté, retiré ou renommé.
- Clés persistantes `cloture-caisse-v1`, `cloture-fond-v1`, `cloture-fond-cible-v1` intactes.
- Six liens de navigation pour six sections réelles.
- Dépendance CI : retrait des espaces de fin de ligne sur la branche visuelle commune #96. La PR caisse ne doit pas réintroduire ces espaces.
- Petit script additionnel, indépendant, uniquement pour les liens internes.

## Recette restant à effectuer
Statut : VISUAL_UNVERIFIED.
- Navigateur réel : 320, 375, 768, 1024, 1440 px ; zoom à 200 %.
- Saisie des huit pièces et des six billets ; liaison quantité × valeur, totaux et calculs.
- Saisie CB, sans contact, Amex, autre, puis réserve, fond cible et montant logiciel métier.
- Vérification du calcul d'écart, y compris zéro, positif, négatif, et de l'avertissement de remise.
- Navigation clavier par Entrée, écrasement d'une valeur préremplie, limites de quantité et de montant.
- Enregistrement et mise à jour d'un jour déjà présent ; historique 15 jours, suppression.
- Préremplissage depuis le dernier comptage, réinitialisation et absence de perte historique.
- Historique mobile : défilement horizontal dans le tableau uniquement, sans débordement global.
- Contrôles iOS, clavier et lisibilité / contraste.

Hors périmètre : modification des formules ou du stockage, nouvelles fonctionnalités, calculateur d'épaisseur.
