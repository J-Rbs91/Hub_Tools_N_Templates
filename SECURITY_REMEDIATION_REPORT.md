# Rapport de remédiation de sécurité — Hub Tools & Templates

- **Dépôt** : `J-Rbs91/Hub_Tools_N_Templates`
- **Branche** : `claude/security-audit-main-wgzwj3` (basée sur `main` / `6422bb6`)
- **Date** : 2026-06-20
- **Référence** : `SECURITY_AUDIT_REPORT.md` (audit complet, Phases 1–3)
- **Méthode** : orchestration de 2 agents de remédiation à périmètres de fichiers disjoints
  (Frontend & Validation → `.html` ; Infra & CI/CD → `.github/workflows`), puis QA Sécurité Final.

> ⚠️ Aucun secret n'est exposé. Aucun push direct sur `main`.

---

## 1. Résumé des vulnérabilités corrigées

| ID | Titre | Criticité | Statut final |
|----|-------|-----------|--------------|
| VULN-001 | XSS stocké via le profil magasin (`innerHTML`) | Moyenne | ✅ Corrigé |
| VULN-002 | Absence de Content-Security-Policy | Basse | ✅ Corrigé (défense en profondeur) |
| VULN-003 | URL de synchronisation JSONP non validée | Basse | ✅ Corrigé |
| VULN-004 | Apps Script (doc) : `callback` réfléchi sans validation | Informationnelle | ✅ Corrigé |
| VULN-005 | Restauration de sauvegarde sans validation de types | Basse | ✅ Corrigé |
| VULN-006 | CI : `curl … | bash` non épinglé + actions tierces par tag | Basse | ✅ Corrigé |
| VULN-007 | Déploiement Pages publie tout le dépôt | Informationnelle | ⚠️ Accepté/documenté |

**7 vulnérabilités traitées : 6 corrigées, 1 risque résiduel documenté et assumé.**

---

## 2. Vulnérabilités restantes et justification

- **VULN-007 (Informationnelle)** — `upload-pages-artifact` conserve `path: .`. Décision :
  **ne pas modifier** pour ne pas risquer de casser le déploiement Pages ; aucun secret n'est
  embarqué. Un commentaire YAML documente désormais ce risque résiduel dans `deploy.yml`.
- **Limites structurelles non « corrigibles »** (cf. §7) : `'unsafe-inline'` imposé par
  l'architecture inline ; absence d'en-têtes HTTP (GitHub Pages) ⇒ pas de `frame-ancestors`/HSTS ;
  confiance résiduelle envers l'endpoint Apps Script du magasin (atténuée par l'allowlist d'URL).

---

## 3. Changements réalisés par fichier

### `index.html` (VULN-001, 002, 003, 005)
- **VULN-001** — `renderHeader()` : le sink `metaEl.innerHTML = metaParts.join('<br>')` est
  remplacé par une construction DOM sûre (`textContent=''` puis `createTextNode` + `createElement('br')`).
  Les coordonnées (`adresse`, `tel`) sont désormais rendues comme **texte**, jamais interprétées en HTML.
- **VULN-003** — ajout de `isValidSyncUrl(u)` (allowlist
  `^https://script\.google\.com/macros/s/[^/?#]+/exec…`). Vérification ajoutée dans `syncPush`,
  `syncPull`, le handler `submit` de `settings-form` et le handler du bouton `pull-sync` :
  une URL non vide invalide n'est **plus stockée** et un message d'erreur s'affiche.
- **VULN-005** — ajout de `sanitizeProfil(p)` (liste blanche `nom/adresse/tel/mail` + coercition
  en chaîne). Appliqué après `JSON.parse` dans `syncPull` et dans `doRestore` (profil importé
  assaini avant écriture `localStorage` et `fillForm`).
- **VULN-002** — `<meta http-equiv="Content-Security-Policy">` ajouté (variante autorisant
  `https://script.google.com` pour la synchro JSONP).

### `outils/cloture-caisse/index.html`, `outils/demande-ordonnance/index.html`, `outils/epaisseur-verres/index.html`, `docs/sauvegarde-fichier/index.html` (VULN-002)
- Ajout de la CSP `<meta>` (variante **sans** `script.google.com` — pas de JSONP sur ces pages).

### `docs/sync-drive/index.html` (VULN-002, 004)
- **VULN-002** — CSP `<meta>` (variante sans `script.google.com`).
- **VULN-004** — dans l'extrait Apps Script de référence (`doGet`), ajout d'une validation du
  nom de callback JSONP : `if (cb && !/^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(cb)) { cb = null; }`.

### `.github/workflows/ci.yml` (VULN-006)
- Étape `actionlint` : remplacement de `curl … /actionlint/main/… | bash` (branche mobile,
  pipe direct) par un téléchargement **épinglé** sur le tag `v1.7.7`, écrit dans un fichier puis
  exécuté avec la version passée en argument (`bash download-actionlint.bash 1.7.7`).
- `lycheeverse/lychee-action@v2` → `@8646ba30535128ac92d33dfc9133794bfdd9b411 # v2.8.0` (SHA épinglé).

### `.github/workflows/security.yml` (VULN-006)
- `gitleaks/gitleaks-action@v3` → `@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3.0.0` (SHA épinglé).

### `.github/workflows/deploy.yml` (VULN-007)
- Commentaire documentant le risque résiduel `path: .` (aucune modification fonctionnelle).

### `tests/securite/index.html` (NOUVEAU — tests de non-régression)
- Page HTML auto-contenue (cohérente avec l'architecture sans framework de test), exécutant en
  navigateur des assertions PASS/FAIL.

> **Note** : les actions **officielles** GitHub (`actions/*`, `github/codeql-action/*`) ont été
> volontairement laissées en tag majeur (`@v6`, `@v4`, `@v5`) — sources de confiance suivies par
> Dependabot — afin de ne pas introduire de risque de casse.

---

## 4. Tests ajoutés ou modifiés

`tests/securite/index.html` couvre :
- **(a) VULN-001/005** — rendu DOM anti-XSS : un profil dont `adresse = '<img src=x onerror=…>'`
  est rendu via le correctif ; assertions : `window.__xss` reste `undefined`, **aucun** élément
  `<img>` créé, `textContent` contient la chaîne littérale.
- **(b) VULN-003** — `isValidSyncUrl` (copie exacte) sur 6 cas : 2 URLs Apps Script HTTPS valides
  acceptées ; `http://…`, hôte étranger, `javascript:…`, chaîne vide rejetés.
- **(c) VULN-005** — `sanitizeProfil` (copie exacte) : `{ nom:'A', adresse:123, tel:null,
  mail:undefined, evil:'x' }` ⇒ clés **exactement** `nom/adresse/tel/mail`, toutes des chaînes,
  pas de clé `evil`.

Récapitulatif « X/Y tests réussis » affiché en bas de page. Exécution : ouvrir
`tests/securite/index.html` dans un navigateur (la CI ne dispose pas de runner JS ; le projet
n'a pas de framework de test — choix cohérent avec l'architecture).

---

## 5. Commandes exécutées

```sh
# Audit / périmètre
git rev-parse HEAD origin/main
git grep -nIP "innerHTML|eval\(|\.src\s*=|JSONP|localStorage"
git grep -nIE "(AKIA…|AIza…|ghp_…|PRIVATE KEY|api[_-]?key…)"   # secrets → 0

# Vérification des contrôles d'hygiène CI (reproduits localement)
git grep -nIP ' +$' -- ':!*.md'        # espaces fin de ligne → 0
git grep -lIP '\r$' -- .               # CRLF → 0
# + contrôle newline finale sur tous les fichiers suivis/non suivis → OK
npx --yes html-validate "**/*.html"    # → aucune erreur

# Vérification des épinglages SHA (anti faux-SHA)
git ls-remote https://github.com/lycheeverse/lychee-action.git   # 8646ba3 = v2/v2.8.0 ✓
git ls-remote https://github.com/gitleaks/gitleaks-action.git    # e0c47f4 = v3/v3.0.0 ✓
git ls-remote https://github.com/rhysd/actionlint.git            # v1.7.7 existe ✓
```

---

## 6. Résultat des scanners / contrôles après correction

| Contrôle | Résultat |
|---|---|
| `html-validate "**/*.html"` (incl. nouvelles CSP + page de test) | ✅ Aucune erreur |
| Hygiène : espaces fin de ligne | ✅ 0 |
| Hygiène : CRLF | ✅ 0 |
| Hygiène : newline finale | ✅ OK sur tous les fichiers |
| Recherche de secrets (grep ciblé) | ✅ 0 secret |
| Épinglage SHA des actions tierces | ✅ vérifié via `git ls-remote` |
| CodeQL / gitleaks (CI) | ⏳ s'exécuteront au push (workflows `security.yml`) |

> Note : `npm/pip/cargo/trivy audit` restent **non applicables** (aucune dépendance d'exécution
> ni conteneur). CodeQL et gitleaks tournent en CI à chaque push/PR.

---

## 7. Risques résiduels

- **CSP partielle** : l'architecture 100 % inline impose `'unsafe-inline'` (scripts/styles) ; la
  CSP reste une **défense en profondeur** — la vraie protection est l'élimination du sink
  (VULN-001). Elle bloque néanmoins les scripts/objets/cadres externes non whitelistés.
- **GitHub Pages sans en-têtes HTTP** : pas de `frame-ancestors` (anti-clickjacking), HSTS,
  `X-Content-Type-Options` — non disponibles via `<meta>`.
- **Synchro JSONP** : confiance résiduelle envers l'endpoint Apps Script du magasin, désormais
  restreinte aux URLs `https://script.google.com/macros/s/…/exec`.
- **`localStorage` non chiffré** : l'historique de caisse reste lisible par tout script de
  l'origine — d'où l'importance des correctifs VULN-001/002.
- **À vérifier manuellement (non bloquant)** : la sauvegarde télécharge un fichier via
  `URL.createObjectURL` + `<a download>`. Les téléchargements `a[download]` ne sont normalement
  pas soumis aux directives `fetch` de la CSP ; confirmer en navigateur que le bouton
  « Sauvegarder » fonctionne toujours après ajout de la CSP.
- **UX mineure (non sécuritaire)** : à l'enregistrement du profil avec une URL de synchro
  invalide, le message d'erreur s'affiche puis la modale se ferme (`closeModal`) ; le profil est
  bien enregistré et l'URL invalide rejetée. Amélioration possible ultérieure.

---

## 8. Actions recommandées après merge

- **Rotation de secrets** : *sans objet* — aucun secret dans le dépôt ni l'historique. Le seul
  secret CI est `GITHUB_TOKEN` (fourni par la plateforme).
- **Revue humaine** : valider le rendu de l'en-tête du hub et le fonctionnement de la synchro
  Drive + de la sauvegarde/restauration sur un poste réel (mobile inclus, contrainte du projet).
- **Variables d'environnement** : *sans objet* (aucune).
- **Déploiement contrôlé** : merger sur `main` déclenche `deploy.yml` → Pages ; vérifier le
  premier déploiement et l'absence de violation CSP dans la console du navigateur.
- **Surveillance / alertes** : activer/surveiller les alertes CodeQL & gitleaks (déjà en CI) ;
  s'assurer que Dependabot maintient les SHA épinglés à jour (digests).
- **Amélioration CI/CD** : envisager d'épingler progressivement les actions officielles par SHA
  (via Dependabot avec digests) ; éventuellement restreindre l'artefact Pages (VULN-007) si le
  contenu interne ne doit pas être servi.

---

## 9. Traçabilité VULN → fichiers

| VULN | Fichiers |
|------|----------|
| VULN-001 | `index.html` |
| VULN-002 | `index.html`, `outils/*/index.html` (×3), `docs/*/index.html` (×2), `tests/securite/index.html` |
| VULN-003 | `index.html` |
| VULN-004 | `docs/sync-drive/index.html` |
| VULN-005 | `index.html` |
| VULN-006 | `.github/workflows/ci.yml`, `.github/workflows/security.yml` |
| VULN-007 | `.github/workflows/deploy.yml` (documenté) |
| Tests | `tests/securite/index.html` |
