# Navigation arrière — ce que fait le geste retour dans le hub

Ce document dit ce que doit faire le bouton retour d'Android, le bouton retour
du navigateur et le bouton retour flottant d'iOS, comment c'est tenu dans le
code, et comment le vérifier.

Il applique le contrat de navigation arrière de la méthode UXER
(`references/back-navigation-contract.md` du plugin) à un site statique
multi-pages.

---

## 1. La règle

> **La pile d'historique est toujours le chemin de la racine à l'écran courant.**

Le geste retour de toutes les plateformes rejoue la pile d'historique. Personne
ne se représente une application comme une chronologie de visites : on se la
représente comme un arbre, et « retour » veut dire **remonter d'un niveau**.

Les deux coïncident tant qu'on ne fait que descendre. Ils divergent dès qu'une
couche — modale, popup, assistant — s'ouvre sans figurer dans l'historique.

## 2. Ce que ça donne ici

Le hub est un site **multi-pages** : une page par outil, des liens réels. La
descente hub → outil et la remontée outil → hub sont donc portées par le
navigateur lui-même, et n'ont jamais posé de problème.

Le défaut était ailleurs, dans les **couches** :

| Couche | Fichier | Avant | Après |
|---|---|---|---|
| Modale « Mon magasin » | `index.html` | Retour quittait le hub, saisie perdue | Retour referme la modale |
| Modale « Un retour à me faire ? » | `index.html` | idem | Retour referme la modale |
| Popup « champs vides » | `outils/demande-ordonnance/` | Retour quittait l'outil, formulaire perdu | Retour referme la popup |
| Assistant photo, 5 étapes | `outils/epaisseur-verres/` | Retour quittait l'outil et effaçait le relevé | Retour remonte d'une étape ; fermer quitte l'assistant d'un coup |

Aucune de ces couches ne figurait dans l'historique. Sur un iPhone, où on
referme d'un bouton visible, le défaut ne se voyait pas. Sur un Android, où le
retour est un geste système utilisé sans y penser, un appui suffisait à perdre
un formulaire à moitié rempli.

## 3. Comment c'est tenu

Un seul mécanisme, le gestionnaire `Couches`, présent à l'identique dans les
trois fichiers qui portent des couches.

- **Ouvrir une couche empile une entrée d'historique** (`history.pushState`).
- **Fermer une couche consomme cette entrée** (`history.go`).
- **Rien n'est intercepté.** C'est le navigateur qui dépile ; on écoute
  `popstate`. Intercepter le geste retour casserait le glissement latéral
  d'iOS, entrerait en concurrence avec les gestes système d'Android, et
  casserait le retour du navigateur sur ordinateur.
- **Un seul chemin de fermeture.** Le bouton « Fermer », la touche Échap, le
  clic sur le fond et le geste retour aboutissent tous à la même fonction.
  C'est ce qui garantit qu'ils mènent au même endroit.
- **Une étape d'assistant est une descente.** Elle empile ; « ← Précédent »
  dépile. Le nombre d'appuis pour sortir vaut la profondeur atteinte, pas le
  nombre d'écrans visités.
- **La pile se recalcule depuis l'état affiché**, jamais depuis les clics.
  Rouvrir l'assistant sur l'étape 4 réempile quatre entrées : c'est ce qui rend
  le comportement identique qu'on soit arrivé par un clic, par le geste retour
  ou par un rechargement.

### Ce qui n'est pas une couche

Le menu déroulant « Outil concerné » de la modale de contact est un dépliant à
l'intérieur d'une couche, pas un écran. Échap le referme en premier ; le geste
retour referme la modale entière — ce que fait aussi « Annuler », donc les deux
retours restent d'accord.

### Duplication assumée

Les outils sont **autonomes par construction** (voir `CLAUDE.md`) : pas
d'import JS partagé. Le gestionnaire est donc recopié plutôt qu'importé, et
`tests/navigation-retour.test.mjs` vérifie que les copies restent identiques
ligne pour ligne. Deux copies qui divergent, ce serait deux comportements du
bouton retour dans la même application.

## 4. Le bouton retour d'iOS

iPhone et iPad n'ont pas de bouton retour matériel, et en mode « ajouté à
l'écran d'accueil » il n'y a pas non plus de barre de navigateur. Sans bouton
dans l'interface, l'outil est **sans issue**.

Chaque outil embarque donc un `← Retour` flottant (`.ios-back`), révélé par
`body.is-ios`, en plus du lien d'en-tête masqué sur iOS pour éviter le doublon.
La procédure est au point 7 de « Adding a new tool » dans `CLAUDE.md`.

Le hub lui-même n'en porte pas : c'est la racine, il n'y a rien au-dessus.

## 5. Comment le vérifier

Le défaut ne se lit pas dans le code. Il se constate en manipulant, sur un
téléphone, et il se compte.

1. **Compter les appuis.** Descendre jusqu'à l'écran le plus profond par le
   chemin ordinaire, puis appuyer sur retour jusqu'à sortir. Le nombre d'appuis
   doit égaler la profondeur, pas le nombre d'écrans visités.
2. **Faire des pas de côté.** Ouvrir et refermer trois fois une modale. Le
   nombre d'appuis pour sortir ne doit pas avoir changé.
3. **Fermer une couche puis appuyer sur retour.** La couche ne doit pas revenir.
4. **Terminer un parcours puis appuyer sur retour.** L'assistant photo terminé
   ne doit pas se rouvrir.
5. **Comparer les deux retours.** Le bouton de l'interface et celui du système
   doivent aboutir au même écran depuis le même point.
6. **Arriver directement en profondeur** par un lien partagé vers un outil, puis
   appuyer sur retour. On doit revenir au hub ou sortir proprement, jamais
   rester coincé.

`tests/navigation-retour.test.mjs` (lancé aussi en intégration continue) ne
vérifie que la **structure** : copies non divergentes, fermetures routées par la
pile, bouton retour iOS présent sur chaque outil. Il existe pour que le défaut
ne revienne pas par le prochain outil ajouté — il ne remplace pas les six
vérifications ci-dessus.

## 6. En ajoutant un outil

Si l'outil ouvre une couche — modale, popup, feuille, assistant — recopier le
bloc `Couches` **tel quel** depuis `index.html`, puis :

- à l'ouverture : `Couches.ouvrir('<nom>', <fonction qui ferme réellement>)` ;
- à la fermeture demandée par l'interface : `Couches.fermer()` — jamais la
  fonction de fermeture directement, sinon les deux retours divergent ;
- pour un assistant : une étape franchie appelle `Couches.ouvrir` de plus, le
  bouton « Précédent » appelle `Couches.fermer()`, et quitter l'assistant
  appelle `Couches.fermerJusqua('<nom de la couche racine>')`.

Si l'outil n'ouvre aucune couche, il n'y a rien à faire : les liens réels
suffisent.
