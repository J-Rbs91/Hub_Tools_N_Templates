# Executable roadmap — lentilles-souples

This file is generated from `index.yaml`. The index is authoritative.

## Wave 1

- **TKT-001 — Noyau de prescription : conventions de cylindre et d'axe, arithmétique entière en millièmes de dioptrie, arrondi centralisé avec détection d'égalité, transposition, normalisation, vecteurs de puissance et combinaison.** — `done`, actor `uxer`, depends on: none
  - parallel with: TKT-008
  - why: TKT-008: no dependency relation; explicit file scopes are disjoint
- **TKT-008 — Page de l'outil : squelette conforme au contrat de navigation du hub** — `done`, actor `implementer`, depends on: none
  - parallel with: TKT-001
  - why: TKT-001: no dependency relation; explicit file scopes are disjoint
- **TKT-009 — Remediate FIND-01** — `done`, actor `implementer`, depends on: none
  - serial because: TKT-001: file scope not explicit for both tickets; fail closed; TKT-008: file scope not explicit for both tickets; fail closed; TKT-010: file scope not explicit for both tickets; fail closed; TKT-011: file scope not explicit for both tickets; fail closed; TKT-012: file scope not explicit for both tickets; fail closed
- **TKT-010 — Remediate FIND-02** — `done`, actor `implementer`, depends on: none
  - serial because: TKT-001: file scope not explicit for both tickets; fail closed; TKT-008: file scope not explicit for both tickets; fail closed; TKT-009: file scope not explicit for both tickets; fail closed; TKT-011: file scope not explicit for both tickets; fail closed; TKT-012: file scope not explicit for both tickets; fail closed
- **TKT-011 — Remediate FIND-03** — `to_execute`, actor `implementer`, depends on: none
  - serial because: TKT-001: file scope not explicit for both tickets; fail closed; TKT-008: file scope not explicit for both tickets; fail closed; TKT-009: file scope not explicit for both tickets; fail closed; TKT-010: file scope not explicit for both tickets; fail closed; TKT-012: file scope not explicit for both tickets; fail closed
- **TKT-012 — Remediate FIND-04** — `to_execute`, actor `implementer`, depends on: none
  - serial because: TKT-001: file scope not explicit for both tickets; fail closed; TKT-008: file scope not explicit for both tickets; fail closed; TKT-009: file scope not explicit for both tickets; fail closed; TKT-010: file scope not explicit for both tickets; fail closed; TKT-011: file scope not explicit for both tickets; fail closed

## Wave 2

- **TKT-002 — Moteur A (conversion lunettes vers plan cornéen et cible lentille) et moteur B (surréfraction sphérique et sphéro-cylindrique, rotation torique avec sens et stabilité).** — `done`, actor `securix`, depends on: TKT-001, TKT-008
  - serial because: TKT-003: shared files: tests/lentilles-souples.test.mjs
- **TKT-003 — Modèle de catalogue fabricant, jeu de données de démonstration explicitement fictif, et validateur déterministe couvrant les douze cas d'échec exigés.** — `done`, actor `securix`, depends on: TKT-001
  - serial because: TKT-002: shared files: tests/lentilles-souples.test.mjs

## Wave 3

- **TKT-004 — Disponibilité exacte d'une combinaison, recherche bornée d'alternatives, score optique par la norme du résidu, et garde-fou de performance.** — `done`, actor `securix`, depends on: TKT-001, TKT-003

## Wave 4

- **TKT-005 — Interface du module : page autonome branchée sur les moteurs réels, trois blocs, hiérarchie des quatre niveaux de valeur, détails du calcul, gestion explicite des erreurs, conventions du hub.** — `done`, actor `uxer`, depends on: TKT-002, TKT-004

## Wave 5

- **TKT-006 — Intégrer le module au hub par une carte dans index.html, cadrée comme un outil d'aide.** — `done`, actor `securix`, depends on: TKT-005
  - parallel with: TKT-007
  - why: TKT-007: no dependency relation; explicit file scopes are disjoint
- **TKT-007 — Faire exécuter réellement les tests du module et la validation du catalogue par la CI existante, de façon minimale et cohérente avec les jobs déjà présents.** — `done`, actor `securix`, depends on: TKT-004, TKT-005
  - parallel with: TKT-006
  - why: TKT-006: no dependency relation; explicit file scopes are disjoint

