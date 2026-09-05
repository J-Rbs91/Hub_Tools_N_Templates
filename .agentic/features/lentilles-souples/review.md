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

**La revue d'assurance SECURIX a été menée, sur demande explicite du mainteneur.** Elle porte
sur le dépôt entier (`review_coverage: ALL_APPLICABLE`), donc bien au-delà du module. Résultat
sur les 108 règles applicables : **90 PASS, dont 34 corroborés par une preuve exécutée, 15
NOT_VERIFIED, 3 FAIL**. `release_gate.py` reste **BLOCKED**.

Cinq campagnes de test ont été jouées pour l'occasion dans Chromium sur l'arbre du commit
audité, parce qu'un contrat de preuve qui réclame un résultat d'exécution ne se satisfait pas
d'une lecture de code :

- **XSS adverse.** Quatre charges utiles (`img onerror`, `svg onload`, `href javascript:`,
  balise `script`) placées dans le profil magasin partagé, puis les cinq pages qui le relisent ;
  puis les 53 champs de `demande-ordonnance`, dont le nom et la date de naissance du patient.
  Sur les six passes : compteur d'exécution à 0, aucun élément né de la charge, aucune
  violation de CSP, et la charge visible en texte littéral, ce qui prouve l'échappement plutôt
  qu'une suppression silencieuse.
- **Exfiltration au canari.** `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` et
  `EventSource` instrumentés avant tout script de page, marqueur unique semé dans cinq outils.
  17 requêtes en tout, 5 hors origine et toutes vers `gc.zgo.at/count.js`, **zéro requête
  portant le marqueur**, zéro appel d'API sortante par le code des pages.
- **Application effective de la CSP.** Depuis la page livrée, script, image, `fetch`,
  `WebSocket` et soumission de formulaire vers un hôte non autorisé : six refus émis par le
  navigateur. La CSP en meta n'est pas décorative.
- **Encadrement.** Un site tiers encadre `demande-ordonnance` : le cadre se charge, ses 51
  champs sont rendus, aucun refus. Voir FIND-08.
- **Injection de panne** sur la seule dépendance externe, la synchronisation JSONP : échec à
  15 170 ms quand elle ne répond jamais, à 544 ms quand elle refuse, message en français, profil
  conservé en local, marqueur d'attente posé, et aucun rejeu automatique.

**Trois défauts réels sont sortis de cette revue, tous hors du module** : FIND-08, FIND-09 et
FIND-10. Un manque bloquant s'y ajoute, FIND-11. Ils ne sont pas corrigés ici : les corriger
serait étendre le périmètre admis de la mission sans enregistrement d'autorité.

**Constat reporté sans le promouvoir :** `CTRL-PY-DEP-INVENTORY` et `CTRL-PY-VULN-ADVISORY`
signalent 20 dépendances et 33 avis. Le Hub n'a aucune dépendance Python : ces contrôles
inspectent l'environnement d'exécution du contrôle, ce que leur propre limitation déclarée
énonce. Voir FIND-12.

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
status: resolved
blocking: true
description: >-
  La gravite d un message n est portee que par la couleur : rouge pour une erreur bloquante,
  ambre pour un avertissement consultatif comme ROTATION_INSTABLE. Aucun mot Erreur ou
  Avertissement n existe dans le DOM. Cela contredit directement le parti pris ecrit en DESIGN,
  la hierarchie est portee par la typographie et le libelle, pas par la couleur seule, et le
  constat UX-006 rendu par UXER des la phase Research. Un opticien daltonien, ou un magasin
  peu eclaire, ne distingue pas ce qui empeche la suite de ce qui informe.
remediation: TKT-009
resolution: >-
  TKT-009, commit e065aed. Un libelle textuel ERREUR ou AVERTISSEMENT precede desormais
  chaque message, independamment de sa couleur. Constate en execution dans Chromium : les dix
  cas d erreur affichent ERREUR, et ROTATION_INSTABLE affiche AVERTISSEMENT, ce qui distingue
  bien par le texte ce qui empeche la suite de ce qui informe.
evidence: >-
  UXER UX-003 sur outils/lentilles-souples/index.html ; design.md section UX decision point 4 ;
  UXER UX-006 du job SPJ-9a10fb9a2116 en phase Research.
```

```yaml agentic:finding
id: FIND-02
axis: ux
source: uxer SPJ-992b682f9ef7 UX-004
severity: high
status: resolved
blocking: true
description: >-
  Aucun conteneur de resultat genere dynamiquement ne porte aria-live, role=status ni
  role=alert. Un utilisateur de lecteur d ecran qui appuie sur Calculer ou sur Chercher n est
  pas averti qu un resultat vient d apparaitre plus bas dans la page. Le module produit
  pourtant tout son sens dans ces zones.
remediation: TKT-010
resolution: >-
  TKT-010, commit 6c33ed8. role=status et aria-live=polite sur les six conteneurs de resultat
  et sur la zone d erreurs catalogue. Verifie dans le diff et par relecture du DOM servi.
evidence: >-
  UXER UX-004 ; #a-od-out, #a-og-out, #b-od-out, #b-og-out, #c-od-out, #c-og-out dans
  outils/lentilles-souples/index.html.
```

```yaml agentic:finding
id: FIND-03
axis: ux
source: uxer SPJ-992b682f9ef7 UX-005
severity: medium
status: resolved
blocking: true
description: >-
  Le bloc B, surrefraction, n a aucun element de titre. Son intitule n existe que dans un
  summary, alors que les blocs A et C emploient un h2. La navigation par titres d un lecteur
  d ecran saute donc entierement le bloc B, et les h3 OD et OG qu il contient se retrouvent
  sans h2 englobant, ce qui casse la structure de titres etablie par les deux autres blocs.
remediation: TKT-011
resolution: >-
  TKT-011, commit b70e013. Un h2 dans le summary du bloc B, avec font:inherit pour ne pas
  changer l apparence. Le bloc reste un details repliable et la structure de titres redevient
  coherente avec les blocs A et C.
evidence: >-
  UXER UX-005 ; lignes 264 et 331 de outils/lentilles-souples/index.html.
```

```yaml agentic:finding
id: FIND-04
axis: ux
source: uxer SPJ-992b682f9ef7 UX-001
severity: high
status: resolved
blocking: true
description: >-
  Le niveau 4, parametre fabricant disponible, est visuellement moins proeminent que le
  niveau 3, correction cible arrondie : 15 px contre 16 px, et le niveau 4 ne sert qu a un
  intitule fixe. La demande fixe une progression saisie, theorique, cible, parametre
  disponible ou aucune etape n en remplace une autre ; une hierarchie qui decroit sur la
  derniere etape la contredit.
remediation: TKT-012
resolution: >-
  TKT-012, commit 0a77a1a. Le niveau 4 passe de 15 a 17 px et porte desormais la valeur elle
  meme et non plus un intitule fixe. Constate sur capture a 360 px : la progression saisie,
  theorique, cible, parametre disponible croit jusqu au bout, sans debordement horizontal.
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
status: resolved
blocking: false
description: >-
  La revue d assurance SECURIX des 108 regles applicables a d abord ete laissee non menee,
  parce qu elle porte sur le depot entier et depasse le perimetre admis de cette mission. Le
  mainteneur a explicitement demande qu elle soit conduite. Elle l a ete : 90 PASS dont 34
  corrobores par une preuve executee, 15 NOT_VERIFIED, 3 FAIL. La gate reste BLOCKED, mais
  pour des raisons nommees et etablies, plus par absence de verification. Les defauts trouves
  sont FIND-08 a FIND-11 ; ils sont hors du module et ne sont pas corrigés ici.
evidence: >-
  specialists/securix/review.yaml (108 verdicts, un par regle, avec couverture du contrat de
  preuve) ; specialists/securix/release-gate.txt ; specialists/securix/controls-candidat.yaml.
```

```yaml agentic:finding
id: FIND-08
axis: security
source: securix SEC-WEB-004, test d encadrement
severity: high
status: open
blocking: false
description: >-
  Aucune politique d encadrement n existe sur le site. Pas de frame-ancestors dans les CSP en
  meta, et la directive y serait de toute facon ignoree par la specification ; pas de
  X-Frame-Options dans la reponse de production ; pas de garde en JavaScript. Un site tiers
  encadre donc demande-ordonnance sans aucun refus du navigateur : le test le montre, il ne le
  suppose pas. La portee est bornee et c est dit exactement : le contenu encadre reste
  illisible pour l origine encadrante, et le projet n a ni session ni action changeant un etat
  serveur, donc le detournement de clic n a pas de cible ici. La regle demande neanmoins de
  definir et d appliquer une politique. Un garde de quelques lignes refusant l affichage quand
  la page n est pas au sommet fermerait l ecart sans dependre de l hebergeur. Hors perimetre du
  module : la decision appartient au mainteneur.
evidence: >-
  node cadre.mjs sur l arbre audite : le cadre se charge, 51 champs rendus, aucun refus ;
  curl -I sur https://j-rbs91.github.io/Hub_Tools_N_Templates/ : aucun X-Frame-Options.
```

```yaml agentic:finding
id: FIND-09
axis: security
source: securix SEC-WEB-003, inspection de la reponse de production
severity: high
status: open
blocking: false
description: >-
  Le site ne pose aucune ligne de base d en-tetes de securite et n en documente aucune. La
  reponse de production porte strict-transport-security et access-control-allow-origin *, poses
  par GitHub Pages, et ne porte ni X-Content-Type-Options, ni X-Frame-Options, ni
  Referrer-Policy, ni Permissions-Policy, ni CSP d en-tete. La contrainte est reelle : un site
  statique publie par GitHub Pages n expose aucune configuration d en-tetes, et le depot
  compense par une CSP en meta par page, dont l application effective est verifiee. Ce qui
  reste ouvert n est pas une deduction : nosniff et Referrer-Policy sont absents, ne peuvent
  pas etre poses depuis le depot, et aucune decision ecrite n acte ce residu. Hors perimetre du
  module.
evidence: >-
  curl -sS -I https://j-rbs91.github.io/Hub_Tools_N_Templates/ ; node csp.mjs (six refus emis
  par le navigateur, la CSP en meta est bien appliquee).
```

```yaml agentic:finding
id: FIND-10
axis: security
source: securix SEC-FE-048
severity: medium
status: open
blocking: false
description: >-
  L outil demande et ordonnance saisit le nom, le prenom et la date de naissance d un patient
  dans des champs texte sans attribut autocomplete. Sur un poste partage en magasin, le
  navigateur retient ces valeurs et les propose au client suivant. Ce n est pas un arbitrage
  assume mais un oubli : l outil de campagne applique autocomplete=off a dix champs bien moins
  sensibles, donc le controle est connu du depot et simplement absent la ou il compte le plus.
  Correction locale et sans effet de bord : autocomplete=off sur les champs patient. Hors
  perimetre du module.
evidence: >-
  outils/demande-ordonnance/index.html, champs data-k="p_nom" et data-k="p_ne" ;
  outils/campagne-email/index.html, dix champs deja porteurs de autocomplete=off.
```

```yaml agentic:finding
id: FIND-11
axis: security
source: securix SEC-DEV-002
severity: high
status: open
blocking: false
description: >-
  L invariant central du depot, aucune donnee saisie ne quitte le navigateur, n est couvert par
  aucun test du depot. La page tests/securite porte le titre tests de non-regression securite,
  mais elle redefinit dans son propre script les fonctions qu elle eprouve, esc, sanitizeProfil,
  isValidSyncUrl et lienSur, au lieu d executer celles des pages : une regression du code livre
  la laisserait verte. Et aucun job de ci.yml ne l ouvre. J ai eprouve l invariant pendant cette
  revue, au canari et a l instrumentation des cinq API sortantes, et il tient ; mais ce sont mes
  scripts, joues une fois sur ce commit, hors du depot et hors de la CI. Un fait acquis une fois
  ne se rejoue pas tout seul. Un test qui echouerait a la premiere apparition de fetch,
  XMLHttpRequest, WebSocket, sendBeacon ou d une ecriture de stockage hors liste blanche
  tiendrait dans le meme moule que tests/navigation-retour.test.mjs, deja cable en CI. C est le
  constat le plus utile de cette revue. Hors perimetre du module.
evidence: >-
  .github/workflows/ci.yml, aucun job n execute tests/securite ; tests/securite/index.html,
  fonctions redefinies localement ; node reseau-negatif.mjs et node xss-negatif.mjs, joues par
  le reviseur, absents du depot.
```

```yaml agentic:finding
id: FIND-12
axis: security
source: securix release_gate.py, contradictions de controle
severity: medium
status: open
blocking: false
description: >-
  Sept verdicts PASS sont contredits par une detection de controle et bloquent la gate, sans
  qu un defaut du depot soit etabli. Trois familles, nommees separement parce qu elles n ont pas
  la meme nature. CTRL-PY-DEP-INVENTORY et CTRL-PY-VULN-ADVISORY signalent 20 paquets et 33 avis
  qui sont ceux de l environnement Python du conteneur, pas du depot audite, lequel n a aucune
  dependance Python : leur propre limitation declaree dit qu ils lisent l environnement ou ils
  tournent. CTRL-ADVISORY-CADENCE constate qu aucun workflow n execute le scan d avis SECURIX,
  ce qui est exact, la seule famille de dependances du depot etant les actions GitHub, couvertes
  par Dependabot. CTRL-FE-DANGEROUS-SINKS signale 22 sinks, exactement le nombre de la base
  avant la mission ; les 22 ont ete auditees une a une et eprouvees par test adverse, et le
  controle se declare lui-meme de confiance basse en precisant que la presence d un sink n est
  pas une preuve de XSS. SECURIX exige neanmoins un enregistrement d exception explicite pour
  liberer, et un tel enregistrement releve de l humain.
evidence: >-
  specialists/securix/release-gate.txt ; specialists/securix/controls-candidat.yaml ;
  python3 controls/static/inventory_python_dependencies.py --root . (findings : argcomplete,
  blinker, cryptography, paquets du conteneur).
```

## Changement postérieur à la revue

Le mainteneur a demandé, après la revue, que l'outil soit verrouillé par un code le temps de sa
mise au point (`DEC-0008`). L'écran de code est l'état initial de la page ; le contenu de l'outil
est enveloppé dans `#outil` et n'apparaît qu'une fois le code saisi. L'état déverrouillé est
mémorisé par poste sous `lentilles-acces-v1`, un simple drapeau.

Trois points sont consignés ici pour que la prochaine revue n'ait pas à les redécouvrir :

- **Le code est en clair dans la page livrée.** C'est assumé et dit tel quel dans le commentaire
  du code, dans `DEC-0008` et ici : c'est une commodité de mise au point, pas un contrôle
  d'accès. Rien dans l'interface ne laisse croire l'inverse.
- **L'écran de code n'est pas une couche `Couches`, volontairement.** Le geste retour d'Android
  refermerait la couche et contournerait le verrou. `tests/navigation-retour.test.mjs` reste vert
  parce que l'écran n'est ni `role="dialog"` ni `.modal-overlay` : ce n'est pas une modale posée
  par-dessus le contenu, c'est l'état initial de la page. Les deux liens `← Retour` restent
  atteignables verrouillé.
- **Une clé `localStorage` s'ajoute à l'inventaire de SEC-FE-022** : `lentilles-acces-v1`, valeur
  `'1'`, aucune donnée personnelle.

Vérifié dans Chromium, huit scénarios : arrivée verrouillée avec focus sur le champ, code faux
refusé en français, code juste accepté à la touche Entrée, outil fonctionnel après ouverture,
état conservé au rechargement, bouton « Verrouiller » qui referme et efface la clé, verrouillage
persistant après rechargement, et poste neuf verrouillé. Aucune erreur JavaScript. Pas de
débordement horizontal à 360 px ni à 1280 px, sur la page comme sur le hub.

Le mainteneur, qui exerce le métier, a ensuite corrigé trois choses (`DEC-0009`) :

- **La surréfraction n'est pas une option.** Elle était repliée dans un `<details>` marqué
  « facultatif », ce qui la donnait pour un supplément au module A. C'est un calcul à part
  entière, employé seul. Le repli est supprimé.
- **L'interface était lourde.** Les trois modules empilés faisaient 2241 px, soit deux écrans et
  demi de défilement et 35 champs à l'écran pour trois calculs qu'on ne fait jamais en même
  temps. Ils passent en onglets, un seul module visible, les deux yeux côte à côte dès qu'il y a
  la place : **845 px** pour le premier module au lieu de 2241 pour l'ensemble. Les préfixes
  « A · », « B · », « C · » disparaissent, c'était du vocabulaire interne.
- **On dit DVO, pas vertex.** Distance verre-oeil. Tout le texte lu par l'opticien emploie DVO, y
  compris les dix messages d'erreur et les lignes de résultat. L'identifiant interne du noyau
  reste `vertexMm` : c'est un nom de code, jamais montré, et le renommer casserait l'API que les
  tests éprouvent sans rien apporter à l'opticien.

Les onglets ne sont pas des couches `Couches`, pour la même raison que l'écran de code : une
couche se referme au geste retour d'Android, et refermer un onglet ne veut rien dire. Rien n'est
écrit dans l'historique, sinon il faudrait trois gestes retour pour sortir de l'outil.

Vérifié : navigation souris et clavier (flèches, Origine, Fin, bouclage), les trois modules
calculent, les dix cas d'erreur rejoués disent tous « la DVO », aucun débordement à 360 px ni à
1100 px, aucune erreur JavaScript. Le test adverse de XSS et la mesure au canari ont été rejoués
sur la page modifiée : 0 exécution, 18 requêtes dont 5 vers le compteur et **0 portant le
marqueur**.

**Ces deux changements ne sont pas couverts par la revue SECURIX**, dont le verdict reste attaché au commit
`f1367935f09f4edf893a83395d03b56aa5780e60`. La revue précède ce changement ; elle ne le valide
pas et ne le contredit pas.

## Not run

Ce qui n'a pas été exécuté est nommé ici plutôt que compté comme propre.

- **Correction des défauts FIND-08 à FIND-11.** Ils sont établis, localisés et chacun est
  accompagné de sa correction ; aucun n'est corrigé ici. Ils portent sur `index.html`,
  `outils/demande-ordonnance/`, `tests/` et la configuration d'hébergement, c'est-à-dire hors
  du périmètre admis de la mission. Les corriger sans enregistrement d'autorité serait
  exactement l'extension de périmètre cachée dans l'implémentation que le contrat interdit.
- **`CTRL-SECRET-HISTORY`** : `NOT_RUN`, faute de `gitleaks` installé dans la session. Rapporté
  tel quel : un scan qui n'a pas eu lieu ne se lit jamais comme un scan sans trouvaille.
  `gitleaks` tourne bien en CI, sur l'historique complet, mais cela n'a pas été observé ici.
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
