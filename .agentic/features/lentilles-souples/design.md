# Design -- Module Lentilles souples : moteurs optiques, catalogue fabricant local et interface Hub

## Context

RESEARCH a établi trois choses qui commandent tout le reste.

D'abord, la séparation métier n'est pas décorative : une contrainte fabricant ne doit jamais
remonter dans le calcul optique (CON-017). Cela impose une direction de dépendance stricte, du
catalogue vers l'optique et jamais l'inverse, et cela se vérifie mécaniquement : le moteur
optique ne doit contenir aucune référence au catalogue.

Ensuite, le dépôt interdit l'import partagé et veut un outil en un seul fichier (CON-003), alors
que la mission exige que les tests exécutent le même code métier que l'interface, sans dupliquer
une seule formule (CON-022). Les deux ne peuvent pas être vraies en même temps sans un mécanisme
d'extraction. C'est le point d'arbitrage de cette phase.

Enfin, la CSP en vigueur autorise déjà un `<script src>` de même origine, et un script classique
(non module) reste chargeable en `file://`, contrairement à un module ES ou à un `fetch`. Le
tableau des mécanismes est dans `research.md`, section « Existing patterns ».

Le module à concevoir comporte trois moteurs, une couche de données, une interface à trois blocs
et une couche d'explication du calcul. Il ne persiste rien.

## Options considered

Quatre décisions ouvertes ont été instruites. Pour chacune, les options réellement pesées.

### Où vit le noyau métier (UNK-004)

1. **Tout en ligne dans `index.html`, tests par extraction.** Le test lit le HTML, découpe le
   bloc entre deux marqueurs et l'exécute avec `node:vm`. Respecte CON-003 à la lettre. Mais le
   contrat de test devient un contrat de commentaire : déplacer un marqueur casse les tests sans
   changer une ligne de logique, et l'ordre de découpage devient une dépendance invisible. Le
   dépôt a déjà refusé ce genre de fragilité en écrivant `tests/navigation-retour.test.mjs` sur
   une comparaison littérale plutôt que sur une reconstruction.
2. **Modules ES dans le dossier de l'outil.** `<script type="module">` côté page, `import` côté
   test. C'est la solution la plus propre en écriture, et la CSP l'autorise. Mais elle casse
   l'ouverture directe du fichier dans un navigateur, que `CONTRIBUTING.md` documente comme mode
   de prévisualisation : les modules ES sont soumis à CORS et `file://` les refuse.
3. **`fetch()` de fichiers JSON.** Casse `file://` de la même façon, ajoute un chargement
   asynchrone et un état d'erreur réseau dans un outil qui n'en avait aucun.
4. **Scripts classiques de même origine, à double export.** Chaque fichier du noyau s'expose sur
   `globalThis` dans le navigateur et sur `module.exports` sous Node, dans le même bloc. La page
   les charge par `<script src="noyau/....js">`, le test les charge par `createRequire`. Aucune
   modification de CSP, `file://` continue de fonctionner, aucune dépendance, aucun build.

### Format du catalogue (UNK-003)

1. **Constantes dans `index.html`.** C'est ce que fait `epaisseur-verres` avec ses gabarits. Tient
   tant que la donnée est figée ; ici elle est destinée à croître produit par produit et à être
   revérifiée règle par règle contre une source datée.
2. **Fichiers `.json` chargés par `fetch`.** Le meilleur format de diff, mais il rouvre le
   problème `file://` et introduit un chemin réseau dans un outil qui n'en a pas.
3. **Un fichier de données au même format que le noyau**, littéral JavaScript exporté des deux
   côtés. Diff aussi lisible qu'un JSON, chargement identique au reste, aucune requête.

### Politique d'arrondi à l'égalité (UNK-002)

1. **Arrondi vers le haut systématique.** Simple, mais asymétrique en signe : `-7.125` et `+7.125`
   ne seraient pas traités de la même façon, ce qui est difficile à expliquer à un opticien.
2. **Arrondi vers la valeur la moins forte en valeur absolue**, transposition d'une recommandation
   clinique répandue. Le problème n'est pas qu'elle soit mauvaise, c'est qu'elle est clinique :
   l'outil se mettrait à décider à la place de l'opticien, ce que CON-020 et le périmètre
   interdisent.
3. **Arrondi à l'écart de zéro, et cas d'égalité rendu visible.** Règle symétrique, indépendante
   du signe, reproductible ; et quand la valeur tombe exactement au milieu, les deux voisines sont
   affichées pour que la décision reste celle de l'opticien.

### Représentation numérique

1. **Flottants avec un epsilon de comparaison.** Un epsilon unique se révèle toujours trop grand
   quelque part et trop petit ailleurs.
2. **Entiers en centièmes de dioptrie.** Suffisant pour les valeurs, mais incapable de représenter
   un demi-pas de 0,25 D : `-7.125` deviendrait `-7.13` et l'égalité exacte disparaîtrait au
   moment même où il faut la détecter.
3. **Entiers en millièmes de dioptrie.** Un pas de 0,25 D vaut 250, son milieu vaut 125 : l'égalité
   est exactement représentable et donc détectable.

## Chosen approach

Option 4 pour le noyau, option 3 pour le catalogue, option 3 pour l'arrondi, option 3 pour la
représentation numérique. Le détail suit.

### Arborescence

```text
outils/lentilles-souples/
├── index.html                  interface : HTML, CSS inline, JS d'interface inline
├── noyau/
│   ├── prescription.js         conventions, arithmétique, arrondi, vecteurs de puissance
│   ├── moteurs.js              moteur A (vertex) et moteur B (surréfraction, rotation)
│   └── catalogue.js            moteur C (validation, disponibilité, alternatives, score)
└── donnees/
    └── catalogue-demo.js       fabricants, produits, règles et sources fictifs
```

L'exception à CON-003 est locale et bornée : elle ajoute quatre fichiers dans le dossier de
**cet** outil, n'introduit aucun import entre outils, aucune bibliothèque tierce, aucun build,
et ne change ni la CSP ni la structure du hub. Elle est consignée en DEC-0004.

### Chargement à double export

Chaque fichier du noyau et le fichier de données ont la même enveloppe :

```js
(function (racine, fabrique) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrique(require('./prescription.js'));
  } else {
    racine.LentillesMoteurs = fabrique(racine.LentillesPrescription);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  /* ... */
}));
```

La page charge `noyau/prescription.js`, `noyau/moteurs.js`, `noyau/catalogue.js` puis
`donnees/catalogue-demo.js` par `<script src>` dans cet ordre, avant son propre script d'interface.
Le test `tests/lentilles-souples.test.mjs` charge exactement les mêmes fichiers avec
`createRequire(import.meta.url)`. Il n'y a pas de package.json dans le dépôt, donc Node traite un
`.js` comme CommonJS : aucune configuration n'est nécessaire.

### Conventions arrêtées

**Cylindre.** Forme canonique interne : cylindre négatif. Une saisie en cylindre positif est
transposée à l'entrée, pas rejetée. `cyl === 0` implique `axe === null` ; un cylindre non nul sans
axe est une erreur, jamais un axe deviné.

**Axe.** Entier dans `1..180`, `180` désignant l'horizontale. `normalizeAxis(a)` vaut
`((round(a) - 1) mod 180 + 180) mod 180 + 1`, ce qui envoie `0` et `360` sur `180`.

**Vertex.** `F_cornee = F / (1 - d * F)` avec `d` en mètres, positif quand on rapproche le plan
correcteur de l'oeil. La distance est saisie en millimètres et convertie une seule fois, dans le
noyau. En sphéro-cylindrique, les deux méridiens principaux sont compensés séparément
(`M1 = S`, `M2 = S + C`) et l'axe est reconduit inchangé.

**Vecteurs de puissance.** `M = S + C/2`, `J0 = -(C/2)cos(2a)`, `J45 = -(C/2)sin(2a)` ; retour par
`J = hypot(J0, J45)`, `C = -2J`, `a = atan2(J45, J0)/2` normalisé, `S = M - C/2`. `atan2` et non
`atan` : c'est ce qui rend le quadrant correct sur les quatre axes cardinaux.

**Rotation torique.** Signe unique `r = +rotation` si la lentille a tourné vers la gauche du
praticien, `r = -rotation` vers la droite. Alors :

```text
axe réellement porté = normalizeAxis(axe_lentille - r)
axe à commander      = normalizeAxis(axe_voulu    + r)
```

Les deux sont réciproques, et le cas « rotation observée, surréfraction nulle » redonne la
lentille de départ. C'est ce cas qui sert de test de non-régression du signe.

**Arrondi.** Unité entière interne : le millième de dioptrie. `arrondiDetaille(v, pas)` renvoie la
valeur arrondie, les deux voisines et un drapeau d'égalité ; `roundToStep(v, pas)` n'est que sa
projection sur la valeur. À égalité exacte, l'arrondi s'écarte de zéro et l'interface affiche les
deux voisines. L'appartenance à une grille se teste en entiers :
`(mD(v) - mD(origine)) % mD(pas) === 0`. Aucun `%` sur des flottants, aucun epsilon de tolérance
métier.

**Précision conservée.** La valeur théorique n'est jamais réécrite par son arrondi. Chaque moteur
renvoie une structure qui porte les deux, plus les étapes intermédiaires ; l'interface choisit ce
qu'elle montre, elle ne recalcule rien.

### Moteur A, conversion lunettes vers cible lentille

Entrée par oeil : `{ sph, cyl, axe }` plus une distance vertex en millimètres, propre au moteur A.
Sortie : les méridiens lunettes, les méridiens au plan cornéen, la correction théorique au plan
cornéen, la correction cible arrondie au pas configuré (0,25 D en V1), et la liste des problèmes
détectés. Vertex nul redonne l'entrée à l'identique.

### Moteur B, surréfraction et rotation

Entrée par oeil : lentille portée, surréfraction, distance de surréfraction en millimètres
(distincte de celle du moteur A), rotation observée avec son sens et sa stabilité. Enchaînement :

1. axe réellement porté par la lentille, par la formule de rotation ci-dessus ;
2. surréfraction ramenée au plan cornéen si sa distance n'est pas nulle ;
3. combinaison vectorielle des deux, qui donne la correction théorique recherchée ;
4. axe à commander, par la formule réciproque ;
5. arrondi au pas clinique.

Quand la rotation est déclarée instable, le résultat porte un drapeau et l'interface présente
l'axe compensé comme une indication à contrôler, pas comme une valeur acquise.

### Moteur C, catalogue et disponibilité

Modèle de données conforme au contrat admis : `manufacturers`, `products`, `manufacturing_rules`,
`sources`. Les règles sont compactes : une plage de sphère avec son pas, une liste explicite de
cylindres, un mode d'axe `RANGE` ou `LIST`, des listes de rayons et de diamètres, et un
`source_id`. Une gamme peut porter plusieurs règles.

`validerCatalogue(catalogue)` renvoie la liste complète des erreurs, chacune avec un code stable.
Les douze cas exigés par le contrat ont chacun leur code, et le validateur est appelé par les
tests sur des jeux volontairement cassés, un par code, en plus du catalogue livré.

`isCombinationAvailable(produit, sphere, cylindre, axe)` prend un produit compilé (le produit et
ses règles actives, triées par `rule_id`) et renvoie `{ available, matched_rule_id, source_id,
raisons }`. Déterminisme : les règles sont parcourues dans l'ordre des identifiants et la première
qui accepte gagne.

`chercherAlternatives(index, cible, options)` ne construit jamais le produit cartésien. Pour chaque
règle plausible, il génère au plus cinq sphères, trois cylindres et trois axes autour de la cible,
en tenant compte du repliement de l'axe à 180 degrés, puis score et conserve les meilleurs. Le
plafond est donc de 45 candidats par règle, indépendamment de la largeur de la gamme.

**Score.** L'écart est la norme du résidu dans l'espace des vecteurs de puissance :

```text
ecart = sqrt( (M_cible - M_cand)^2 + (J0_cible - J0_cand)^2 + (J45_cible - J45_cand)^2 )
```

C'est la force de flou du résidu au sens de Thibos, exprimée en dioptries. Elle vaut zéro pour une
combinaison exacte, ce qui garantit qu'une combinaison exacte est toujours première. Le
classement est un ordre total : à écart égal, on départage par écart de sphère, puis de cylindre,
puis d'axe, puis par `product_id` et `rule_id`. Aucune part de ce calcul n'est dans l'affichage.

### Interface

Trois blocs dans l'ordre du raisonnement, chacun repliable, chacun pour les deux yeux :
conversion lunettes, surréfraction, fabrication. Une couche « Détails du calcul » ouvrable par
oeil, qui montre l'enchaînement complet. La hiérarchie des valeurs est rendue par quatre niveaux
typographiques distincts et jamais par substitution : la valeur saisie, la théorique, la cible
arrondie et le paramètre fabricant disponible coexistent à l'écran.

Le module ne persiste rien. Il lit `profil-magasin-v1` pour afficher le nom du magasin en
en-tête, comme les autres outils, et n'écrit aucune clé.

### Tests et CI

`tests/lentilles-souples.test.mjs` charge le noyau réel et couvre les neuf familles exigées, plus
la validation du catalogue livré et un garde-fou de performance. Il suit le style du test existant
(aucune dépendance, compteur de contrôles, sortie non nulle en cas d'échec). La CI reçoit un job
supplémentaire dans `.github/workflows/ci.yml`, calqué sur le job `navigation` déjà présent
(`container: node:22`, même action de checkout épinglée).

## Tradeoffs

**Ce que coûte l'exception à « un outil = un fichier ».** Un lecteur qui ouvre
`outils/lentilles-souples/index.html` n'y trouve plus tout l'outil. C'est un vrai coût de
navigation, assumé pour une raison précise : sans lui, ou bien les tests n'exécutent pas le code
de l'interface, ou bien ils l'exécutent au prix d'un découpage textuel fragile. La contrepartie
est que le fichier d'interface devient lisible : il ne contient plus une ligne de formule.

**Ce que coûte le double export.** L'enveloppe est un peu de cérémonie en tête de chaque fichier.
En échange, aucune dépendance, aucun build, aucun changement de CSP, et la prévisualisation par
double-clic continue de marcher. Une enveloppe de six lignes contre un package manager, le choix
est vite fait dans ce dépôt.

**Ce que coûte le millième de dioptrie.** Une unité interne de plus à garder en tête. En échange,
l'égalité d'arrondi devient exactement représentable, et aucune question d'appartenance à une
grille ne repose sur un flottant.

**Ce que coûte l'affichage à quatre niveaux.** L'écran est plus chargé qu'un simple résultat. C'est
l'objet même du module : un affichage plus sobre serait un affichage qui cache l'étape où l'écart
est né.

**Ce que coûte le refus de persister.** L'opticien ressaisit la distance vertex à chaque session.
C'est peu, et cela garantit qu'aucune valeur de correction ne survit à la fermeture de l'onglet,
ce qui rend la conformité au périmètre vérifiable d'un coup d'oeil plutôt qu'argumentable.

**Ce qui n'a pas été retenu et pourquoi.** Aucune bibliothèque, aucun framework, aucun format de
données nécessitant un chargement asynchrone. Aucune de ces options n'apportait quelque chose que
la solution retenue n'apporte pas, et chacune coûtait une contrainte du dépôt.

## Security constraints

Obligations issues de la sélection SECURIX (108 règles applicables au dépôt, cf.
`specialists/securix/applicable-rules.yaml`). Celles qui contraignent directement la conception de
ce module :

- **SEC-INJ-009 et SEC-FE-015, XSS DOM et `innerHTML`.** Le contrôle `CTRL-FE-DANGEROUS-SINKS` a
  relevé 22 occurrences suspectes préexistantes. Le module n'en ajoute aucune : tout affichage de
  valeur passe par `textContent`, et aucune chaîne saisie n'est concaténée dans du HTML.
- **SEC-INJ-016, désérialisation.** La seule entrée désérialisée est `profil-magasin-v1`, lue en
  `try/catch` et filtrée par liste blanche de champs, comme dans les outils existants. Le module
  n'écrit jamais cette clé.
- **SEC-PRIV-014, données personnelles sensibles.** Le module ne persiste rien, n'envoie rien et
  ne journalise rien. Aucune valeur de correction ne doit atteindre le compteur de visites, qui
  ne reçoit que le chemin de la page.
- **SEC-BIZ-006, calculs critiques hors client non fiable.** Règle à traiter de front plutôt qu'à
  contourner : le calcul est effectivement dans le navigateur, parce que le module est un outil
  d'aide dont le résultat est relu et décidé par un professionnel, et non une autorité de
  décision. C'est exactement pourquoi la couche « Détails du calcul » est obligatoire et non
  optionnelle : elle rend le calcul vérifiable par son destinataire.
- **SEC-SEC-001 et SEC-SEC-004, secrets côté client.** Aucun secret, aucun identifiant, aucune
  clé d'API n'entre dans le module ni dans ses données.
- **CSP.** Reprise à l'identique de celle des outils existants. Aucun hôte ajouté : les scripts du
  noyau sont de même origine et couverts par `script-src 'self'`.

Invariants de confidentialité vérifiables mécaniquement, et qui seront vérifiés : aucun `fetch`,
aucun `XMLHttpRequest`, aucun `WebSocket`, aucun `navigator.sendBeacon`, aucune écriture
`localStorage` ni `sessionStorage` dans tout le dossier du module.

## UX decision

UXER a été routé par Arcline pour la phase Research (`uxer-run --phase research`, job
`SPJ-9a10fb9a2116`). Il a rendu huit constats, tous non bloquants, avec une limitation qu'il
signale lui-même : deux de ses cinq capacités ont tourné en mode dégradé faute d'accès à son
propre catalogue de références et à la recherche en ligne. Arcline a enregistré le job en `error`
parce que `.agentic/` a été modifié pendant son exécution, ce qui est imputable à l'orchestration
et non à UXER ; le contenu du rapport reste exploitable et est repris ici. Son verdict conditionne
les gates Review et Ship, il est transporté tel quel et n'est jamais promu.

Trois constats d'UXER changent la conception :

- **UX-001 et UX-005 : « Détails du calcul » en dépliant natif, pas en modale.** Le contrat de
  navigation arrière n'impose le gestionnaire `Couches` que si le balisage contient
  `role="dialog"`, `role="alertdialog"` ou `class="modal-overlay"` ; `docs/navigation-retour.md`
  section 6 dit explicitement qu'un outil sans couche n'a rien à faire, et sa section « Ce qui
  n'est pas une couche » classe un dépliant comme n'étant pas un écran. UXER ajoute un argument
  d'usage : avec des `<details>`, un opticien peut garder ouvert le détail du bloc A pendant
  qu'il lit celui du bloc C, ce qu'une modale unique interdit. **Le module n'ouvre donc aucune
  couche** : disclosure natif partout, aucune copie de `Couches`, et la vérification manuelle
  « Android back par couche » a pour réponse « aucune couche ».
- **UX-002 : le bloc B ne peut pas réutiliser le tableau OD/OG existant.** Le seul précédent de
  saisie dense par oeil (`epaisseur-verres`) ne se réagence pas en dessous de 640 px, il réduit
  seulement la police. Le bloc B a nettement plus de champs par oeil que le bloc A ; il sera donc
  construit en grille qui se réagence réellement, et non en tableau à colonnes fixes.
- **UX-008 : le bloc C est utilisable seul.** Rien dans le contrat n'impose un enchaînement
  obligatoire. La cible du bloc C est pré-remplie depuis A ou B quand ils ont produit un
  résultat, et reste modifiable directement : c'est le comportement d'un outil d'aide, pas d'un
  tunnel.

UXER recommande également (UX-003) d'étendre le cadrage « aide, pas prescription » jusqu'à la
carte du hub, qui est le premier point de lecture, et (UX-006) de porter la distinction entre
combinaison exacte et alternative par un libellé et non par la couleur seule. Les deux sont
retenus. UX-004 (blocs empilés persistants plutôt qu'assistant séquentiel) et UX-007 (ton neutre
pour une rotation instable) confirment les partis pris ci-dessous.

Les partis pris d'interface :

1. **Trois étapes, pas trois onglets.** L'opticien suit un raisonnement, pas un menu. Les blocs
   sont dans l'ordre de la démarche et le résultat de l'un alimente visiblement le suivant.
2. **Le bloc surréfraction est facultatif et le dit.** Une première adaptation n'a pas de
   surréfraction ; le bloc reste replié tant qu'on ne l'ouvre pas, et le moteur C sait travailler
   sur la cible du moteur A seul.
3. **Deux yeux côte à côte sur grand écran, empilés sur téléphone.** Le parc est majoritairement
   mobile, la saisie doit rester atteignable au pouce et les champs numériques doivent ouvrir un
   clavier numérique.
4. **La hiérarchie des valeurs est portée par la typographie et le libellé, pas par la couleur
   seule.** Un opticien daltonien doit lire la même chose.
5. **Le vocabulaire est contraint.** « Correction théorique », « correction cible », « paramètre
   fabricant disponible ». Jamais « lentille à commander ».
6. **Les données de démonstration sont signalées dans l'interface elle-même**, pas seulement dans
   les fichiers : un bandeau permanent dans le bloc fabrication.
7. **Aucune couche ouvrable.** Tout le repliable est du `<details>` natif, ce que le contrat de
   navigation arrière ne compte pas comme un écran. Le lien de retour en en-tête et le bouton
   flottant iOS restent obligatoires et sont présents.

## Risks

- **Une inversion de signe passe les tests si les tests la reproduisent.** C'est le risque
  principal et il ne se traite pas par le volume de tests. Mitigation : chaque convention est
  ancrée par un cas de réciprocité, pas par une valeur attendue recopiée du code. Aller-retour
  vertex, aller-retour transposition, invariance des vecteurs de puissance sous transposition,
  rotation puis compensation qui redonne la lentille de départ. Un signe inversé casse la
  réciprocité, quel que soit le sens dans lequel on l'a écrite.
- **L'exception de structure pourrait déborder.** Si elle devenait un précédent, le hub perdrait
  sa propriété la plus utile. Mitigation : la DEC énonce sa portée exacte et le fait qu'elle ne
  vaut que pour cet outil.
- **Le catalogue de démonstration pourrait être pris pour un catalogue réel.** Mitigation :
  fabricants ouvertement fictifs, marqueur dans les données, bandeau dans l'interface, et un
  contrôle du validateur sur la présence de ce marqueur.
- **La couche « Détails du calcul » pourrait devenir un dépotoir.** Mitigation : elle affiche
  l'enchaînement réel produit par le noyau, pas un texte rédigé à part. Si le calcul change, le
  détail change avec lui.
- **La revue SECURIX porte sur le dépôt entier.** Elle dépasse le périmètre du module et pourrait
  bloquer la gate Ship pour des raisons étrangères au module. Ce risque est identifié, non
  absorbé : il sera reporté avec son état exact.
- **Le comportement mobile réel ne sera pas prouvé par la CI.** Les contrôles structurels ne
  remplacent pas un téléphone. Ce qui n'aura pas été constaté restera `NOT_RUN`.

## Rollback

Le module est purement additif et ne touche aucun code existant. Le retour arrière est donc un
`git revert` des commits de livraison, ce qui supprime `outils/lentilles-souples/`, la carte
ajoutée dans `index.html`, le fichier de test et le job de CI.

Rien à défaire au-delà du code :

- aucune clé `localStorage` n'est créée, donc aucune donnée résiduelle sur les appareils ;
- aucune migration, aucun format persisté, aucun schéma versionné côté produit ;
- la CSP n'est pas modifiée, donc aucune régression de sécurité à corriger après coup ;
- le job de CI ajouté est indépendant : le retirer ne touche aucun autre job.

Point d'attention pour un retour partiel : `project-security-profile.yaml` et l'état `.agentic/`
sont livrés par des commits séparés du code du module et peuvent être conservés indépendamment,
puisqu'ils ne sont ni chargés ni exécutés par le site.
