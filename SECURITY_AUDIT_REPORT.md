# Rapport d'audit de sécurité — Hub Tools & Templates

- **Dépôt** : `J-Rbs91/Hub_Tools_N_Templates`
- **Branche auditée** : `main` (HEAD `6422bb6`, identique à `origin/main` au moment de l'audit)
- **Branche de remédiation** : `claude/security-audit-main-wgzwj3`
- **Date** : 2026-06-20
- **Auditeur** : audit sécurité automatisé (lecture + analyse manuelle)

> ⚠️ Aucun secret n'est exposé dans ce rapport. Aucune correction n'a été poussée sur `main`.

---

## 1. Résumé exécutif

Le projet est un **site statique pur** (HTML/CSS/JS inline, sans build, sans backend, sans
base de données) distribué via GitHub Pages. La contrainte de confidentialité forte est
« aucune donnée utilisateur ne quitte le navigateur ». Cette posture réduit drastiquement la
surface d'attaque classique (pas d'API serveur, pas d'authentification, pas de stockage
serveur, pas d'injection SQL/NoSQL/commande possible).

L'audit confirme **une vulnérabilité réelle** (XSS stocké côté DOM) et identifie plusieurs
points de **durcissement** (défense en profondeur). Aucun secret n'est présent dans le dépôt.

| Criticité | Nombre |
|-----------|--------|
| Critique | 0 |
| Haute | 0 |
| Moyenne | 1 (VULN-001) |
| Basse | 4 (VULN-002, 003, 005, 006) |
| Informationnelle | 2 (VULN-004, 007) |

**Priorité n°1 :** corriger l'XSS stocké `VULN-001` (sink `innerHTML` du profil magasin).

---

## 2. Périmètre de l'audit

Couverts : dépendances & supply chain, secrets, variables d'environnement, routes/API,
authentification & sessions, autorisation, validation des entrées, injections
(SQL/NoSQL/commande/template/path traversal), XSS, CSRF, CORS, SSRF, upload de fichiers,
stockage de données sensibles, logs/exposition d'informations, configuration de production,
Docker/compose, CI/CD GitHub Actions, supply chain (scripts, packages), typage/erreurs
silencieuses, couverture de tests.

Non applicables (justifiés en §7) : Docker/compose (absents), backend/API serveur (absent),
authentification/sessions/tokens (absents), SQL/NoSQL/command injection (pas de serveur ni
d'exécution dynamique côté serveur).

---

## 3. Stack et architecture détectées

### Phase 1 — Cartographie

- **Stack technique** : HTML5 + CSS3 + JavaScript ES5/ES6 *vanilla*, intégralement **inline**
  dans chaque fichier. Aucun framework, aucun bundler, aucun gestionnaire de paquets
  applicatif (les seuls `npx` servent au lint CI). Police Manrope via Google Fonts.
- **Points d'entrée applicatifs** :
  - `index.html` — hub + modale « Mon magasin » (profil, sync Drive, sauvegarde/restauration).
  - `outils/cloture-caisse/index.html` — clôture de caisse (persistance `localStorage`).
  - `outils/demande-ordonnance/index.html` — génération d'e-mail/PDF (presse-papiers).
  - `outils/epaisseur-verres/index.html` — calculateur géométrique (entrées numériques).
  - `docs/sync-drive/index.html`, `docs/sauvegarde-fichier/index.html` — pages de procédure.
- **Surfaces d'attaque** :
  1. Contenu rendu dans le DOM via `innerHTML` (profil magasin, calculs).
  2. Synchronisation **JSONP** vers un endpoint Apps Script saisi par l'utilisateur
     (injection d'un `<script src>`).
  3. Import de fichier de sauvegarde JSON (restauration vers `localStorage`).
  4. Presse-papiers (`ClipboardItem` HTML) dans `demande-ordonnance`.
- **Zones sensibles** : profil magasin partagé (`profil-magasin-v1`), historique de caisse
  (`cloture-caisse-v1`), URL de synchronisation (`sync-url-v1`) — tous en `localStorage`.
- **Dépendances critiques** : aucune dépendance d'exécution. CI : `html-validate`, `actionlint`,
  `lychee`, `gitleaks`, CodeQL, actions GitHub officielles + tierces.
- **Fichiers de configuration importants** : `.github/workflows/{ci,deploy,security}.yml`,
  `.github/dependabot.yml`, `.htmlvalidate.json`, `.editorconfig`, `.gitignore`, `.nojekyll`.
- **Modes de déploiement** : GitHub Actions → GitHub Pages (`deploy.yml`, `upload-pages-artifact`).
- **Auth/autorisation** : **inexistantes** (outil interne sans comptes ; pas de notion d'identité).
- **Stockage des données** : **`localStorage` uniquement**, par navigateur/appareil. Aucune
  donnée patient persistée. `demande-ordonnance` ne stocke rien.
- **Intégrations externes** : Google Fonts (CSS/police) ; optionnel : Google Apps Script
  (Drive) déployé par le magasin pour la synchro du profil (jamais de données patient).

---

## 4. Outils utilisés et commandes principales

| Outil / méthode | But | Justification |
|---|---|---|
| `git` (status/log/diff/rev-parse) | État du dépôt, alignement sur `main` | Vérifier le périmètre exact audité |
| `ripgrep` (Grep) | Recherche des sinks dangereux (`innerHTML`, `eval`, `.src=`, JSONP, `localStorage`…) | Cartographier les flux de données non fiables |
| Lecture manuelle ciblée | Confirmer/infirmer chaque signal, écarter les faux positifs | Les scanners ne tracent pas les flux inline |
| `git grep` (patterns de secrets / en-têtes) | Recherche de secrets et d'en-têtes de sécurité | Confirmer absence de secret, absence de CSP/SRI |

Outils écartés (non pertinents pour la stack) : `npm/pnpm/yarn audit`, `pip-audit`, `bandit`,
`cargo audit`, `gosec`, `trivy`, `osv-scanner` — **aucune dépendance d'exécution ni
conteneur** à analyser. `gitleaks`/CodeQL tournent déjà en CI (`security.yml`).

Commandes représentatives exécutées (extraits) :

```sh
git rev-parse HEAD origin/main          # confirmation alignement main
git grep -nIP "innerHTML|eval\(|\.src\s*=|JSONP|localStorage"   # sinks
git grep -nIE "(AKIA…|AIza…|ghp_…|PRIVATE KEY|api[_-]?key…)"    # secrets → 0 résultat
git grep -nI "Content-Security|integrity="                      # CSP/SRI → 0 résultat
```

---

## 5. Synthèse des vulnérabilités par criticité

| ID | Titre | Criticité | Statut |
|----|-------|-----------|--------|
| VULN-001 | XSS stocké via le profil magasin (`innerHTML`) | **Moyenne** | Confirmé |
| VULN-002 | Absence de Content-Security-Policy (défense en profondeur) | Basse | Confirmé |
| VULN-003 | URL de synchronisation JSONP non validée (allowlist) | Basse | Confirmé |
| VULN-005 | Restauration de sauvegarde sans validation de types | Basse | Confirmé |
| VULN-006 | CI : `curl … | bash` non épinglé + actions épinglées par tag | Basse | Confirmé |
| VULN-004 | Apps Script (doc) : paramètre `callback` réfléchi sans validation | Informationnelle | Confirmé |
| VULN-007 | Déploiement Pages publie tout le dépôt (`path: .`) | Informationnelle | Confirmé |

---

## 6. Détail des vulnérabilités

### VULN-001 — XSS stocké via le profil magasin (`innerHTML`)

- **Criticité** : Moyenne — **Statut** : Confirmé
- **Fichier** : `index.html:357`
- **Description** : l'en-tête du hub construit le bloc « coordonnées » à partir des champs
  `adresse` et `tel` du profil magasin et les injecte via `innerHTML` :
  ```js
  metaEl.innerHTML = metaParts.join('<br>');   // adresse / tel NON échappés
  ```
  Ces valeurs ne sont jamais assainies. Tout `<` / `>` saisi est interprété comme du HTML.
- **Scénario d'exploitation réaliste** : le profil est alimenté par **trois sources** :
  1. la modale « Mon magasin » (auto-XSS) ;
  2. la **restauration d'un fichier de sauvegarde** (`doRestore`, `index.html:605`) ;
  3. la **synchronisation Drive** (`syncPull`, `index.html:484`), qui réécrit le profil dans
     `localStorage` à partir de la réponse de l'endpoint Apps Script.
  Via (2) ou (3), un opérateur reçoit un profil forgé (fichier partagé entre collègues, ou
  endpoint/Drive partagé par plusieurs postes/personnes du magasin). Une `adresse` du type
  `<img src=x onerror="…">` exécute du JS au rendu de l'en-tête sur **chaque appareil** qui
  importe ce profil.
- **Impact** : exécution de script arbitraire sur l'origine GitHub Pages partagée par **tous**
  les outils → lecture/exfiltration de tout le `localStorage` (profil, **historique de
  caisse**), réécriture des données des autres outils, hameçonnage dans l'interface. Brise la
  garantie « aucune donnée ne quitte le navigateur ».
- **Preuve/indice** : sink `innerHTML` sans échappement (les autres pages échappent
  systématiquement, cf. `esc()` dans `demande-ordonnance`).
- **Recommandation** : ne pas construire de HTML. Vider l'élément puis insérer des nœuds
  texte séparés par des `<br>` créés via `document.createElement('br')`, **ou** échapper
  `adresse`/`tel` avant interpolation. Conserver le retour à la ligne entre adresse et tél.
- **Difficulté** : faible — **Risque de régression** : faible (rendu identique).
- **Tests à ajouter** : page de test (ou commentaire de non-régression) vérifiant qu'un profil
  contenant `<img onerror>` n'exécute pas de script (rendu via `textContent`).

### VULN-002 — Absence de Content-Security-Policy

- **Criticité** : Basse (défense en profondeur) — **Statut** : Confirmé
- **Fichiers** : toutes les pages HTML (aucun `<meta http-equiv="Content-Security-Policy">`).
- **Description** : aucune CSP n'est déclarée. En cas d'XSS (cf. VULN-001) ou d'injection
  future, rien ne restreint l'origine des scripts ni les destinations d'exfiltration.
- **Scénario** : un `<script src="//evil">` injecté serait chargé librement.
- **Impact** : amplification de toute XSS.
- **Recommandation** : ajouter une CSP par `<meta http-equiv>` sur chaque page.
  - Limite connue : GitHub Pages ne permet pas d'en-têtes HTTP, donc `frame-ancestors`
    (anti-clickjacking) n'est **pas** applicable via `<meta>`. L'app étant 100 % JS/CSS
    **inline**, `script-src`/`style-src` doivent tolérer `'unsafe-inline'` (le passage aux
    *nonces/hashes* casserait l'architecture « fichier auto-contenu sans build »). La CSP reste
    utile pour : `object-src 'none'`, `base-uri 'none'`, restriction de `img/font/connect-src`,
    et **blocage des scripts externes non whitelistés** (`script-src 'self' 'unsafe-inline'`
    + `https://script.google.com` uniquement sur le hub pour la synchro JSONP).
- **Difficulté** : faible — **Régression** : faible (vérifier que la synchro JSONP et Google
  Fonts restent autorisées). **Tests** : chargement manuel de chaque page sans erreur CSP.

### VULN-003 — URL de synchronisation JSONP non validée

- **Criticité** : Basse — **Statut** : Confirmé
- **Fichier** : `index.html:445-462` (`jsonp()`), `index.html:516,523` (stockage `sync-url-v1`).
- **Description** : `jsonp()` crée `<script src=base…>` où `base` est l'URL saisie par
  l'utilisateur, sans contrôle de schéma/hôte. L'utilisateur fournit sa propre URL (intention
  légitime), mais aucune contrainte n'empêche une URL `http://` ou un hôte arbitraire d'être
  stockée puis exécutée comme source de script.
- **Scénario** : URL erronée/malveillante collée (ou introduite par un futur chemin d'import) →
  exécution de script tiers sur l'origine du hub.
- **Impact** : exécution de script arbitraire (similaire à une XSS) ; en `http://`, MITM réseau.
- **Recommandation** : valider l'URL avant stockage **et** avant chaque appel : n'accepter que
  `https://script.google.com/macros/s/…/exec`. Refuser et afficher un message sinon.
- **Difficulté** : faible — **Régression** : faible — **Tests** : URL valide acceptée, URL
  `http://` / hôte étranger rejetée.

### VULN-004 — Apps Script (documentation) : `callback` réfléchi sans validation

- **Criticité** : Informationnelle — **Statut** : Confirmé
- **Fichier** : `docs/sync-drive/index.html:204-226` (extrait de code Apps Script de référence).
- **Description** : `doGet` renvoie `cb + '(' + json + ')'` en `MimeType.JAVASCRIPT` sans
  valider `cb`. Injection de callback JSONP classique sur l'endpoint **du magasin** (origine
  `script.google.com`, hors périmètre du hub).
- **Impact** : faible et hors origine du hub ; principalement une bonne pratique à diffuser.
- **Recommandation** : dans l'extrait documenté, valider le nom de callback
  (`/^[A-Za-z_$][\w$]*$/`) avant réflexion ; sinon répondre en JSON.
- **Difficulté** : triviale — **Régression** : nulle.

### VULN-005 — Restauration de sauvegarde sans validation de types

- **Criticité** : Basse — **Statut** : Confirmé
- **Fichier** : `index.html:595-626` (`doRestore`).
- **Description** : `bundle.profil` est écrit tel quel dans `localStorage` sans vérifier que
  `nom/adresse/tel/mail` sont des chaînes. Couplé à VULN-001, c'est un vecteur d'injection ;
  des champs inattendus peuvent aussi être persistés.
- **Recommandation** : assainir le profil importé (coercition en chaîne + liste blanche de
  clés) avant stockage. La correction de VULN-001 neutralise déjà l'exécution.
- **Difficulté** : faible — **Régression** : faible — **Tests** : restauration d'un bundle dont
  `adresse` contient du HTML → stocké comme texte, non exécuté.

### VULN-006 — CI : `curl … | bash` non épinglé + actions épinglées par tag

- **Criticité** : Basse — **Statut** : Confirmé
- **Fichiers** : `.github/workflows/ci.yml` (installeur actionlint), `*.yml` (actions tierces).
- **Description** :
  - `ci.yml` télécharge et exécute `download-actionlint.bash` depuis
    `raw.githubusercontent.com/rhysd/actionlint/main/…` (**branche `main`, non épinglée**) puis
    le *pipe* dans `bash`. Compromission amont ou de la branche = exécution arbitraire dans le
    runner CI.
  - Les actions sont épinglées par **tag mobile** (`@v6`, `@v4`, `@v2`) et non par SHA, y
    compris des actions tierces (`lycheeverse/lychee-action`, `gitleaks/gitleaks-action`).
- **Impact** : risque supply chain sur le pipeline CI (les workflows ont `contents: read`, ce
  qui limite l'impact ; `deploy.yml` a `pages: write`/`id-token: write`).
- **Recommandation** : épingler l'installeur actionlint à un **tag de version** précis (et de
  préférence vérifier un checksum), ou utiliser l'action officielle épinglée par SHA ; épingler
  les actions tierces par **SHA de commit** (Dependabot continue de les mettre à jour).
- **Difficulté** : faible — **Régression** : faible (revalider la CI) — **Tests** : exécution CI verte.

### VULN-007 — Déploiement Pages publie tout le dépôt

- **Criticité** : Informationnelle — **Statut** : Confirmé
- **Fichier** : `.github/workflows/deploy.yml` (`upload-pages-artifact` avec `path: .`).
- **Description** : l'artefact Pages inclut l'ensemble du dépôt (`CLAUDE.md`,
  `Test-QA-15-juin.md`, `.github/…` non servis mais présents dans l'artefact, etc.). Aucun
  secret n'y figure, mais des documents internes deviennent publiquement accessibles.
- **Recommandation** : optionnel — restreindre l'artefact aux fichiers du site (ou accepter
  l'exposition, le contenu n'étant pas sensible). À traiter en dernier.

---

## 7. Faux positifs / risques écartés

- **`innerHTML` dans `outils/epaisseur-verres/index.html`** (lignes 1161, 1175, 1188, 1449…,
  2093, 2127) : n'injecte que des **nombres formatés** (entrées `parseFloat`/`parseInt`) et des
  **libellés littéraux fixes** (`notes.push('…')`, `cfg.label` issu d'une config interne).
  Pas de texte libre utilisateur → **non exploitable**.
- **`innerHTML` / presse-papiers dans `demande-ordonnance`** : toutes les entrées passent par
  `esc()` (échappe `& < >`) avant interpolation ; l'en-tête affiché utilise `textContent`
  (`index.html` de l'outil, l.621). **Sûr.**
- **`cloture-caisse`** : aucun `innerHTML` ; rendu via `textContent`. **Sûr.**
- **JSONP — confiance dans la réponse** (`window[name](res)`) : la réponse provient de
  l'endpoint **du magasin lui-même** ; la confiance est assumée par conception (voir VULN-003
  pour le durcissement de l'URL).
- **Injections SQL/NoSQL/commande/template, SSRF, CSRF, upload serveur** : **non applicables**
  (pas de backend, pas d'exécution serveur, pas de cookies de session, pas d'upload serveur).
- **Secrets / variables d'environnement** : **aucun secret** trouvé dans le code ou l'historique
  grep ; le seul secret CI est `GITHUB_TOKEN` (fourni par la plateforme, usage normal).
- **SRI absent sur Google Fonts** : la feuille CSS Google Fonts est générée dynamiquement, le
  SRI n'est pas applicable ; risque accepté (intégration documentée).
- **`target="_blank"`** : les liens externes portent déjà `rel="noopener"` (pas de tabnabbing).

---

## 8. Recommandations prioritaires

1. **Corriger VULN-001** (XSS stocké) — sink `innerHTML` du profil → `textContent` + `<br>` DOM.
2. **VULN-003** — valider l'URL de synchro (`https://script.google.com/…/exec`).
3. **VULN-005** — assainir/coercer le profil importé à la restauration.
4. **VULN-002** — ajouter une CSP `<meta>` sur toutes les pages (défense en profondeur).
5. **VULN-006** — épingler l'installeur actionlint et les actions tierces (SHA).
6. **VULN-004** — durcir l'extrait Apps Script de référence (validation du `callback`).
7. **VULN-007** — (optionnel) restreindre l'artefact Pages.

---

## 9. Plan de remédiation (ordre logique)

1. Secrets/config : **RAS** (aucun secret) ; durcissement CSP (VULN-002).
2. Dépendances/supply chain : VULN-006 (CI).
3. Auth/autorisation : **non applicable**.
4. Injections/validation : VULN-001, VULN-003, VULN-005, VULN-004.
5. Frontend/backend : VULN-001/002 (frontend) ; pas de backend.
6. Infra/CI/CD : VULN-006, VULN-007.
7. Tests : non-régression XSS + validation d'URL (voir §10).
8. Audit final : relance des contrôles d'hygiène + relecture (voir `SECURITY_REMEDIATION_REPORT.md`).

### Affectation aux agents de remédiation (Phase 4)

Pour éviter les éditions concurrentes, le découpage est **par fichier** :

- **Agent Frontend & Validation des entrées** → `index.html` : VULN-001, VULN-003, VULN-005, +
  CSP (VULN-002) sur toutes les pages HTML (seul agent touchant les `.html`).
- **Agent Infrastructure & CI/CD** → `.github/workflows/*.yml` : VULN-006, VULN-007.
- **Agent Documentation / Apps Script** → `docs/sync-drive/index.html` : VULN-004.
- **Agent Tests & Non-Régression** → ajoute les tests de non-régression (fichier dédié).
- **Agent QA Sécurité Final** → relit, relance les contrôles, complète le rapport final.

---

## 10. Tests de sécurité recommandés

- **Non-régression XSS (VULN-001/005)** : profil avec `adresse = "<img src=x onerror=alert(1)>"`
  → l'en-tête affiche le texte littéral, aucun script exécuté.
- **Validation d'URL de synchro (VULN-003)** : `https://script.google.com/macros/s/x/exec`
  accepté ; `http://…`, `https://evil.example/…`, `javascript:…` rejetés.
- **CSP (VULN-002)** : chaque page se charge sans violation ; un `<script src>` externe non
  whitelisté est bloqué.
- **CI (VULN-006)** : pipeline vert après épinglage.

Ces tests prennent la forme d'une page HTML de vérification autonome (cohérente avec
l'architecture sans framework de test), exécutable manuellement dans un navigateur.

---

## 11. Risques résiduels

- L'architecture **100 % inline** impose `'unsafe-inline'` dans la CSP : la protection XSS de la
  CSP reste partielle (l'élimination du sink VULN-001 est la vraie défense).
- GitHub Pages ne permet pas d'en-têtes HTTP : pas de `frame-ancestors` / HSTS / `X-Content-Type`.
- La synchronisation JSONP reste, par nature, un mécanisme de confiance envers l'endpoint du
  magasin (atténué, pas éliminé, par la validation d'URL).
- `localStorage` n'est pas chiffré : l'historique de caisse reste lisible par tout script
  s'exécutant sur l'origine (d'où l'importance de VULN-001/002).

---

## 12. Fichiers modifiés pendant l'audit

À ce stade (fin de l'audit, avant remédiation) : **ajout de ce seul fichier**
`SECURITY_AUDIT_REPORT.md`. Aucune modification de code n'a été nécessaire pour mener l'analyse.
Les corrections sont suivies dans `SECURITY_REMEDIATION_REPORT.md` (Phase 6).
