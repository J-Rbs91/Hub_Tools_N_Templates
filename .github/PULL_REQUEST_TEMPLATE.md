<!-- Merci pour votre contribution ! Remplissez les sections ci-dessous. -->

## Description

<!-- Décrivez clairement ce que fait cette PR et pourquoi. -->

## Type de changement

- [ ] 🐛 Correction de bug
- [ ] ✨ Nouvel outil
- [ ] 🔧 Amélioration d'un outil existant
- [ ] 📝 Documentation
- [ ] ♻️ Refactorisation / maintenance (CI, hygiène…)

## Outils / pages concernés

<!-- Ex. : outils/cloture-caisse, index.html (hub)… -->

## Captures d'écran

<!-- Si l'interface change, ajoutez des captures (avec des données FICTIVES). -->

## Checklist

- [ ] J'ai lu le [guide de contribution](../CONTRIBUTING.md).
- [ ] **Confidentialité préservée** : aucune donnée utilisateur ne quitte le
      navigateur (pas de nouvel appel réseau, tracker, cookie ni analytics).
- [ ] Aucune information de magasin (nom, adresse, téléphone, e-mail, fond de
      caisse) n'est codée en dur ; le profil `localStorage` est lu correctement.
- [ ] Les outils restent **autonomes** (HTML + CSS + JS *inline*, sans
      bibliothèque tierce ni import partagé).
- [ ] Tous les liens et chemins sont **relatifs** ; le lien `← Retour` vers
      `../../` est présent (avec le bouton flottant iOS le cas échéant).
- [ ] Interface **responsive** (testée sur mobile / largeur ≤ 640 px).
- [ ] Textes destinés aux utilisateurs **en français**.
- [ ] `npx --yes html-validate "**/*.html"` ne signale aucune erreur.
- [ ] Hygiène des fichiers OK : pas d'espaces en fin de ligne (hors `.md`),
      fins de ligne LF, newline finale présente.
