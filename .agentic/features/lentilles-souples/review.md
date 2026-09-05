# Review -- Module Lentilles souples : moteurs optiques, catalogue fabricant local et interface Hub

## Summary

Revue du module livré sur `4804598221e787660df58a915659cfd15fe569a6`, branche `claude/arcline-soft-lens-module-oc1634`.
Périmètre : `outils/lentilles-souples/` (4 modules de noyau, 1 fichier de données, 1 page),
`tests/lentilles-souples.test.mjs`, la carte ajoutée à `index.html` et le job ajouté à
`.github/workflows/ci.yml`.

Trois sources, distinguées parce qu'elles n'ont pas la même force :

- **Control Plane Arcline** (cette revue) : relecture du code, recoupement numérique
  indépendant des moteurs, et parcours réels de la page joués dans Chromium sur un serveur
  local. Les recoupements n'ont pas été faits en relisant les tests des workers mais en
  recalculant les valeurs séparément, ce qui est la seule façon d'attraper une convention de
  signe inversée que les tests reproduiraient.
- **UXER** `0a609b04`, job `SPJ-992b682f9ef7`, phase Review : dix constats, statut qu'il
  déclare lui-même `partial` faute de navigateur dans sa session.
- **SECURIX** `b8074bf3` : 108 règles applicables sélectionnées, 8 contrôles exécutés sur le
  SHA candidat, gate de release évaluée.

## Axis: correctness

Axe exercé, par recoupement indépendant et non par relecture des tests.

**Moteur A, compensation de vertex.** `-8,00 D` à 12 mm donne `-7,2993 D` ; `+8,00 D` donne
`+8,8496 D` ; un vertex nul laisse la valeur inchangée ; l'aller-retour redonne `-8,000000`.
En sphéro-cylindrique, `-8,00 / -2,00 × 180` à 12 mm donne `-7,2993 / -1,6293 × 180`, les
deux méridiens principaux compensés séparément et l'axe reconduit. La cible arrondie est
`-7,25 / -1,75 × 180`.

**Moteur B, surréfraction et rotation.** La réciprocité LARS tient : une lentille marquée 180
qui tourne de 10° vers la gauche du praticien porte réellement l'axe 170, et l'axe à commander
pour viser 170 redevient 180. Le cas « rotation observée, surréfraction nulle » redonne
exactement la lentille portée, ce qui est le contrôle qui casse si le signe s'inverse. Une
surréfraction croisée `-3,00 / -1,25 × 180` avec `-0,50 / -0,50 × 90` à 12 mm donne
`-3,988 / -0,759 × 180`, valeur que j'ai recalculée à la main par vecteurs de puissance : ce
n'est pas la somme des sphères et des cylindres, et c'est bien le point que le contrat
interdisait de rater.

**Moteur C, disponibilité et sélection.** Sur le catalogue de démonstration : combinaison
exacte acceptée avec sa règle et sa source ; sphère hors plage, hors pas (pas de 0,50 respecté
à `-8,50`, violé à `-8,25`), cylindre absent de la liste, axe hors mode en RANGE comme en
LIST, tous refusés avec une raison identifiée ; produit sphérique refusé avec un cylindre ;
lentille sphérique et torique passant par le même moteur ; deux appels identiques renvoyant
exactement le même résultat. Le repliement d'axe à 180° est correct : pour une cible à l'axe 1,
les axes 11 et 171 obtiennent le même écart.

**Séparation théorie / cible / fabrication.** Vérifiée dans le code et à l'écran. Le moteur
optique ne référence jamais le catalogue ; la page ne contient aucune formule optique. Les
quatre niveaux de valeur coexistent, aucun ne remplace le précédent.

Aucun défaut de correction non corrigé à ce jour. Deux tours de refus ont été nécessaires sur
l'interface, tous deux consignés dans l'historique du ticket TKT-005.

**Limite connue, non défaut.** `powerVectorToPrescription` quantifie son résultat au millième
de dioptrie. C'est l'unité interne déclarée en DEC-0006 et cela rend les aller-retours exacts,
mais la valeur dite théorique est donc arrondie au millième, pas exacte au flottant près.
L'écart est de l'ordre de `0,0003 D`, invisible à l'affichage qui montre deux décimales.

## Axis: tests

Axe exercé. Sorties exactes, obtenues sur la branche de livraison au SHA ci-dessus.

- `node tests/lentilles-souples.test.mjs` : **166 contrôles passés, 0 échec**, dont le
  garde-fou de performance qui affiche « 300 règles traitées en 43 ms (budget 3000 ms) ».
- `node tests/navigation-retour.test.mjs` : **25 contrôles passés**.
- `npx --yes html-validate@11.5.6 "**/*.html"` : **aucune erreur**.
- `actionlint 1.7.7`, téléchargé par le script épinglé qu'emploie la CI : **aucune erreur**.
- Hygiène : aucun espace en fin de ligne hors Markdown, aucun CRLF, newline finale partout.
- Em-dash : aucun dans un texte visible du module. Le seul ajouté est dans un commentaire HTML
  de `index.html`, cas que `CLAUDE.md` exempte explicitement.

**Le validateur de catalogue est une gate réelle, pas un validateur de façade.** Preuve : sur
une copie du dépôt dont le catalogue livré a été corrompu (un `source_id` inexistant),
`node tests/lentilles-souples.test.mjs` sort en **code 1**. Les douze cas d'échec exigés par
le contrat ont chacun été provoqués par une mutation que j'ai construite moi-même, indépendante
des tests du worker, et le validateur les refuse tous avec leur code.

**Les tests exécutent le code de l'interface.** Le fichier de test charge les mêmes fichiers que
la page, par `createRequire`, et vérifie en plus la branche navigateur du double export via
`node:vm`. Aucune formule n'est réécrite dans les tests.

## Axis: architecture

Axe exercé.

La direction de dépendance imposée par CON-017 est respectée et vérifiable mécaniquement :
`prescription.js` ne connaît rien, `moteurs.js` et `catalogue.js` ne connaissent que lui,
`selection.js` ne connaît que le noyau et le catalogue, et `index.html` n'appelle que le
noyau. Une contrainte fabricant ne peut pas remonter dans un calcul optique.

L'exception à « un outil = un seul fichier » (DEC-0004) est restée bornée : quatre fichiers de
noyau et un fichier de données dans le dossier de **cet** outil, aucun import entre outils,
aucune bibliothèque tierce, aucun build, aucune modification de la CSP. Le chargement passe par
`<script src>` de même origine, déjà couvert par `script-src 'self'`, ce qui préserve
l'ouverture directe du fichier documentée dans `CONTRIBUTING.md`.

**Constat, non bloquant :** le ticket TKT-005 porte deux commits au lieu d'un, parce qu'il a été
refusé puis repris. `one_ticket_one_commit` vise la lisibilité de la livraison ; ici les deux
commits racontent le refus et sa correction, et la raison du refus est dans le Control Plane.
Écraser l'historique aurait coûté cette traçabilité sans rien apporter.

## Axis: security

Axe exercé, avec un résultat partiellement bloqué qui est reporté tel quel.

**Ce qui est vérifié sur le module :**

- Aucun appel réseau portant une saisie. Recherche mécanique sur tout le dossier du module :
  aucun `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`. Confirmé en exécution :
  sur un parcours complet dans Chromium, la seule requête sortante est
  `GET https://gc.zgo.at/count.js`, le compteur déjà autorisé par le hub.
- Aucune persistance. `localStorage` n'est lu que pour `profil-magasin-v1`, jamais écrit.
  Après un parcours complet, `Object.keys(localStorage)` et `Object.keys(sessionStorage)`
  sont vides.
- Aucune donnée patient, aucun historique, conformément au périmètre admis.
- CSP identique à celle des outils existants, aucun hôte ajouté.
- `CTRL-FE-DANGEROUS-SINKS` renvoie **22 occurrences suspectes sur le SHA candidat, soit
  exactement le même nombre que sur la base `66753b46`** avant la mission : le module n'en
  ajoute aucune. C'était l'engagement pris en DESIGN.

**Ce qui n'est pas vérifié, et ne sera pas déclaré comme l'étant :** la revue d'assurance
SECURIX. `release_gate.py` sur le SHA candidat renvoie **BLOCKED : 108 NOT_VERIFIED, 0 PASS**.
Cette revue porte sur le dépôt entier (`review_coverage: ALL_APPLICABLE`), donc sur les quatre
outils préexistants, et pas sur le seul module. Elle dépasse le périmètre admis de la mission.
Voir « Not run ».

**Constat reporté sans le promouvoir ni le transformer en finding :** `CTRL-PY-DEP-INVENTORY`
et `CTRL-PY-VULN-ADVISORY` signalent 20 dépendances et 33 avis. Le Hub n'a aucune dépendance
Python : ces contrôles inspectent l'environnement d'exécution du contrôle, ce que leur propre
limitation déclarée énonce.

## Axis: ux

Axe exercé par UXER (dix constats) et complété par mes propres parcours navigateur, qui
couvrent précisément ce qu'UXER n'a pas pu exécuter.

**Ce que j'ai constaté en exécution, à 1280 px et à 360 px :** la chaîne complète fonctionne,
les quatre niveaux de valeur coexistent, « Détails du calcul » restitue l'enchaînement avec les
deux voisines de chaque arrondi, aucune erreur JavaScript, aucun débordement horizontal à
360 px, les dix cas d'erreur du contrat sont traités et affichés en français, le catalogue
invalide interrompt la recherche en listant ses codes, et la rotation instable annonce l'axe
compensé comme « une indication à vérifier, pas une valeur acquise ».

**Ce qu'UXER a relevé et que je retiens comme bloquant**, parce que ces points contredisent le
contrat admis ou la décision de conception, et non parce qu'ils seraient sévères en soi :
FIND-01 à FIND-04 ci-dessous.

## Findings

```yaml agentic:finding
id: FIND-01
axis: ux
source: uxer SPJ-992b682f9ef7 UX-003
severity: high
status: open
blocking: true
description: >-
  La gravite d un message n est portee que par la couleur : rouge pour une erreur bloquante,
  ambre pour un avertissement consultatif comme ROTATION_INSTABLE. Aucun mot Erreur ou
  Avertissement n existe dans le DOM. Cela contredit directement le parti pris ecrit en DESIGN,
  la hierarchie est portee par la typographie et le libelle, pas par la couleur seule, et le
  constat UX-006 rendu par UXER des la phase Research. Un opticien daltonien, ou un magasin
  peu eclaire, ne distingue pas ce qui empeche la suite de ce qui informe.
evidence: >-
  UXER UX-003 sur outils/lentilles-souples/index.html ; design.md section UX decision point 4 ;
  UXER UX-006 du job SPJ-9a10fb9a2116 en phase Research.
```

```yaml agentic:finding
id: FIND-02
axis: ux
source: uxer SPJ-992b682f9ef7 UX-004
severity: high
status: open
blocking: true
description: >-
  Aucun conteneur de resultat genere dynamiquement ne porte aria-live, role=status ni
  role=alert. Un utilisateur de lecteur d ecran qui appuie sur Calculer ou sur Chercher n est
  pas averti qu un resultat vient d apparaitre plus bas dans la page. Le module produit
  pourtant tout son sens dans ces zones.
evidence: >-
  UXER UX-004 ; #a-od-out, #a-og-out, #b-od-out, #b-og-out, #c-od-out, #c-og-out dans
  outils/lentilles-souples/index.html.
```

```yaml agentic:finding
id: FIND-03
axis: ux
source: uxer SPJ-992b682f9ef7 UX-005
severity: medium
status: open
blocking: true
description: >-
  Le bloc B, surrefraction, n a aucun element de titre. Son intitule n existe que dans un
  summary, alors que les blocs A et C emploient un h2. La navigation par titres d un lecteur
  d ecran saute donc entierement le bloc B, et les h3 OD et OG qu il contient se retrouvent
  sans h2 englobant, ce qui casse la structure de titres etablie par les deux autres blocs.
evidence: >-
  UXER UX-005 ; lignes 264 et 331 de outils/lentilles-souples/index.html.
```

```yaml agentic:finding
id: FIND-04
axis: ux
source: uxer SPJ-992b682f9ef7 UX-001
severity: high
status: open
blocking: true
description: >-
  Le niveau 4, parametre fabricant disponible, est visuellement moins proeminent que le
  niveau 3, correction cible arrondie : 15 px contre 16 px, et le niveau 4 ne sert qu a un
  intitule fixe. La demande fixe une progression saisie, theorique, cible, parametre
  disponible ou aucune etape n en remplace une autre ; une hierarchie qui decroit sur la
  derniere etape la contredit.
evidence: >-
  UXER UX-001 ; classes .val-tier-3 et .val-tier-4 dans outils/lentilles-souples/index.html ;
  mission.raw_request section 30.
```

```yaml agentic:finding
id: FIND-05
axis: ux
source: uxer SPJ-992b682f9ef7 UX-002
severity: low
status: open
blocking: false
description: >-
  Les codes internes tels que SPHERE_MANQUANTE sont affiches en gras avant la phrase
  francaise. Ils ont ete demandes explicitement par le Control Plane pour la tracabilite au
  support, et UXER les juge assimilables a un artefact de debogage pour un employe de magasin.
  Les deux lectures se defendent ; a traiter avec FIND-01, qui touche la meme zone d affichage.
evidence: UXER UX-002.
```

```yaml agentic:finding
id: FIND-06
axis: ux
source: uxer SPJ-992b682f9ef7 UX-006 UX-007 UX-008 UX-009 UX-010
severity: low
status: open
blocking: false
description: >-
  Quatre points mineurs groupes : indicateur de focus clavier reduit a un changement de
  bordure de 1 px sans contour renforce ; jetons de couleur secondaires diverents de ceux de
  assets/css/hub.css alors que le bleu d accent correspond exactement ; grille forcee a deux
  colonnes sous 640 px qui laisse le troisieme champ du bloc C seul sur sa ligne ; absence
  d aria-describedby reliant l avertissement de rotation instable aux valeurs qu il qualifie.
evidence: UXER UX-006, UX-007, UX-008, UX-009, UX-010.
```

```yaml agentic:finding
id: FIND-07
axis: security
source: securix release_gate.py
severity: high
status: open
blocking: false
description: >-
  La gate de release SECURIX est BLOCKED sur le SHA candidat : 108 regles NOT_VERIFIED, 0
  PASS. La revue d assurance porte sur le depot entier et couvre les quatre outils
  preexistants, pas le seul module. Elle depasse le perimetre admis de cette mission, donc
  elle n est pas menee ici et n est pas declaree menee. Non bloquant pour le module lui meme,
  bloquant pour la gate Ship : c est une decision qui appartient a l humain, pas a Arcline.
evidence: >-
  specialists/securix/review-skeleton.yaml ; release_gate.py sur le SHA candidat ;
  specialists/securix/controls-candidat.yaml.
```

## Not run

Ce qui n'a pas été exécuté est nommé ici plutôt que compté comme propre.

- **Revue d'assurance SECURIX, 108 règles.** `NOT_VERIFIED` sur les 108. Portée dépôt entier,
  hors périmètre de la mission. Voir FIND-07.
- **`CTRL-SECRET-HISTORY`** : `NOT_RUN`, rapporté tel quel par SECURIX.
- **Verdict UXER exploitable.** UXER s'est déclaré `partial` : sa session n'avait pas
  d'automatisation navigateur, donc rendu réel à 360 px, focus clavier observé, arbre de titres
  via le DOM et live regions n'ont pas été constatés par lui. J'ai exécuté ces vérifications
  moi-même dans Chromium et leurs résultats sont dans l'axe UX, mais cela ne transforme pas son
  verdict : Arcline exige un `passed` explicite d'UXER, et il n'a pas été obtenu.
- **Comportement sur un vrai téléphone.** Les six vérifications manuelles de
  `docs/navigation-retour.md` n'ont pas été faites sur un appareil physique. Le module
  n'ouvre aucune couche, donc la question « geste retour par couche » a pour réponse « aucune
  couche », mais le rendu tactile réel reste non constaté.
- **Vérification de liens `lychee`.** Non exécutée localement ; elle tournera en CI sur la
  pull request.
- **CodeQL et gitleaks.** Non exécutés localement ; ils tournent en CI sur la pull request.
