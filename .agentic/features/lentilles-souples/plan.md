# Plan -- Module Lentilles souples

## Approach

L'ordre suit la direction de dépendance imposée par CON-017 : le noyau de prescription ne connaît
rien, les moteurs optiques ne connaissent que lui, le catalogue ne connaît que lui, et la
sélection ne connaît que le catalogue et le noyau. L'interface arrive en dernier et ne contient
aucune formule.

Chaque tâche livre son module **et ses tests** dans le même passage. Le fichier de test est
unique (`tests/lentilles-souples.test.mjs`), à l'image du seul fichier de test existant dans le
dépôt : il est donc partagé par plusieurs tâches, ce qui les rend séquentielles. C'est la
conséquence assumée de la règle « à défaut de preuve de parallélisme sûr, exécution série ».

Le garde-fou de performance et le câblage CI arrivent en dernier, une fois qu'il y a quelque
chose à mesurer et à exécuter.

## Tasks

```yaml agentic:task
id: LS-01
objective: 'Noyau de prescription : conventions de cylindre et d''axe, arithmétique
  entière en millièmes de dioptrie, arrondi centralisé avec détection d''égalité,
  transposition, normalisation, vecteurs de puissance et combinaison.'
status: done
dependencies: []
files:
- outils/lentilles-souples/noyau/prescription.js
- tests/lentilles-souples.test.mjs
acceptance_criteria:
- le fichier s'expose sur globalThis dans un navigateur et sur module.exports sous
  Node, sans build ni dépendance
- normalizeAxis envoie 0 et 360 sur 180, laisse 1..180 inchangé, et ramène tout entier
  dans ce domaine
- transposePrescription est involutive et laisse le vecteur de puissance inchangé
- normalizePrescription impose le cylindre négatif, met l'axe à null quand le cylindre
  est nul, et refuse un cylindre non nul sans axe
- prescriptionToPowerVector et powerVectorToPrescription forment un aller-retour exact
  sur les axes 1, 45, 90, 135, 179 et 180
- addPowerVectors et combinePrescriptions donnent le bon résultat pour des axes identiques,
  orthogonaux et obliques
- roundToStep arrondit à l'écart de zéro à égalité exacte, et arrondiDetaille signale
  l'égalité avec ses deux voisines
- estSurLaGrille répond juste sur des valeurs entachées d'erreur flottante, sans epsilon
  métier
- aucune constante métier n'est écrite ailleurs que dans ce fichier
tests:
- unit
- round-trip
- negative-path
security_requirements:
  securix_rules:
  - SEC-SEC-001
  - SEC-SEC-004
  notes: 'Module purement calculatoire : aucun secret, aucune entrée réseau, aucune
    écriture de stockage.'
evidence_required:
- exécution de node tests/lentilles-souples.test.mjs
- sortie exacte du compteur de contrôles
risks:
- une convention de signe inversée produit une valeur plausible ; les tests de réciprocité
  sont là pour cela
```

```yaml agentic:task
id: LS-02
objective: Moteur A (conversion lunettes vers plan cornéen et cible lentille) et moteur
  B (surréfraction sphérique et sphéro-cylindrique, rotation torique avec sens et
  stabilité).
status: done
dependencies:
- LS-01
files:
- outils/lentilles-souples/noyau/moteurs.js
- tests/lentilles-souples.test.mjs
acceptance_criteria:
- une distance vertex nulle laisse la correction inchangée
- une sphère négative devient moins négative au plan cornéen, une sphère positive
  devient plus positive
- la compensation aller puis retour redonne la valeur de départ à moins d'un millième
  de dioptrie
- en sphéro-cylindrique les deux méridiens principaux sont compensés séparément et
  l'axe est reconduit inchangé
- la distance de surréfraction est un paramètre distinct de la distance vertex du
  moteur A
- une surréfraction sphéro-cylindrique d'axe différent est combinée par vecteurs de
  puissance et jamais par addition composante à composante
- rotation nulle, puis rotation observée avec surréfraction nulle, redonnent la lentille
  portée
- une rotation déclarée instable est signalée dans le résultat sans supprimer la valeur
  calculée
- la valeur théorique et la valeur cible arrondie coexistent dans le résultat, la
  seconde ne remplace jamais la première
- un vertex négatif, aberrant ou non numérique produit un problème identifié et jamais
  une valeur
tests:
- unit
- round-trip
- negative-path
security_requirements:
  securix_rules:
  - SEC-BIZ-006
  notes: Le calcul est côté client par nature ; la contrepartie exigée est qu'il soit
    intégralement restituable, ce que la structure de résultat rend possible.
evidence_required:
- exécution de node tests/lentilles-souples.test.mjs
- sortie exacte du compteur de contrôles
risks:
- confondre la distance vertex du moteur A et celle de la surréfraction fausserait
  silencieusement le moteur B
```

```yaml agentic:task
id: LS-03
objective: Modèle de catalogue fabricant, jeu de données de démonstration explicitement
  fictif, et validateur déterministe couvrant les douze cas d'échec exigés.
status: done
dependencies:
- LS-01
files:
- outils/lentilles-souples/noyau/catalogue.js
- outils/lentilles-souples/donnees/catalogue-demo.js
- tests/lentilles-souples.test.mjs
acceptance_criteria:
- le modèle porte manufacturers, products, manufacturing_rules et sources avec les
  champs du contrat admis
- une gamme peut porter plusieurs règles, avec des pas de sphère différents et des
  modes d'axe différents
- le validateur échoue avec un code stable pour chacun des douze cas exigés, un test
  par code
- le validateur accepte le catalogue de démonstration livré
- le validateur refuse un catalogue dont un produit actif n'a aucune règle exploitable
- les données de démonstration couvrent sphérique, torique régulier, axes irréguliers
  en LIST, plusieurs pas de sphère, mode RANGE et variations de rayon et de diamètre
- chaque fabricant de démonstration est ouvertement fictif, marqué comme tel dans
  les données, et aucun nom de fabricant réel n'apparaît
- chaque règle est rattachée à une source, et le validateur refuse un source_id inexistant
tests:
- unit
- negative-path
- fixture
security_requirements:
  securix_rules:
  - SEC-INJ-016
  notes: Le catalogue est une donnée locale versionnée, jamais désérialisée depuis
    une source distante.
evidence_required:
- exécution de node tests/lentilles-souples.test.mjs
- liste des douze codes d'erreur avec le test qui les déclenche
risks:
- un jeu de démonstration trop pauvre laisserait passer un défaut du moteur de disponibilité
- une donnée fictive prise pour réelle serait plus dangereuse qu'une donnée absente
```

```yaml agentic:task
id: LS-04
objective: Disponibilité exacte d'une combinaison, recherche bornée d'alternatives,
  score optique par la norme du résidu, et garde-fou de performance.
status: done
dependencies:
- LS-01
- LS-03
files:
- outils/lentilles-souples/noyau/selection.js
- tests/lentilles-souples.test.mjs
acceptance_criteria:
- isCombinationAvailable renvoie available, matched_rule_id et source_id, et le résultat
  est reproductible d'une exécution à l'autre
- une sphère hors plage, hors pas, un cylindre absent de la liste ou un axe hors mode
  sont refusés avec une raison identifiée
- le mode RANGE et le mode LIST sont tous deux couverts, ainsi que le cas sphérique
  avec cylindre nul et axe nul
- une lentille sphérique et une lentille torique passent par le même moteur de disponibilité
- une combinaison exacte, quand elle existe, obtient le meilleur score et la première
  place
- le classement de plusieurs alternatives est cohérent et totalement ordonné, sans
  dépendre de l'ordre d'itération
- la distance d'axe tient compte du repliement à 180 degrés, vérifié sur un couple
  proche de 180 et 5
- la recherche ne construit jamais le produit cartésien, le nombre de candidats évalués
  par règle est borné
- un catalogue synthétique de plusieurs centaines de règles est traité sous un budget
  de temps mesuré et affiché par le test
tests:
- unit
- negative-path
- performance-guard
security_requirements:
  securix_rules:
  - SEC-BIZ-006
  notes: La formule de score est dans le noyau et jamais dans l'affichage, pour rester
    vérifiable.
evidence_required:
- exécution de node tests/lentilles-souples.test.mjs
- durée mesurée du garde-fou de performance
risks:
- un score qui ignore l'astigmatisme résiduel classerait mal dès que les axes diffèrent
- une génération de candidats trop étroite pourrait manquer la combinaison exacte
```

```yaml agentic:task
id: LS-05
objective: 'Interface du module : page autonome branchée sur les moteurs réels, trois
  blocs, hiérarchie des quatre niveaux de valeur, détails du calcul, gestion explicite
  des erreurs, conventions du hub.'
status: done
dependencies:
- LS-02
- LS-04
files:
- outils/lentilles-souples/index.html
acceptance_criteria:
- la page charge le noyau par des balises script de même origine et ne contient aucune
  formule optique
- les trois blocs sont présents, le bloc surréfraction est facultatif et le bloc fabrication
  utilisable seul
- les quatre niveaux de valeur coexistent à l'écran, aucune étape n'en remplace une
  autre
- la couche Détails du calcul restitue l'enchaînement produit par le noyau, pour la
  conversion, la surréfraction et le score
- les dix cas d'erreur du contrat sont traités et affichés, aucune valeur douteuse
  n'est produite en silence
- le vocabulaire interdit n'apparaît nulle part et le vocabulaire imposé est employé
- la responsabilité de l'outil est énoncée dans l'interface
- le bandeau signalant des données de démonstration fictives est présent dans le bloc
  fabrication
- CSP identique à celle des outils existants, mention de mesure de fréquentation et
  script GoatCounter présents
- lien retour vers ../../, bouton flottant iOS et détection is-ios présents, aucune
  couche ouverte donc aucun gestionnaire Couches
- responsive réel en dessous de 640 px, la saisie du bloc surréfraction se réagence
  au lieu de rétrécir
- aucune écriture localStorage ni sessionStorage, aucun appel réseau portant une saisie
- aucun em-dash dans un texte visible, interface entièrement en français
tests:
- html-validate
- navigation-structure
- manual-mobile
security_requirements:
  securix_rules:
  - SEC-INJ-009
  - SEC-FE-015
  - SEC-PRIV-014
  notes: Tout affichage passe par textContent ; aucune saisie n'est concaténée dans
    du HTML ; rien n'est persisté ni envoyé.
evidence_required:
- sortie de npx --yes html-validate@11.5.6 sur l'ensemble des pages
- sortie de node tests/navigation-retour.test.mjs
- recherche mécanique confirmant l'absence de fetch, XMLHttpRequest, WebSocket, sendBeacon,
  localStorage et sessionStorage dans le dossier du module
- relevé exact de ce qui a été vérifié à la main et de ce qui ne l'a pas été
risks:
- une page riche peut devenir illisible sur un écran de 320 px
- un affichage qui simplifierait la hiérarchie des valeurs détruirait l'objet même
  du module
```

```yaml agentic:task
id: LS-06
objective: Intégrer le module au hub par une carte dans index.html, cadrée comme un
  outil d'aide.
status: done
dependencies:
- LS-05
files:
- index.html
acceptance_criteria:
- une li.tool-card complète est présente dans ul#tools-grid, avec icône, titre, lien,
  promesse, chevron et details
- le lien est relatif et pointe vers outils/lentilles-souples/
- la promesse énonce un bénéfice et cadre l'outil comme une aide, pas comme un raccourci
  de commande
- le style reprend les jetons existants sans en introduire de nouveau
- aucun em-dash dans le texte ajouté
tests:
- html-validate
- link-check
security_requirements:
  securix_rules:
  - SEC-FE-015
  notes: Aucun script ajouté à la page d'accueil.
evidence_required:
- sortie de npx --yes html-validate@11.5.6
- vérification que le chemin relatif résout vers un fichier existant
risks:
- une carte mal cadrée ferait lire l'outil comme un outil de commande avant même son
  ouverture
```

```yaml agentic:task
id: LS-07
objective: Faire exécuter réellement les tests du module et la validation du catalogue
  par la CI existante, de façon minimale et cohérente avec les jobs déjà présents.
status: done
dependencies:
- LS-04
- LS-05
files:
- .github/workflows/ci.yml
- tests/lentilles-souples.test.mjs
acceptance_criteria:
- un job unique exécute node tests/lentilles-souples.test.mjs, calqué sur le job navigation
  existant
- l'action de checkout est la même, épinglée par le même SHA, avec persist-credentials
  false
- le test échoue avec un code de sortie non nul si le validateur refuse le catalogue
  livré
- aucun job existant n'est modifié, aucune assertion existante n'est affaiblie
- actionlint passe sur le workflow modifié
tests:
- ci-lint
- unit
security_requirements:
  securix_rules:
  - SEC-SUPPLY-001
  notes: Aucune action tierce nouvelle ; réutilisation de l'action de checkout déjà
    épinglée.
evidence_required:
- sortie locale de node tests/lentilles-souples.test.mjs
- sortie d'actionlint sur le workflow
- état du job dans un run réel de la CI GitHub
risks:
- un validateur qui ne serait pas appelé par la CI serait un faux validateur
```
