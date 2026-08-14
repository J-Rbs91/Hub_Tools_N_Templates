# Importer une forme type dans « Épaisseur des verres »

Procédure pour remplacer un gabarit de forme de l'outil `outils/epaisseur-verres/` par le relevé
d'un **verre taillé réel**, photographié à plat.

Le relevé porte sur le verre lui-même : c'est la référence la plus fidèle possible, sans le biais
de la portée du drageoir qu'on subit en détourant l'ouverture d'un cerclage sur une photo de
catalogue.

Tout se fait dans le navigateur avec **[`scanner.html`](scanner.html)** : ouvrez simplement le
fichier, aucune installation, aucun envoi de fichier. La photo est lue en mémoire et n'en sort pas.

---

## 1. Préparer la feuille

Sur une feuille blanche unie, tracer au feutre noir fin **trois repères** :

| Repère | Rôle | Sans lui |
|---|---|---|
| Un **trait** droit, traversant l'emplacement du verre | Donne l'horizontale (ligne 0–180) du verre | Le scanner ne peut pas redresser le verre |
| Un **N** à l'extrémité **nasale** du trait | Donne le côté nez, donc le sens temporal/nasal | La forme peut sortir en miroir |
| Une **flèche ↑** vers le **haut du verre**, en marge | Lève l'ambiguïté haut/bas | Il faut renseigner le sens à la main dans le scanner |

Le trait doit **dépasser largement le verre des deux côtés** : c'est sur cette partie visible, hors
du verre, que son angle est mesuré. Un trait qui s'arrête au bord du verre ne suffit pas.

Poser ensuite le verre sur le trait, **face avant vers le haut**. Le verre n'a pas besoin d'être
d'aplomb dans la photo : son inclinaison est mesurée sur le trait et corrigée automatiquement.

> **Pourquoi la flèche ?** Le trait donne l'axe et le N donne le nasal, mais la lettre N est
> symétrique à 180° : tournée dans un sens ou dans l'autre elle se lit pareil. Elle ne peut donc
> pas dire où est le haut du verre. La flèche, elle, n'a aucune symétrie.

---

## 2. Photographier

- Appareil **bien au-dessus et parallèle** à la feuille. Une prise de vue de biais déforme la
  forme, et cela ne se rattrape pas — c'est le seul défaut réellement rédhibitoire.
- Le verre doit **remplir une bonne part de l'image** (viser au moins 10 % de la surface) : la
  précision du contour se joue là.
- Ombres et lumière ambiante : sans importance, le seuillage s'y adapte.
- **Reflets sur le chant** : c'est le vrai piège. Un verre qui accroche la lumière sur sa tranche
  donne une bande claire prise pour du fond, et le contour rentre dans la matière — un angle
  devient un méplat. Deux parades : éclairage diffus (pas de source directe), ou, en cas de verre
  très brillant, contourner le problème (voir § 6).

---

## 3. Relever le contour

Ouvrir `scanner.html`, déposer la photo. Le scanner enchaîne :

1. **Seuillage** verre / fond, choisi par balayage : on retient le palier où l'aire détectée ne
   bouge plus. En dessous le verre se disloque, au-dessus il avale les ombres.
2. **Ouverture morphologique**, qui efface le trait tracé sans entamer le verre.
3. **Mesure de l'angle du trait** par analyse en composantes principales sur les pixels sombres
   situés hors du verre.
4. **Repérage du N**, la tache compacte écartée du trait : son extrémité donne le côté nasal.
5. **Balayage radial** du contour dans le repère redressé, de l'extérieur vers l'intérieur.
6. **Réparation des morsures de reflet** par enveloppe convexe : un verre taillé a un contour
   convexe, donc toute rentrée est un artefact. Au-delà de 9 % d'écart le relevé est conservé,
   car il s'agit alors d'une concavité voulue (goutte nasale d'un aviateur).
7. **Lissage** par série de Fourier tronquée (16 harmoniques) : ôte le grain du seuillage sans
   toucher aux méplats ni aux angles, puis échantillonnage en 72 points.

Réglages disponibles : sens du haut, côte A, seuil manuel si le contour décroche, et
désactivation de la réparation convexe.

---

## 4. Vérifier

Le scanner affiche une liste de contrôles. Tous doivent être au vert avant d'intégrer :

- [ ] **Le contour vert épouse le verre** sur l'image de contrôle — c'est la vérification qui
      prime sur toutes les autres, regardez-la de près, notamment aux angles.
- [ ] Le trait est repéré sur un nombre suffisant de pixels hors du verre.
- [ ] Le verre occupe assez d'image.
- [ ] Le rapport A/B est supérieur à 1 : un verre plus haut que large n'existe pas sur une
      monture, et signale presque toujours un mauvais réglage du haut.
- [ ] La part de contour reprise sur l'enveloppe convexe reste modérée. Beaucoup = reflets
      marqués, donc contour à contrôler à l'œil.
- [ ] Le contour est **étoilé depuis le centre-boîte** : c'est l'hypothèse dont dépendent
      `frameRadius` et `inContour` dans l'outil. Une rentrée trop profonde fausserait le calcul.
- [ ] Les côtes tombent dans les bornes de l'outil (A de 28 à 70 mm, B de 14 à 60 mm).

---

## 5. Intégrer

1. Copier le bloc produit par le scanner.
2. L'ouvrir dans `outils/epaisseur-verres/index.html`, objet `SHAPES`, et **remplacer l'entrée de
   même clé**. Ne pas changer l'ordre des clés : `SHAPE_KEYS` fixe l'ordre du sélecteur, réglé sur
   la fréquence réelle des formes au catalogue.
3. Format attendu, à respecter tel quel : 72 points en sens trigonométrique depuis 3 h, repère
   canonique **x = temporal, y = haut**, contour normalisé pour toucher exactement les quatre
   côtés de la boîte (c'est la définition du boxing).
4. Relancer les contrôles du dépôt :

```sh
npx --yes html-validate@11.5.6 "**/*.html"
git grep -nIP ' +$' -- ':!*.md'    # aucune sortie attendue
git grep -lIP '\r$' -- .           # aucune sortie attendue
```

5. Ouvrir l'outil dans un navigateur, sélectionner la forme, et vérifier que la 3D, les profils et
   la cartographie se calculent sans erreur console.

---

## 6. Pièges rencontrés

- **Photo tournée d'un quart de tour.** L'orientation enregistrée par le téléphone n'est pas
  toujours restituée à l'identique. Sans importance : le trait porte l'horizontale, et le scanner
  redresse. C'est bien pour cela qu'on trace le trait plutôt que de compter sur le cadrage.
- **Le N ne suffit pas.** Voir § 1 : symétrique à 180°. D'où la flèche.
- **Reflet sur le chant.** Symptôme : un angle sorti en méplat. Si la réparation convexe ne suffit
  pas, deux solutions — refaire la photo en lumière diffuse, ou **tracer le contour du verre au
  crayon sur la feuille**, retirer le verre, et photographier le dessin. Un trait de crayon ne
  réfléchit rien ; le scanner détoure alors la ligne au lieu du verre, avec le même protocole de
  repères.
- **Verre solaire dégradé.** Le seuillage ne capte que la partie sombre du dégradé. Photographier
  plutôt sur fond noir, ou passer par le tracé au crayon.

---

## 7. Relever une forme client sans passer par ici

L'outil embarque déjà un relevé sur photo, accessible aux équipes en magasin :
bouton **« Forme perso d'après une photo du verre »**. Il vise le cas d'un client particulier —
la forme est mémorisée dans le navigateur du poste, elle ne rejoint pas le dépôt.

La présente procédure sert à l'autre besoin : faire entrer une forme dans les **gabarits livrés
avec l'outil**, pour tout le monde.
