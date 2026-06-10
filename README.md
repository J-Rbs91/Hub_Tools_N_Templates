# Hub Outils Internes

Site statique d'outils internes destiné aux magasins d'optique. Chaque magasin renseigne ses
coordonnées **une seule fois** via le bouton « ⚙ Mon magasin » du hub : nom, adresse, téléphone
et e-mail sont alors stockés localement dans le navigateur et réutilisés par tous les outils.
Aucune configuration côté code n'est nécessaire pour déployer dans un nouveau magasin.

Déployé via GitHub Pages, à l'adresse `https://<utilisateur>.github.io/<nom-du-depot>/`.

---

## Outils disponibles

| Outil | Description | Statut |
|---|---|---|
| [Demande / Ordonnance](outils/demande-ordonnance/) | Formulaire de demande au médecin (modification de prescription, CR adaptation lentilles, renouvellement…) avec export PDF et copie Gmail | Disponible |
| [Clôture de Caisse](outils/cloture-caisse/) | Comptage de fin de journée (pièces, billets, paiements électroniques), écart vs logiciel métier, reprise du comptage de la veille, historique local | Disponible |
| [Épaisseur des verres](outils/epaisseur-verres/) | Calcul de l'épaisseur d'un verre ophtalmique (centre, bord mini / maxi, Ø mini du palet) selon la correction, l'indice et la forme de monture (côtes A / B / D), décentration OD / OG et visualisation 3D manipulable | Disponible |

> **Profil magasin** — un profil partagé (clé `localStorage` `profil-magasin-v1`, contenant nom,
> adresse, téléphone et e-mail) renseigné une fois sur le hub pré-remplit l'en-tête de la
> Demande/Ordonnance. Le fond de caisse par défaut est mémorisé séparément par la Clôture de Caisse
> (clé `cloture-fond-v1`). Comme `localStorage` est propre à chaque navigateur/poste, les données
> d'un magasin ne se mélangent jamais avec celles d'un autre — mais elles ne se partagent pas non
> plus entre deux postes d'un même magasin, sauf si la synchronisation Drive ci-dessous est activée.

### Synchronisation et sauvegarde (facultatives)

- **Synchronisation Google Drive** — pour retrouver le profil sur tous les postes d'un même magasin,
  le hub peut le copier sur le Drive du magasin via un **script Apps Script** déployé par le magasin
  lui-même (aucun backend du projet). La procédure et le script sont fournis dans
  [`docs/sync-drive/`](docs/sync-drive/). **Seul le profil est synchronisé — jamais de donnée patient.**
- **Sauvegarde dans un fichier** (sans Google) — pour ceux qui ne veulent ou ne peuvent pas utiliser
  le Drive&nbsp;: depuis « Mon magasin », on exporte dans un fichier JSON le profil, le fond de caisse
  et l'historique de clôture (15 derniers jours), puis on le restaure en cas de changement de poste ou
  de vidage du navigateur. La page [`docs/sauvegarde-fichier/`](docs/sauvegarde-fichier/) détaille en
  toute transparence **ce que le fichier contient** (et ce qu'il ne contient jamais — aucune donnée
  patient) et **où vivent les données**.

---

## Confidentialité

**Aucune donnée saisie ne quitte le navigateur.**

- Zéro backend, zéro serveur, zéro base de données.
- Aucun tracker, aucun analytics, aucun cookie.
- Toutes les saisies (données patient, prescriptions) restent strictement locales dans le navigateur.
- Les exports (PDF, copie Gmail) sont générés entièrement côté client.
- La synchronisation Drive (facultative) ne transmet que le profil du magasin, vers le Drive du
  magasin, et jamais de donnée patient.
- La seule ressource externe chargée est la police Manrope via Google Fonts (aucune donnée patient transmise).

---

## Déploiement GitHub Pages

Le déploiement est automatisé par GitHub Actions (workflow `.github/workflows/deploy.yml`).

1. Sur GitHub (une seule fois) : **Settings → Pages → Build and deployment → Source = « GitHub Actions »**.
2. Pousser sur `main` : le workflow publie le site automatiquement.
3. Le site est disponible à `https://<utilisateur>.github.io/<nom-du-depot>/`.

> Ce mode remplace le build legacy basé sur la branche (qui s'appuyait sur d'anciennes actions Node.js 20 et émettait un avertissement de dépréciation).

Le fichier `.nojekyll` à la racine désactive le traitement Jekyll et assure la compatibilité d'un site HTML/CSS/JS statique pur.

> **Note :** les liens et chemins sont relatifs, ce qui les rend compatibles avec le sous-chemin `/<nom-du-depot>/` imposé par GitHub Pages.

---

## Arborescence

```
/
├── index.html                   (hub — page d'accueil)
├── .nojekyll
├── .editorconfig                (UTF-8, LF, indentation 2 espaces, newline finale)
├── .htmlvalidate.json           (règles de validation HTML)
├── README.md
├── CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md  LICENSE
├── CLAUDE.md                    (consignes pour l'assistant Claude Code)
├── assets/
│   ├── favicon.svg
│   └── css/
│       └── hub.css              (styles du hub uniquement + design tokens)
├── docs/
│   ├── sync-drive/
│   │   └── index.html           (procédure + script Apps Script de synchro Drive)
│   └── sauvegarde-fichier/
│       └── index.html           (procédure « fichier » + transparence sur les données)
├── .github/
│   ├── dependabot.yml           (maj auto des versions d'actions)
│   ├── ISSUE_TEMPLATE/          (modèles de bug / amélioration)
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── deploy.yml           (déploiement GitHub Pages)
│       ├── ci.yml               (contrôle & hygiène)
│       └── security.yml         (CodeQL + détection de secrets)
└── outils/
    ├── demande-ordonnance/
    │   └── index.html           (outil autonome : HTML + CSS + JS inline)
    ├── cloture-caisse/
    │   └── index.html           (outil autonome : HTML + CSS + JS inline)
    └── epaisseur-verres/
        └── index.html           (outil autonome : HTML + CSS + JS inline)
```

Chaque outil est un **fichier unique autonome** : `<style>` et `<script>` sont en ligne, sans import
de JS/CSS partagé ni bibliothèque tierce. Les outils redéclarent localement les variables de couleur
plutôt que d'importer `hub.css`.

---

## Intégration continue (CI/CD)

Trois workflows GitHub Actions, sur push `main` et pull request :

| Workflow | Rôle |
|---|---|
| `deploy.yml` | Publie le site sur GitHub Pages (actions de dernière génération). |
| `ci.yml` | **Contrôle & hygiène** : lint des workflows (actionlint), hygiène des fichiers (espaces de fin, CRLF, newline finale), validation HTML (html-validate), vérification des liens (lychee). |
| `security.yml` | **Sécurité** : analyse CodeQL du JS embarqué + détection de secrets (gitleaks). |

Réglages partagés : `.editorconfig` (style de fichiers), `.htmlvalidate.json` (règles HTML).
Dependabot met à jour les versions d'actions chaque semaine pour éviter les avertissements de dépréciation.

### Reproduire la CI en local

```sh
# Validation HTML (règles dans .htmlvalidate.json)
npx --yes html-validate "**/*.html"

# Hygiène des fichiers — chaque commande doit ne rien afficher :
git grep -nIP ' +$' -- ':!*.md'   # pas d'espaces de fin (Markdown exempté)
git grep -lIP '\r$' -- .          # pas de CRLF (LF uniquement)
# + tout fichier non binaire doit se terminer par une newline finale
```

---

## Ajouter un futur outil

1. Créer `outils/<nom-de-l-outil>/index.html` : un **fichier unique autonome** (HTML + CSS inline +
   JS inline), sans dépendance ni bibliothèque tierce.
2. Dans `index.html` (hub, à la racine), ajouter une carte `<article class="tool-card">` dans
   `<div id="tools-grid">`, en s'inspirant des cartes existantes.
3. Réutiliser les variables CSS définies dans `assets/css/hub.css` (`--blue`, `--blue-d`, `--ink`,
   `--bg`…) pour la cohérence visuelle.
4. Ajouter en haut de l'outil un lien « ← Retour » pointant vers `../../` (chemin relatif), plus le
   bouton flottant `.ios-back` révélé sur iOS (voir les outils existants).
5. **Rendre l'outil responsive** (`<meta name="viewport">` + règles `@media (max-width: 640px)`) : le
   personnel l'utilise sur smartphone.
6. Garder toutes les données côté client (voir la section Confidentialité).
7. Committer avec le préfixe `HF-XXX — description`.

---

## Convention de commits

Préfixe `HF-XXX` + description courte en français. Exemple :
`HF-003 — outil Demande/Ordonnance : structure et styles`

---

*Usage interne — Magasins d'optique*
