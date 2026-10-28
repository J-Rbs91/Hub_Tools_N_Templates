# Audit de proximité des neuf formes du hub avec les exemples OMA

Date : 27 octobre 2026. Relevés de référence :
`references-oma/R1000_*.oma`, `R360_*.oma`, `STHKFMT.oma`.

## Méthode

- Œil droit des sept fichiers OMA (360 ou 1 000 rayons), radii convertis
  en millimètres par division par 100. Le calcul conserve tous les rayons.
- Contour de chaque gabarit `SHAPES` natif reconstruit avec ses 72 points.
- Centrages au **centre de boxing**, normalisation des deux silhouettes
  à la même boîte A/B. L'orientation horizontale directe et inversée est
  essayée pour le classement, sans conclure laquelle est vraie physiquement.
- Distance indiquée : écart radial quadratique moyen sur 120 directions,
  exprimé en pourcentage du rayon moyen de la forme du hub.
- **Attention : indice de ressemblance uniquement.** Ni écart en mm pour
  un montage ni preuve qu'il s'agit du même modèle de lunette.

## Trois voisins les plus proches pour chaque forme

| Forme native | Référence la plus proche | Écart normalisé | Deuxième | Troisième |
|---|---|---:|---|---|
| Rectangle | R1000_1 (Silhouette 1559) | 2,35 % | R1000_2 : 2,42 % | R360_1 : 2,87 % |
| Rectangle doux | R1000_2 (Silhouette 1575) | 2,14 % | R360_2 : 2,79 % | R360_1 : 2,80 % |
| Carrée | R1000_2 (Silhouette 1575) | 2,68 % | R1000_1 : 2,96 % | R360_1 : 3,04 % |
| Pantos | R1000_3 (Silhouette 7580) | 1,68 % | R360_3 : 3,53 % | R1000_2 : 3,59 % |
| Papillon | R1000_1 (Silhouette 1559) | 2,89 % | STHKFMT : 2,93 % | R1000_3 : 3,68 % |
| Hexagone | R360_1 | 3,42 % | R360_2 : 3,42 % | R1000_2 : 3,59 % |
| Ronde | R360_3 | 1,86 % | R1000_3 : 2,32 % | R1000_2 : 5,05 % |
| Pilote | STHKFMT | 5,15 % | R1000_1 : 5,48 % | R1000_2 : 5,60 % |
| Ovale | R1000_3 (Silhouette 7580) | 1,63 % | R360_3 : 2,16 % | R1000_2 : 4,44 % |

## Décisions

1. **Aucun remplacement direct accepté** sur les seules données de cette
   bibliothèque : chaque exemple appartient à une monture/référence
   particulière et plusieurs familles ne sont pas couvertes.
2. Pour `Pilote` et `Hexagone`, chercher d'autres OMA véritablement
   représentatifs : les voisins de ce lot sont trop génériques et les
   facettes / bas de goutte doivent être préservés.
3. Pour `Rectangle`, `Rectangle doux`, `Carrée`, `Pantos`,
   `Papillon`, `Ronde` et `Ovale`, les voisins peuvent servir à
   repérer les zones de rupture de courbure, pas à les remplacer par
   leur contour complet.
4. Avant un remplacement d'un gabarit natif : sélectionner une
   référence fabricant vérifiée, comparer le contour **à échelle réelle**
   avec une forme de verre taillé réel ou un gabarit, contrôler nasal,
   temporal, haut/bas, boxing, perçage s'il existe, puis mesurer les
   variations de rayon et les résultats du moteur de calcul.
5. Les échantillons dans le dépôt ne doivent pas être considérés comme
   libres de droits industriels au-delà du contexte de la licence des
   exemples. Voir `references-oma/NOTICE.md`.

## Limites de la recette

Tests structurels automatisés sur les fichiers et le parser réalisés
par la CI. Une vérification de l'interface sur appareil réel et une
comparaison avec les gabarits physiques ne sont **pas** encore prouvées
par ce rapport.

## Actualisation HF-023 (28 octobre 2026)

Les sept références OMA présentées ici sont maintenant directement sélectionnables
et utilisées dans le calculateur pour estimer l'épaisseur. Cette intégration
ne **substitue pas** un relevé OMA à l'une des neuf familles : chaque entrée OMA
a sa propre référence et conserve ses 360 ou 1 000 rayons par œil.
Les neuf familles historiques sont restaurées **sans rotation** et sans renommage.
Les rotations de la galerie précédente n'étaient qu'une correction de présentation.
Les indices de proximité ci-dessus restent des indicateurs exploratoires,
pas des recommandations de remplacement automatique ni de taillage.
