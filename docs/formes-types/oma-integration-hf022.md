# HF-022 / HF-024 — correspondance des contours du calculateur

Le sélecteur conserve exactement ses **neuf noms, clés et ordre**. Après HF-024
(seconde correction demandée), **sept** formes utilisent de vrais contours OMA.
Les deux formes **Pilote** et **Hexagone** utilisent les contours historiques
du calculateur.

| Clé interne | Nom affiché | Géométrie active |
| --- | --- | --- |
| rectangle | Rectangle | `R360_1.oma` — 360 rayons / œil |
| rectangledoux | Rectangle doux | `R360_2.oma` — 360 rayons / œil |
| carree | Carrée | `R1000_1.oma` — 1 000 rayons / œil |
| pantos | Pantos | `R1000_2.oma` — 1 000 rayons / œil |
| papillon | Papillon | `STHKFMT.oma` — 360 rayons / œil |
| hexagone | Hexagone | **Historique** — OMA Silhouette 5586/OX indisponible |
| ronde | Ronde | `R1000_3.oma` — 1 000 rayons / œil |
| pilote | Pilote | **Historique rétabli** — 54 × 48 mm, 72 points |
| ovale | Ovale | `R360_3.oma` — 360 rayons / œil |

L'affectation des sept OMA aux familles a été faite par rapprochement géométrique ;
cela ne garantit pas la représentativité d'un modèle commercial ni la compatibilité
avec la monture d'un client. Le relevé GlassOn Teardrop reste archivé dans
`references-oma/` comme référence mais **n'est plus importé** dans le calculateur,
sur demande de l'utilisateur.

## Repères OD/OG — correction HF-024

Conformément à **ISO 16284, sections 5.4.9 à 5.4.12** :

- les rayons des deux relevés sont lus à partir de 0°, position **3 heures**,
  en sens trigonométrique ;
- pour le relevé `TRCFMT=...;R;...`, ce premier rayon est côté **nasal**,
  pour `TRCFMT=...;L;...`, il est côté **temporal**, en vue de face ;
- le calculateur emploie le repère canonique **temporal = +X**, **haut = +Y**
  pour chaque œil : les coordonnées X du relevé R sont réfléchies, celles
  du relevé L ne le sont pas ;
- les points du relevé R sont replacés dans l'ordre trigonométrique après
  cette réflexion. Le fichier R reste affecté à **OD**, et L à **OG**.

Cela corrige l'inversion de sens de HF-022 **sans faire pivoter les formes
de 180°**. Le moteur utilise tous les rayons d'origine, sans lissage, pour
les épaisseurs, les diamètres minimum et les vues.

Le test `tests/oma-calculateur-live.test.mjs` vérifie l'identité aux sources
des relevés R/L, leur orientation nasal/temporal, les intersections radiales
rapides et exhaustives, les noms inchangés ainsi que l'identité exacte du
Pilote et de l'Hexagone avec les formes d'avant l'intégration OMA.

## Limites

Les formes servent à une **estimation** de l'épaisseur, non à certifier
le taillage d'une monture de client. Les fichiers sont conservés en
provenance dans `references-oma/NOTICE.md`, avec réserves sur les droits
industriels sous-jacents. Le contour Hexagone OMA 5586/OX ne doit pas être
inventé à partir d'une photographie.
