# UXER : refonte de la saisie Demande / Ordonnance

Date : 29 octobre 2026
Branche : `uxer/ordonnance-repertoire-20261029`
Base : `uxer/repertoire-professionnel-20261029` (PR #96)
Direction : 03, Répertoire professionnel

## 1. Périmètre et priorité
Refonte désormais autorisée de l'outil Demande / Ordonnance, précédemment exclu de la première passe.
Objectif : cohérence visuelle avec le hub, lisibilité, navigation immédiate, microcopy sobre.
Conserver le métier : six types de demande, données patient, prescription initiale, modifications, commentaire, suite à donner.
Conserver le contenu généré pour Gmail et le modèle imprimable A4.

## 2. Audit initial
- Une seule page HTML/CSS/JS autonome.
- Saisie présentée comme tableau de courrier destiné à l'impression, sans accès direct aux sections.
- Choix de l'objet et de la suite : petites cibles checkbox, libellés non associés sémantiquement.
- OD/OG : champs correctement nommés pour la technologie d'assistance, mais fonctions Sphère/Cylindre/Axe/Add non visibles comme intitulés de colonnes.
- Fonds animés, en-tête bleu et contraste visuel hétérogène avec le nouveau hub.
- Barre d'action fixe avec impression, copie HTML et réinitialisation.
- Copie Gmail basée sur `buildEmailHTML()` et `plainFallback()`, indépendantes du DOM visuel à l'exception des `data-k`.
- Génération PDF : impression native de la page et `@media print`, sans bibliothèque tierce.

## 3. Choix UX/UI
- Bandeau sobre, titrage éditorial, fond papier, accent vert grisé et filets fins.
- Navigation horizontale par ancres : Destinataire, Objet, Patient, Prescription, Modifications, Commentaire, Suite.
- Table existante conservée au DOM, mais présentée comme sections de formulaire en `@media screen`.
- Cases objet et suite transformées en vraies étiquettes cliquables.
- Intitulés visuels des quatre paramètres de correction sur chaque ligne OD/OG.
- Actions courtes : Effacer, Imprimer / PDF, Copier pour Gmail.
- Aide Gmail repliée. Mention de fréquentation discrète, non répétée.
- Écran responsive avec empilement des libellés et champs ; barre d'action maintenue.

## 4. Invariants et contrôles réalisés
- 54 clés `data-k` HTML présentes dans le même ordre sur la base et sur la branche.
- JavaScript métier d'origine strictement identique ; fonctions de génération, presse-papiers et gestion des couches Android non modifiées.
- Script autonome ajouté pour naviguer entre les sections sans empiler d'entrées dans l'historique Android.
- Tous les `id` HTML de la base préservés ; aucun doublon sur la branche.
- Sept destinations de navigation : destinataire et six sections du formulaire.
- Neuf groupes de cases convertis en `label` ; 16 désignations de paramètres sur quatre lignes OD/OG.
- Contrôle de l'omission dans l'aperçu initial : 8 champs d'acuité conservés dans le DOM. Leurs 6 champs VL (OD, OG, ODG) et 2 champs VP (Parinaud, à 40 cm) disposent désormais de libellés explicites à l'écran ; rien n'est ajouté à l'impression A4.
- Styles existants intacts ; nouvelles règles ajoutées avec distinction `@media screen` et `@media print`.
- Nouvelle disposition écran cachée lors de l'impression.
- Contraste couleur théorique : texte principal #252a27 sur #f5f3ed 13,15:1 ; texte secondaire #59685e sur #f5f3ed 5,31:1 ; accent #425d4f sur fond 6,50:1.

## 5. Recette encore requise
Statut : VISUAL_UNVERIFIED.

Un navigateur réel n'a pas été exécuté sur la branche (absence de runtime réseau local pour la récupération GitHub).
Avant fusion, vérifier :
1. Desktop large et mobile à 320/375 px : aucun dépassement, barre d'action et navigation utilisables.
2. Zoom navigateur à 200 %, lecture clavier et lecteur d'écran ; touche Entrée et gestion des cases.
3. Parcours complet pour chacun des six objets, saisie de tous les champs, valeurs négatives, avertissement pas de 0,25.
4. Introduction régénérée et manuellement modifiée sans écrasement.
5. Copie HTML et texte Gmail ; contrôle du contenu médical et des règles de masquage des champs vides.
6. Impression A4 et aperçu PDF, y compris sections multiples, sauts de page et commentaires longs.
7. Fenêtre de champs incomplets, bouton retour Android et retour iOS.
8. Réinitialisation et profil magasin présent ou absent.
9. GitHub CI : validation HTML, tests de navigation et vérification des liens.

## 6. Hors périmètre
- Calculateur d'épaisseur, prévu en phase distincte.
- Modification des modèles de courrier médical, règles légales et décisions cliniques.
- Changement de stockage, serveur, analytics ou ajout de bibliothèque.

## 7. Critères d'acceptation
Aucune régression métier ni en sortie imprimée/copiée, contrôle clavier et tactile sans blocage, aucun débordement mobile, rendu sobre et cohérent avec le hub. Validation navigateur avant fusion.
