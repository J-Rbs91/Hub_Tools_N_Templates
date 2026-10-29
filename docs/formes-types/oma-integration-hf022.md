# HF-022 — correspondances OMA du calculateur d'épaisseur

Les neuf **noms et identifiants** de formes du hub restent inchangés. Les sept
références OMA déjà présentées, plus la référence Pilote GlassOn, remplacent les
géométries correspondantes dans le **moteur du calculateur** : épaisseurs,
diamètre de palet, vues 2D et 3D. Les formes OD et OG proviennent des relevés
distincts des fichiers et gardent leurs rayons d'origine.

| Clé interne (inchangée) | Nom affiché (inchangé) | Fichier OMA utilisé | Résolution |
| --- | --- | --- | --- |
| rectangle | Rectangle | R360_1.oma | 360 rayons / œil |
| rectangledoux | Rectangle doux | R360_2.oma | 360 rayons / œil |
| carree | Carrée | R1000_1.oma | 1 000 rayons / œil |
| pantos | Pantos | R1000_2.oma | 1 000 rayons / œil |
| papillon | Papillon | STHKFMT.oma | 360 rayons / œil |
| hexagone | Hexagone | **En attente : Silhouette 5586/OX** | 72 points historiques conservés |
| ronde | Ronde | R1000_3.oma | 1 000 rayons / œil |
| pilote | Pilote | GlassOn_Teardrop_53x35_72.oma | 1 000 rayons / œil |
| ovale | Ovale | R360_3.oma | 360 rayons / œil |

Les associations des sept premiers fichiers sont une affectation algorithmique
*unique* minimisant l'écart quadratique radial normalisé avec les familles
historiques. **Elles ne prouvent pas la forme commerciale réelle** :
certaines silhouettes d'exemple se ressemblent beaucoup ; le « Papillon »
notamment mérite une comparaison avec une vraie monture cat-eye. Les sept
fichiers ont été acceptés visuellement par l'utilisateur, mais cette validation
n'indique pas une correspondance fichier-par-famille. La traçabilité explicite
permet de corriger l'affectation si nécessaire sans renommer les familles.

Le fichier OMA GlassOn provient de
https://glasson.io/assets/rimless/glasson-rimless-shape-teardrop.oma ;
il contient les métadonnées de boxing **53,00 × 35,72 mm** et les tracés
d'origine sur les deux côtés. Les champs de perçage sont ignorés.

## Orientation et représentation

- Le repère interne est **temporal +X, haut +Y** ; la miniature OD applique
  son miroir de face. Aucune rotation arbitraire de 180° liée aux anciennes
  présentations ChatGPT.
- Les rayons OMA sont assemblés en polygones à leur résolution native, sans
  interpolation ou lissage. Le détecteur d'arête utilise une recherche binaire
  sur leurs directions et l'intersection linéaire exacte.
- Le boxing A/B proposé est calculé depuis le fichier ; les dimensions
  restent modifiables par l'utilisateur.
- Le gabarit Hexagone reste **l'original**, tant que le fichier constructeur
  exact **Silhouette The Visionary 5586/OX** est inaccessible. Le calculateur
  l'indique dans la note sous les formes et dans le titre de sa vignette.

## Limites et contrôle d'atelier

Ces contours sont des références numériques pour une **estimation** de
l'épaisseur. Ils ne certifient pas la forme d'une monture client et ne
remplacent ni un relevé de calibre ni les réglages de la meuleuse.

L'utilisation et la rediffusion des tracés de fabricants peuvent être soumises
à des droits propres. Les vérifications de provenance et d'attribution restent
documentées dans `references-oma/NOTICE.md` et
`THIRD-PARTY-NOTICES.md`.

Tests de non-régression : `tests/oma-calculateur-live.test.mjs`.
Le test vérifie les **rayons OMA exacts** des huit sources, leurs deux côtés,
les neuf noms, l'Hexagone conservé et l'égalité des recherches d'intersection
rapide/exhaustive sur les 120 méridiens.
