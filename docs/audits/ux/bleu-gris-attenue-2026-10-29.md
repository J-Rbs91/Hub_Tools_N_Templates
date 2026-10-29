# UXER — Palette bleu gris atténué

Date : 29 octobre 2026  
Branche : `uxer/bleu-gris-attenue-20261029`  
Statut : palette validée en comparaison d'images ; recette navigateur des écrans réels à effectuer.

## Intention
Conserver la composition « Répertoire professionnel » et remplacer le vert sauge par un bleu gris plus désaturé. Préserver la sobriété, le contraste et les couleurs de signification professionnelle.

| Rôle | Couleur |
|---|---|
| Accent, boutons principaux, focus | `#475569` |
| Accent foncé, survol et liens | `#3D4A5B` |
| Texte secondaire/indication | `#626E7C` |
| Secondaire tertiaire | `#6B7280` |
| Bordure | `#DDE3E9` |
| Fond | `#FAFBFC` |
| Surface | `#FFFFFF` |

Contrast ratio calculé sur le fond `#FAFBFC` : accent **7,31:1**, texte secondaire **5,02:1**, tertiaire **4,67:1**. Texte blanc sur accent : **7,58:1**.

## Implémentation
`assets/css/theme-bleu-gris.css` est chargé **en dernier** sur les 13 pages publiques et techniques du hub. Les styles historiques et variables de chaque écran restent présents pour l'autonomie du site. Le thème unifié définit la palette et surcharge les surfaces décoratives résiduelles sans toucher aux scripts.

Pages couvertes :
- Accueil et CGU.
- Cinq outils : Campagne e-mail, Clôture de caisse, Demande / Ordonnance, Épaisseur des verres, Lentilles souples.
- Six documents : RGPD, sauvegarde, synchronisation Drive, installation campagne, comparateur OMA et scanner.

Les commandes, états de sélection, cartes, champs et barres de navigation suivent l'accent gris bleuté. Les vues optiques, les indicateurs de réussite ou d'échec et les avertissements métier ne sont pas recolorés.

## Garde-fous
- Aucun JS, aucun moteur d'épaisseur, aucun modèle de courrier ni donnée modifiée.
- Aucun nouveau service réseau ni ressource tierce : feuille CSS sur la même origine.
- `@media screen` dans le thème : aucun impact recherché sur les styles `@media print`, en particulier la sortie A4 de l'ordonnance.
- Un test automatisé (`tests/theme-bleu-gris.test.mjs`) vérifie les 13 pages, le chargement après leur CSS, les tokens, le contraste, et l'absence de règle d'impression dans le thème.
- Statuts de validation métier gardés distincts.

## Recette restante
Vérifier en navigateurs réels (desktop, Android, iOS) le contraste, le focus, les états hover/actif, les tableaux de caisse, les 9 silhouettes et la 3D, la modale « Mon magasin », les pages de documentation et l'impression A4. Ne pas fusionner sans contrôle des CI et validation visuelle.
