# Hub Outils Internes

Site statique d'outils internes destiné aux magasins d'optique. Chaque magasin renseigne ses
coordonnées **une seule fois** via le bouton « ⚙ Mon magasin » du hub : nom, adresse, téléphone,
e-mail et fond de caisse sont alors stockés localement dans le navigateur et réutilisés par tous
les outils. Aucune configuration côté code n'est nécessaire pour déployer dans un nouveau magasin.

Déployé via GitHub Pages, à l'adresse `https://<utilisateur>.github.io/<nom-du-depot>/`.

---

## Outils disponibles

| Outil | Description | Statut |
|---|---|---|
| [Demande / Ordonnance](outils/demande-ordonnance/) | Formulaire de demande au médecin (modification de prescription, CR adaptation lentilles, renouvellement…) avec export PDF et copie Gmail | Disponible |
| [Clôture de Caisse](outils/cloture-caisse/) | Comptage de fin de journée (pièces, billets, paiements électroniques), écart vs logiciel métier, reprise du comptage de la veille, historique local | Disponible |

> **Profil magasin** — un profil partagé (clé `localStorage` `profil-magasin-v1`) renseigné une
> fois sur le hub pré-remplit l'en-tête de la Demande/Ordonnance et le fond de caisse par défaut de
> la Clôture de Caisse. Comme `localStorage` est propre à chaque navigateur/poste, les données d'un
> magasin ne se mélangent jamais avec celles d'un autre — mais elles ne se partagent pas non plus
> entre deux postes d'un même magasin.

---

## Confidentialité

**Aucune donnée saisie ne quitte le navigateur.**

- Zéro backend, zéro serveur, zéro base de données.
- Aucun tracker, aucun analytics, aucun cookie.
- Toutes les saisies (données patient, prescriptions) restent strictement locales dans le navigateur.
- Les exports (PDF, copie Gmail) sont générés entièrement côté client.
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
├── README.md
├── LICENSE
├── .gitignore
├── assets/
│   └── css/
│       └── hub.css
├── .github/
│   ├── dependabot.yml          (maj auto des versions d'actions)
│   └── workflows/
│       ├── deploy.yml          (déploiement GitHub Pages)
│       ├── ci.yml              (contrôle & hygiène)
│       └── security.yml        (CodeQL + détection de secrets)
└── outils/
    ├── demande-ordonnance/
    │   └── index.html          (outil autonome : HTML + CSS + JS)
    └── cloture-caisse/
        └── index.html          (outil autonome : HTML + CSS + JS)
```

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

---

## Ajouter un futur outil

1. Créer le dossier `outils/<nom-de-l-outil>/` avec son `index.html` (et éventuellement `style.css` / `app.js`).
2. Dans `index.html` (hub, à la racine), ajouter une carte `<article class="tool-card">` dans `<div id="tools-grid">`, en s'inspirant de la carte existante.
3. Respecter les variables CSS définies dans `assets/css/hub.css` (`--blue`, `--blue-d`, `--ink`, `--bg`…).
4. Ajouter un lien « ← Retour aux outils » en haut de l'outil pointant vers `../../` (chemin relatif).
5. Committer avec le préfixe `KF-XXX — description`.

---

## Convention de commits

Préfixe `KF-XXX` + description courte en français. Exemple :
`KF-003 — outil Demande/Ordonnance : structure et styles`

---

*Usage interne — Magasins d'optique*
