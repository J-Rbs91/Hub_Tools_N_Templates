# Test QA — 15 juin

Campagne de tests « torture » menée au navigateur réel (Playwright / Chromium),
en double passe **desktop 1366×900** et **mobile iPhone 13**, sur les six pages du hub :
accueil, les trois outils (`demande-ordonnance`, `cloture-caisse`, `epaisseur-verres`)
et les deux pages de documentation (`docs/sauvegarde-fichier`, `docs/sync-drive`).

Objectif : débusquer tout ce qui rend l'application **moins efficace, moins agréable
ou moins performante** côté utilisateur — bugs, frictions, écarts d'accessibilité,
entorses à l'architecture du projet.

## Méthode

- Chargement de chaque page, capture des **erreurs JS / `pageerror` / requêtes échouées**.
- Captures d'écran plein-page desktop **et** mobile.
- Scénarios d'interaction réels : ouverture/fermeture de la modale, validation de
  formulaire, saisies limites (négatifs, décimales, valeurs absurdes, texte dans un
  champ numérique), virgule décimale FR, génération automatique de paragraphe,
  copie presse-papiers, enregistrement d'historique, navigation au clavier, etc.

Bonne nouvelle de départ : **aucun crash JS** (`pageerror`) sur aucune page, et la
logique métier (totaux caisse, calcul d'épaisseur, dédoublonnage de l'historique du
jour, report de la veille) fonctionne. Les points ci-dessous sont des défauts de
robustesse, d'accessibilité, de conformité et d'ergonomie.

> Note environnement : les requêtes vers Google Fonts et le CDN Three.js échouent
> dans le bac à sable de test (certificat). Ce n'est **pas** un bug en production —
> mais la dépendance CDN elle-même en est un (voir QA-01).

---

## Synthèse des points relevés

| # | Sévérité | Zone | Point |
|------|----------|------|-------|
| QA-01 | **Haute** | epaisseur-verres | Three.js chargé depuis un **CDN** (`cdn.jsdelivr.net`) — viole « no CDN / no third-party libraries / no network calls » |
| QA-02 | Moyenne | hub (modale) | **Pas de piège de focus** : la tabulation s'échappe derrière la modale ouverte |
| QA-03 | Moyenne | hub (modale) | **Pas de blocage du défilement** de l'arrière-plan quand la modale est ouverte |
| QA-04 | Moyenne | hub (modale) | Un e-mail **facultatif** mais malformé **bloque tout l'enregistrement** (nom inclus) |
| QA-05 | Basse | hub (cartes) | Carte « tout-cliquable » **non accessible au clavier** (handler souris seulement) |
| QA-06 | Basse | cloture-caisse | Les quantités acceptent des **décimales tronquées en silence** (`parseInt`) |
| QA-07 | Basse | cloture-caisse | Aucune **borne haute** : `99999999999` billets accepté et enregistré |
| QA-08 | Basse | demande-ordonnance | Faute de casse dans l'intro auto (« …,\nje me permets… » en minuscule) |
| QA-09 | Basse | hub (cartes) | Révélation au scroll : les cartes sous la ligne de flottaison restent à `opacity:0` tant qu'on ne défile pas (fragilité si l'`IntersectionObserver` ne se déclenche pas) |

---

## Détail

### QA-01 — Dépendance CDN Three.js (Haute)

`outils/epaisseur-verres/index.html` charge la 3D ainsi :

```js
import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
```

C'est en contradiction frontale avec les contraintes **dures** du projet
(`CLAUDE.md`) : *« no third-party libraries »*, *« no CDN »*, *« no network calls »*,
*« the only external resource is the Manrope webfont »*.

Conséquences :
- **Fuite de vie privée** : le CDN voit l'IP / le referer de chaque poste de magasin.
- **Point de défaillance unique** : si le CDN est lent ou bloqué, on attend **jusqu'à
  6 s** (timeout) avant de basculer sur le repli.
- **Performance** : ~600 Ko téléchargés à chaque visite alors qu'un moteur **maison**
  existe déjà.

Fait notable : le fichier embarque déjà un **renderer WebGL maison complet**
(`initWebGLFallback`) avec parité fonctionnelle (rotation, zoom, vue de profil,
recentrage, mode 1:1, passes monture / verre / dépassements). Le repli rend
correctement les deux verres.

**Arbitrage retenu : on supprime l'`import` CDN et le renderer maison devient le
moteur unique.** C'est la seule option qui restaure pleinement la conformité
(privacy + no-CDN + no-build) ; auto-héberger Three.js resterait une « third-party
library » embarquée et ~600 Ko de plus. On retire aussi le libellé « (repli) ».

### QA-02 — Modale sans piège de focus (Moyenne)

Modale « Mon magasin » : en tabulant depuis le dernier champ, le focus **sort de la
modale** et part sur les éléments d'arrière-plan (vérifié : le focus s'échappe en
moins de 25 tabulations). Problème d'accessibilité clavier / lecteur d'écran.
**Correctif** : confiner le focus dans la modale tant qu'elle est ouverte, et rendre
le focus au bouton déclencheur à la fermeture.

### QA-03 — Pas de verrouillage du défilement (Moyenne)

Quand la modale est ouverte, `body { overflow: visible }` : l'arrière-plan défile
sous la modale (gênant surtout au tactile, la modale étant longue). **Correctif** :
bloquer le scroll du `body` à l'ouverture, le rétablir à la fermeture.

### QA-04 — E-mail facultatif qui bloque l'enregistrement (Moyenne)

Le champ e-mail est marqué *facultatif* mais utilise `type="email"`. Saisir une
valeur malformée (`pas-un-email`) **empêche tout l'enregistrement** : ni le nom
(obligatoire) ni rien n'est sauvegardé, l'en-tête reste « Outils internes ». Seule
une bulle native (parfois manquée) prévient l'utilisateur. **Correctif** : valider
l'e-mail de façon souple (autoriser le champ vide, message clair et non bloquant si
malformé) sans empêcher la sauvegarde du reste.

### QA-05 — Carte tout-cliquable non accessible au clavier (Basse)

Le clic sur n'importe quelle zone d'une `tool-card` ouvre l'outil (handler `click`
souris), mais la carte n'est pas focalisable : un utilisateur clavier ne dispose que
du lien « Accéder à l'outil ». **Correctif** : conserver le confort souris, sans
régression clavier (le lien interne reste le point d'entrée focalisable — vérifier
qu'il est bien atteignable et visible au focus).

### QA-06 — Quantités décimales tronquées en silence (Basse)

`cloture-caisse` : un champ quantité (`step="1"`) accepte la saisie `2,7` ; le calcul
fait `parseInt` → **2** (ligne `1,00 €` pour des pièces de 0,50 €) alors que le champ
**affiche toujours `2.7`**. Désaccord visible entre la valeur affichée et la valeur
comptée. **Correctif** : normaliser la saisie (arrondir/forcer l'entier) pour que
l'affiché = le compté.

### QA-07 — Pas de borne haute sur les montants/quantités (Basse)

Aucune limite : `99999999999` billets → total `19 999 999 999 950,00 €`, valeur ensuite
**persistée dans l'historique**. Une faute de frappe produit un total absurde durable.
**Correctif** : borner raisonnablement (ex. `max` sur les quantités, garde-fou sur les
montants électroniques).

### QA-08 — Faute de casse dans le paragraphe auto (Basse)

`demande-ordonnance`, branche « modification de prescription » :
`'je me permets de vous adresser…'` commence par une minuscule après le retour à la
ligne suivant « Docteur X, ». Les autres branches commencent bien par « Je vous
transmets… ». **Correctif** : majuscule initiale (« Je me permets… »).

### QA-09 — Révélation au scroll fragile (Basse)

Les cartes sous la ligne de flottaison restent à `opacity:0` jusqu'au défilement
(effet voulu via `IntersectionObserver`). Le `prefers-reduced-motion` est bien géré.
Risque résiduel : si l'observer ne se déclenche jamais (cas limite), des cartes
peuvent rester invisibles. **Correctif défensif** : garantir une visibilité de
secours (révélation après un court délai, ou au `load`).

---

## Ce qui a été vérifié et fonctionne

- Aucune erreur JS / aucun crash sur les 6 pages (desktop + mobile).
- Hub : ouverture modale, champ requis, `Échap` pour fermer, retour d'état de la
  synchro sans URL, téléchargement de la sauvegarde, navigation par clic sur carte.
- Demande/Ordonnance : génération auto de l'intro, copie presse-papiers (toast OK),
  réinitialisation avec confirmation.
- Clôture caisse : totaux pièces/billets/espèces, **quantités négatives ramenées à 0**,
  calcul d'écart, alerte de sortie de caisse, **dédoublonnage du comptage du jour**
  (un seul enregistrement par date), report de la veille.
- Épaisseur : calcul OD/OG, **virgule décimale FR** acceptée, « Copier OD → OG »,
  activation « base spéciale », carrousel de profils, comparaison client,
  **dégradation propre** sur saisies invalides (texte dans une côte → valeur par défaut).
- Responsive mobile : empilement correct des blocs sur les trois outils.
