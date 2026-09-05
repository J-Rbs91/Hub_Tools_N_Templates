# Research -- Module Lentilles souples : moteurs optiques, catalogue fabricant local et interface Hub

Profondeur : `extended` (profil `critical`, cf. DEC-0001).
Base revalidée : `Hub_Tools_N_Templates` `main` = `66753b46103dcd427b88056c6410630bc9b5bb96`,
branche de travail `claude/arcline-soft-lens-module-oc1634` (identique à `main` au démarrage,
aucune PR ouverte). `Arcline` = `5fcbc0126938ee6e6d72c8ed1747a308b218797d`.

## Problem

Un opticien qui adapte une lentille souple enchaîne aujourd'hui trois opérations à la main,
avec une calculatrice et un catalogue papier ou un site tiers :

1. passer d'une correction de lunettes à une correction au plan cornéen, ce qui demande de
   compenser la distance verre-oeil sur les deux méridiens principaux et non sur la seule
   sphère ;
2. combiner la lentille déjà portée avec une surréfraction, ce qui n'est pas une addition de
   sphères et de cylindres dès que les axes diffèrent, et qui se complique encore quand la
   lentille torique tourne sur l'oeil ;
3. rapprocher le résultat de ce qu'un fabricant produit réellement, sachant qu'une gamme
   n'existe qu'à certains pas de sphère, à certaines valeurs de cylindre et à certains axes.

Chacune de ces étapes a une réponse déterministe. Le risque n'est pas la difficulté du calcul,
c'est la perte de traçabilité : dans la pratique manuelle la valeur théorique disparaît derrière
la valeur arrondie, et l'arrondi disparaît derrière ce que le fabricant sait faire. On finit par
ne plus savoir de quelle étape vient un écart.

Le problème réel à résoudre n'est donc pas « calculer », c'est **rendre les quatre valeurs
simultanément visibles et attribuables** : saisie, théorique, cible arrondie, paramètre fabricant
disponible. Et le faire dans un hub qui n'a ni backend, ni build, ni framework, et dont la règle
première est qu'aucune donnée saisie ne quitte l'appareil.

## Known facts

Ce qui suit est établi : soit vérifié contre une source citée en fin de document, soit lu
directement dans le dépôt à l'aide de la commande indiquée. Rien n'y est repris de la demande
sans contrôle.

### Formules optiques revalidées

Aucune formule n'a été reprise de la demande sans contrôle. Ce qui suit est ce qui a été vérifié.

**Compensation de distance vertex.** La puissance équivalente au plan cornéen d'un verre de
puissance `F` porté à la distance `d` (en mètres) est :

    F_cornee = 1 / (1/F_verre - d)   =   F_verre / (1 - d * F_verre)

Les deux écritures sont algébriquement identiques. `d` est positif quand on rapproche le plan
correcteur de l'oeil : passer du verre de lunettes à la lentille est donc toujours `d > 0`.
Conséquence de signe, vérifiée numériquement : un verre négatif devient moins négatif
(`-8.00 D` à 12 mm donne `-7.2993 D`), un verre positif devient plus positif
(`+8.00 D` à 12 mm donne `+8.8496 D`). La transformation inverse (cornée vers lunettes) est
`F_verre = 1 / (1/F_cornee + d)`, ce qui redonne bien `-8.00` à partir de `-7.2993`.

**Sphéro-cylindrique.** L'axe ne change pas avec la distance vertex. La compensation se fait
méridien par méridien : `M1 = S` (méridien de l'axe) et `M2 = S + C` (méridien à 90° de l'axe)
en convention cylindre négatif ; chaque méridien est compensé séparément, puis
`S' = M1'`, `C' = M2' - M1'`, `axe' = axe`. Compenser la seule sphère est faux dès que le
cylindre est significatif, parce que les deux méridiens n'ont pas le même facteur `1/(1 - dF)`.

**Vecteurs de puissance (Thibos).** La forme retenue est celle de la publication d'origine :

    M   = S + C/2
    J0  = -(C/2) * cos(2 * axe)
    J45 = -(C/2) * sin(2 * axe)

et la transformation inverse :

    J    = sqrt(J0^2 + J45^2)
    C    = -2 * J
    axe  = (1/2) * atan2(J45, J0)      normalisé sur ]0, 180]
    S    = M - C/2

Contrôle de cohérence effectué à la main sur les quatre axes cardinaux (0/180, 45, 90, 135) :
la conversion aller-retour redonne exactement la prescription de départ en convention cylindre
négatif, `atan2` étant nécessaire pour lever l'ambiguïté de quadrant que `atan(J45/J0)` laisse.
La longueur du vecteur, `B = sqrt(M^2 + J0^2 + J45^2)`, est la « force de flou » globale : c'est
elle qui donnera une métrique d'écart déterministe pour le score fabricant.

**Combinaison de deux corrections.** Deux corrections sphéro-cylindriques exprimées au même plan
s'additionnent composante par composante dans l'espace `(M, J0, J45)`, puis la somme est
retransformée. C'est exactement pour cela que la représentation existe : `S1+S2` / `C1+C2` n'est
correct que si les axes coïncident, et faux sinon.

**Transposition.** `S' = S + C`, `C' = -C`, `axe' = axe ± 90` ramené dans le domaine. La
transposition est une réécriture de la même lentille, pas une modification : elle laisse
`(M, J0, J45)` invariant, ce qui donne un contrôle de non-régression exact et gratuit.

**Domaine d'axe.** La notation ophtalmique utilise `]0, 180]` : l'axe horizontal s'écrit `180`
et jamais `0`. La normalisation retenue est donc `((a - 1) mod 180) + 1` sur les entiers, ce qui
envoie `0` et `360` sur `180` et laisse `1..180` inchangé.

**Rotation torique et règle LARS.** « Left Add, Right Subtract » : le sens est jugé du point de
vue du praticien qui regarde l'oeil, et il s'applique à l'axe à commander. Une rotation du repère
vers la gauche du praticien correspond, dans la notation d'axe (angles croissants dans le sens
trigonométrique vu de l'observateur), à une diminution de l'axe réellement porté ; il faut donc
ajouter la rotation observée à l'axe voulu pour que la lentille commandée retombe au bon endroit.
Les deux formulations rencontrées dans la littérature clinique (« vers la gauche » et « dans le
sens horaire vu de l'observateur ») décrivent le même mouvement : sur un cadran vu de face, un
repère à 6 h qui part vers la gauche de l'observateur va de 6 h vers 7 h, ce qui est bien le sens
horaire. Conséquence, sous une convention de signe unique `r = +rotation` à gauche et
`r = -rotation` à droite :

    axe réellement porté  = normalizeAxis(axe_lentille - r)
    axe à commander       = normalizeAxis(axe_voulu    + r)

Les deux expressions sont réciproques, et le cas trivial le vérifie : une lentille marquée 180
qui tourne de 10° à gauche porte réellement l'axe 170 ; si la surréfraction est nulle, la
correction voulue *est* 170, et l'axe à commander redevient 180, c'est-à-dire la même lentille.
Une compensation qui ne se réduit pas à l'identité dans ce cas serait fausse.

**Ordre de grandeur clinique associé.** Chaque degré de désalignement laisse environ 3 % du
cylindre non corrigé, donc 10° en laissent environ un tiers. C'est une recommandation clinique,
pas une convention mathématique : elle sert à formuler un avertissement, jamais à modifier un
calcul.

### Faits établis sur le dépôt

- Le site est entièrement statique : `grep -rn "fetch(\|XMLHttpRequest\|import("` sur tous les
  `*.html` ne renvoie **rien**. Aucun outil ne charge quoi que ce soit dynamiquement aujourd'hui.
- Aucun `package.json`, aucun `node_modules`, aucun build. Node n'est utilisé que par `npx` pour
  `html-validate` et par `node tests/navigation-retour.test.mjs`.
- La CSP de chaque outil est identique et autorise `script-src 'self' 'unsafe-inline'
  https://gc.zgo.at`. Un `<script src="...">` **de même origine** est donc déjà autorisé par la
  CSP en vigueur, sans la modifier.
- `tests/navigation-retour.test.mjs` compare le bloc `Couches` de chaque fichier porteur, ligne à
  ligne après `trim()`, du marqueur `var Couches = (function () {` jusqu'au premier `})();`
  suivant. Une copie non identique fait échouer la CI.
- Le même test impose à tout dossier sous `outils/` : la classe `.ios-back`, la détection
  `is-ios` avec `/iPad|iPhone|iPod/`, et un `href="../../"`.
- Le dernier numéro de commit utilisé est `HF-048` (`git log --all | grep -oP 'HF-\d+' | sort -u`).
- L'échelle de jetons visuels est déclarée dans `assets/css/hub.css` et **recopiée localement**
  dans chaque outil : les outils ne l'importent pas.
- Les identifiants du code mêlent déjà français et anglais (`loadProfil`, `sanitizeProfil`,
  `openModal`, `renderHeader`, `fermerJusqua`). La règle de langue du dépôt porte sur les textes
  visibles, pas sur les identifiants.

### Faits établis sur SECURIX

- `SECURIX_HOME` a été rendu disponible (`b8074bf369ef6e44987307a09a442be9001521bc`) et
  `jsonschema` installé, sans quoi `select_rules.py` ne démarre pas.
- Le dépôt n'avait aucun `project-security-profile.yaml`. `derive_profile.py` en a proposé un,
  avec 94 capacités non tranchées ; SECURIX refuse d'exploiter une proposition
  (`derived.proposal: true`), ce qui est le comportement attendu.
- Un profil curé a été rédigé et adopté (DEC-0003). `select_rules.py` sélectionne alors
  **108 règles applicables** (19 critical, 69 high, 20 medium).
- `run_controls.py` exécuté sur le SHA de base a lancé 8 contrôles couvrant 13 des 108 règles.
  Sept renvoient `NOT_DETECTED` en confiance basse ; `CTRL-FE-DANGEROUS-SINKS` renvoie
  `SUSPECTED` avec 22 occurrences, toutes préexistantes au module. C'est un fait à retenir pour
  la conception : le module ne doit pas ajouter d'écriture de contenu par `innerHTML`.

## Unknowns

- **UNK-002, politique d'égalité d'arrondi.** Toujours ouverte à la fin de RESEARCH : c'est une
  décision de conception, pas un fait à découvrir. Le point établi est qu'aucune source
  autoritative ne fixe une règle universelle pour une valeur exactement à mi-chemin entre deux
  pas de 0,25 D ; les usages cliniques varient (« ne pas sur-corriger en négatif » est une
  recommandation, pas une convention de calcul). DESIGN doit donc choisir une règle
  déterministe, la documenter, et rendre le cas visible plutôt que de le trancher en silence.
- **UNK-003, format du catalogue** et **UNK-004, mécanisme de test du noyau.** Les faits sont
  réunis (voir « Existing patterns » et « Constraints ») ; le choix appartient à DESIGN et sera
  consigné en DEC.
- **Portée réelle de l'assurance SECURIX.** Le profil adopté décrit le dépôt entier, donc la
  revue « ALL_APPLICABLE » porte sur 108 règles couvrant quatre outils préexistants. Savoir si
  cette revue complète est atteignable dans cette mission reste ouvert ; ce qui est certain,
  c'est qu'elle ne sera pas déclarée faite si elle ne l'est pas.
- **Comportement réel sur téléphone.** Aucune automatisation navigateur n'est présente dans le
  dépôt et en ajouter une serait disproportionné. Le contrat de navigation arrière prévoit
  explicitement une vérification manuelle en six points (`docs/navigation-retour.md`) ; ce qui
  n'aura pas été constaté sur un appareil restera `NOT_RUN`.
- **Aucun paramètre fabricant réel n'est connu de façon vérifiable ici.** La V1 n'en contiendra
  donc aucun : uniquement des données explicitement fictives.

## Existing implementation

Il n'existe **aucune** implémentation de calcul de lentilles dans le dépôt. Les quatre outils
présents sont :

- `outils/demande-ordonnance/` (989 lignes) : formulaire, export PDF par `window.print()`,
  copie presse-papiers HTML via `ClipboardItem`. Outil « simple » de référence.
- `outils/cloture-caisse/` (1352 lignes) : saisie chiffrée, historique `localStorage`, modale de
  réglages routée par `Couches`.
- `outils/campagne-email/` (1980 lignes) : import CSV côté client, JSONP vers un endpoint Apps
  Script fourni par le magasin.
- `outils/epaisseur-verres/` (3555 lignes) : outil « complexe » de référence. Analyse d'image en
  canvas 2D, gabarits `SHAPES` de contours à 72 points **codés en dur dans le fichier**, gestion
  de poignées au pointeur. C'est le seul précédent d'un outil portant à la fois un moteur de
  calcul et un jeu de données.

Deux enseignements directs. D'abord, un outil de 3555 lignes reste tenable en un fichier tant que
ses données sont un tableau de constantes figées ; ce n'est plus le cas quand les données sont
destinées à croître et à être revérifiées une par une contre une source. Ensuite, aucun outil
n'expose aujourd'hui de fonction pure testable : `epaisseur-verres` n'a aucun test unitaire, et
c'est précisément la limite que la présente mission refuse de reproduire.

## Relevant files

- `CLAUDE.md` : gouvernance ; « Adding a new tool » (9 points), règle de l'em-dash, profil magasin.
- `CONTRIBUTING.md:37-50` : « Outils autonomes : chaque outil vit dans `outils/<nom>/index.html`,
  en un seul fichier (CSS et JS *inline*), sans bibliothèque tierce ni import partagé. »
- `SECURITY.md` : modèle de confidentialité, seule ressource externe autorisée.
- `index.html:133` : `<ul id="tools-grid">`, structure d'une `li.tool-card`.
- `index.html:503-572` : bloc `Couches`, à recopier caractère pour caractère.
- `assets/css/hub.css:1-70` : jetons de couleur, rayons, élévations, espacements, typographie.
- `outils/cloture-caisse/index.html:7` : CSP de référence d'un outil.
- `outils/cloture-caisse/index.html:110-130` : styles `.ios-back`.
- `outils/demande-ordonnance/index.html:264` : balise `<a class="ios-back" href="../../">`.
- `outils/demande-ordonnance/index.html:421-424` : `<p class="mesure-note">`.
- `outils/demande-ordonnance/index.html:986-988` : script GoatCounter avant `</body>`.
- `tests/navigation-retour.test.mjs:44-120` : les trois familles de contrôles structurels.
- `.github/workflows/ci.yml:76-90` : job `navigation`, `container: node:22`, `node tests/...`.
- `.github/workflows/ci.yml:92-102` : job `html-validate`, version épinglée `11.5.6`.
- `docs/navigation-retour.md` : contrat `Couches` et les six vérifications manuelles.
- `.htmlvalidate.json` : six règles activées, `extends: []`.

## Existing patterns

- **Un outil = un dossier sous `outils/` contenant `index.html`.** Aucun outil n'a de fichier
  frère aujourd'hui.
- **Aucune requête réseau.** Toute donnée est soit saisie, soit constante dans le fichier, soit
  lue depuis `localStorage`.
- **Jetons visuels redéclarés localement** dans le `:root` de chaque outil.
- **`Couches` recopié à l'identique**, fermeture toujours routée par `Couches.fermer()`.
- **Bouton retour flottant iOS** masquant le retour d'en-tête via `body.is-ios .back-link`.
- **Profil magasin lu, jamais écrit** par un outil ; repli neutre quand il est vide.
- **Impression comme export** : `@media print` plutôt qu'une bibliothèque PDF.
- **Commentaires longs en français** expliquant le pourquoi, y compris dans le HTML.

### Ce que la CSP autorise réellement

C'est le fait technique déterminant pour le choix de format du catalogue et pour la testabilité :

| mécanisme | autorisé par la CSP actuelle | fonctionne en `file://` | lisible par Node sans dépendance |
| --- | --- | --- | --- |
| JS inline dans `index.html` | oui (`'unsafe-inline'`) | oui | non, sans extraction |
| `<script src="./x.js">` classique, même origine | oui (`'self'`) | oui | oui, via `require` |
| `<script type="module" src="./x.mjs">` | oui (`'self'`) | **non** (CORS sur `file://`) | oui, via `import` |
| `fetch('./x.json')` | oui (`connect-src 'self'`) | **non** | oui, mais duplique le chargement |

`CONTRIBUTING.md` documente explicitement l'ouverture directe du fichier dans un navigateur
comme mode de prévisualisation. Un module ES ou un `fetch` casserait ce mode ; un script
classique de même origine ne le casse pas et ne demande aucune modification de la CSP.

## Constraints

Les 24 contraintes admises sont dans `.agentic/missions/lentilles-souples/constraints.yaml`.
Les quatre qui pèsent réellement sur la conception :

1. **CON-003, un outil = un seul fichier.** Contrainte de dépôt, pas une préférence. Elle entre
   en tension frontale avec deux exigences non négociables de la mission : les tests doivent
   exécuter le même code métier que l'interface (CON-022), et le catalogue doit rester diffable
   et rattaché à ses sources (CON-019). C'est le point d'arbitrage central de DESIGN.
2. **CON-002 / CON-009, confidentialité et CSP.** Rien de ce qui est saisi ne sort. Le compteur
   de visites reste le seul appel sortant et ne doit jamais recevoir une valeur de correction.
3. **CON-013, combler le trou plutôt que changer l'étiquette.** Aucune règle `html-validate`
   désactivée, aucune assertion de `tests/` affaiblie, aucun lien mis en liste d'exclusion.
4. **CON-017, la contrainte fabricant ne remonte jamais dans l'optique.** Elle impose une
   direction de dépendance stricte : le moteur optique ne connaît pas le catalogue.

## Risks

- **Risque majeur : une erreur de signe silencieuse.** Une compensation de vertex, une
  transposition ou une rotation dont le signe est inversé produit une valeur plausible et fausse.
  Un opticien pourrait ne pas la voir sur un cas courant et la voir seulement sur un cas fort.
  Mitigation : chaque convention de signe est fixée par un test qui la ferait échouer si elle
  s'inversait, y compris les cas réciproques (aller-retour vertex, aller-retour transposition,
  rotation nulle, rotation puis compensation).
- **Risque de faux confort.** Un module qui affiche une valeur arrondie sans montrer la
  théorique laisserait croire à une précision qu'il n'a pas. Mitigation : les quatre niveaux de
  valeur sont affichés simultanément, jamais l'un à la place de l'autre.
- **Risque de dérive d'usage.** Un affichage du type « lentille à commander » transformerait un
  outil d'aide en outil de prescription. Mitigation : vocabulaire contraint (CON-020) et énoncé
  explicite de la responsabilité dans l'interface.
- **Risque de données fabricant fausses.** Inventer un paramètre en le rattachant à une marque
  réelle serait plus dangereux qu'absent. Mitigation : uniquement des fabricants fictifs, marqués
  comme tels dans les données, dans l'interface et dans le validateur.
- **Risque de rupture du contrat de navigation.** Une copie approximative du bloc `Couches` fait
  échouer la CI ; une copie exacte mais mal câblée passe la CI et casse le geste retour sur
  Android. Mitigation : recopie littérale et vérification manuelle des six points.
- **Risque de flottant.** `0.1 + 0.2 !== 0.3` ; `value % 0.25 === 0` est faux pour des valeurs
  légitimes. Mitigation : arithmétique en centièmes de dioptrie entiers pour toute question
  d'appartenance à une grille.
- **Risque de performance.** Un produit cartésien sur plusieurs centaines de gammes rendrait
  l'outil inutilisable sur un téléphone. Mitigation : génération bornée autour de la cible.
- **Risque de portée SECURIX.** Le profil de sécurité adopté décrit le dépôt entier ; la revue
  complète dépasse le périmètre du module. Ce risque est structurel et sera reporté tel quel,
  pas absorbé.

## External references

Sources consultées, distinguées entre convention mathématique et recommandation clinique.

**Convention mathématique**

- Thibos LN, Wheeler W, Horner D. *Power vectors: an application of Fourier analysis to the
  description and statistical analysis of refractive error.* Optometry and Vision Science,
  1997;74(6):367-375. PMID 9293523. Source d'origine des composantes `M`, `J0`, `J45` et de la
  force de flou `B`.
- Thibos LN, Horner D. *Power vector analysis of the optical outcome of refractive surgery.*
  Journal of Cataract and Refractive Surgery, 2001;27(1):80-85. PMID 11165859. Reprise des
  formules directe et inverse, y compris le traitement du quadrant de l'axe.
- [Vertex distance, Wikipedia](https://en.wikipedia.org/wiki/Vertex_distance) : formule
  `F_c = (F^-1 - x)^-1`, exemple numérique `-8 D` à 12 mm, et l'énoncé explicite que l'axe ne
  change pas avec la distance vertex, la compensation se faisant méridien par méridien.

**Recommandation clinique**

- [Contact Lens Practice Pearls, Don't Forget to LARS, Contact Lens Spectrum, 2025](https://www.clspectrum.com/issues/2025/november_december/contact-lens-practice-pearls/) :
  énoncé de la règle, sens jugé du point de vue du praticien, et rappel que corriger l'axe ne
  corrige pas l'adaptation de la lentille.
- [A Fix-It Guide for Toric Lens Fits, Review of Optometry](https://www.reviewofoptometry.com/article/a-fix-it-guide-for-toric-lens-fits) :
  ordre de grandeur d'environ 3 % de cylindre perdu par degré de désalignement, et conduite à
  tenir devant une rotation instable.
- [Toric Fitting Guidelines, CooperVision](https://coopervision.com.sg/practitioner/fitting-tips-and-tools/toolkits/biofinity/toric-fitting-guidelines) :
  usage clinique de LARS dans un guide d'adaptation de fabricant.

**Spécialistes Arcline**

- SECURIX `b8074bf369ef6e44987307a09a442be9001521bc` : profil curé adopté, 108 règles
  applicables sélectionnées, 8 contrôles exécutés sur `66753b46`. Détail dans
  `.agentic/features/lentilles-souples/specialists/securix/`.
- UXER `0a609b04bc344e4d7bd8dad1e3f8e0192cb058f9` : routage de phase obtenu par
  `agentic uxer research` ; délégation `uxer-run --phase research` exécutée, résultat consigné
  dans `state.yaml` sous `integrations.uxer`.

**Le catalogue fabricant n'a aucune source dans cette recherche.** Aucun paramètre réel n'a été
recherché ni transcrit : la règle admise (CON-019) veut qu'une donnée réelle vienne d'une source
officielle fabricant, et cette mission ne livre que des données fictives.

## Open decisions

Décisions reportées à DESIGN, toutes dans le périmètre de niveau C explicitement délégué :

1. **Où vit le noyau métier et sous quelle forme de chargement**, sachant que les tests doivent
   exécuter ce code exact et que `CONTRIBUTING.md` interdit l'import partagé et documente
   l'ouverture directe du fichier. Le tableau CSP ci-dessus établit les possibilités réelles.
2. **Format et découpage du catalogue**, entre constantes dans le fichier de l'outil et fichiers
   de données locaux versionnés séparément.
3. **Politique d'arrondi à l'égalité** et représentation numérique déterministe.
4. **Formule de score fabricant**, à partir de la force de flou du résidu, et règles de
   départage garantissant un ordre total reproductible.
5. **Découpage de l'interface** en trois blocs, et forme donnée à la couche « Détails du
   calcul », en tenant compte de l'avis UXER.
