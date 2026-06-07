# Guide de contribution

Merci de votre intérêt pour ce projet ! Ce dépôt héberge un **hub d'outils
internes** pour magasins d'optique : un site **statique** (HTML/CSS/JS pur),
**sans build, sans gestionnaire de paquets, sans backend ni base de données**.
L'interface et tous les textes destinés aux utilisateurs sont **en français**.

Avant de contribuer, lisez le [README](README.md) (présentation, architecture,
déploiement) et le fichier [CLAUDE.md](CLAUDE.md) (conventions détaillées).

## Prérequis

- Un navigateur web récent.
- `git`.
- [Node.js](https://nodejs.org/) **uniquement** pour lancer les contrôles
  locaux (via `npx`). Il n'est pas nécessaire au fonctionnement du site.

Aucune installation de dépendances n'est requise : il n'y a pas de `package.json`.

## Lancer le site en local

Le site étant statique, il suffit d'ouvrir `index.html` dans un navigateur.
Pour un rendu identique à GitHub Pages (chemins relatifs, etc.), servez le
dossier avec un petit serveur statique, par exemple :

```sh
python3 -m http.server 8000
# puis ouvrez http://localhost:8000/
```

## Règles à respecter

Ces règles découlent des contraintes du projet (voir `CLAUDE.md`) :

- **Confidentialité absolue** : aucune donnée saisie ne doit quitter le
  navigateur. Pas d'analytics, pas de cookies, pas de tracker, aucun appel
  réseau avec des données utilisateur. La seule ressource externe tolérée est la
  police Manrope via Google Fonts.
- **Outils autonomes** : chaque outil vit dans `outils/<nom>/index.html`, en un
  seul fichier (CSS et JS *inline*), sans bibliothèque tierce ni import partagé.
  Les outils redéclarent localement les variables de couleurs.
- **Chemins relatifs** : tous les liens et chemins d'asset sont relatifs (le site
  vit sous un sous-chemin GitHub Pages). Chaque outil inclut un lien `← Retour`
  vers `../../`.
- **Profil magasin** : ne jamais coder en dur le nom, l'adresse, le téléphone,
  l'e-mail ou le fond de caisse d'un magasin. Lire la clé `localStorage`
  partagée `profil-magasin-v1` et se rabattre proprement sur une valeur neutre
  quand elle est absente.
- **Responsive / mobile** : les outils sont utilisés sur smartphone. Inclure la
  balise `viewport` et des règles `@media (max-width: 640px)`, et prévoir le
  bouton flottant `← Retour` pour iOS (classe `.ios-back`, voir `CLAUDE.md`).
- **Cohérence visuelle** : réutiliser les jetons de couleur existants
  (`--blue`, `--blue-d`, `--ink`, `--bg`, `--border`…).

## Contrôles locaux (identiques à la CI)

Il n'y a pas de tests applicatifs, mais la CI vérifie la qualité et l'hygiène
des fichiers à chaque push et chaque pull request. Reproduisez-les avant de
pousser — ces commandes ne doivent **rien** afficher (sauf la validation HTML
qui ne doit signaler aucune erreur) :

```sh
# Validation HTML (règles dans .htmlvalidate.json)
npx --yes html-validate "**/*.html"

# Hygiène des fichiers :
git grep -nIP ' +$' -- ':!*.md'   # pas d'espaces en fin de ligne (Markdown exempté)
git grep -lIP '\r$' -- .          # fins de ligne LF uniquement (pas de CRLF)
# + chaque fichier non binaire doit se terminer par une newline finale
```

Le fichier `.editorconfig` (UTF-8, LF, indentation 2 espaces, newline finale,
suppression des espaces de fin sauf en `.md`) aide la plupart des éditeurs à
respecter ces règles automatiquement.

Autres contrôles exécutés par la CI : `actionlint` (lint des workflows),
`lychee` (vérification des liens), CodeQL (analyse du JS embarqué) et `gitleaks`
(détection de secrets).

## Ajouter un nouvel outil

1. Créer `outils/<nom-de-l-outil>/index.html` (HTML + CSS + JS *inline*).
2. Ajouter une carte `<article class="tool-card">` dans `<div id="tools-grid">`
   de l'`index.html` racine, en s'inspirant des cartes existantes.
3. Réutiliser les jetons de couleur pour la cohérence visuelle.
4. Ajouter le lien `← Retour` vers `../../` en haut de l'outil.
5. Garder toutes les données côté client (voir la contrainte de confidentialité).
6. Rendre l'outil responsive et prévoir le bouton `← Retour` flottant iOS.

## Messages de commit

Préfixez chaque commit par `HF-XXX` (HF = « Hub Facilities », étiquette neutre)
suivi d'une description courte en français, sur le modèle
`HF-XXX — description` — par exemple :

```text
HF-003 — outil Demande/Ordonnance : structure et styles
```

## Pull requests

1. Créez une branche dédiée à partir de `main`.
2. Vérifiez que les contrôles locaux ci-dessus passent.
3. Ouvrez une pull request en remplissant le modèle proposé.
4. Le déploiement GitHub Pages se déclenche automatiquement à la fusion sur
   `main` : ne poussez jamais à la main sur une branche `gh-pages`.

Merci pour votre contribution !
