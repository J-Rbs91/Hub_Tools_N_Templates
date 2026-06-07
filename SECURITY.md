# Politique de sécurité

## Versions prises en charge

Ce projet est un site **statique** déployé en continu : seule la version
actuellement en ligne, correspondant à la branche `main`, est prise en charge.
Les correctifs de sécurité sont appliqués sur `main` puis déployés
automatiquement via GitHub Pages.

| Version            | Prise en charge |
| ------------------ | --------------- |
| `main` (en ligne)  | ✅              |
| Anciens états/forks | ❌              |

## Modèle de sécurité et de confidentialité

Par conception, la surface d'attaque est volontairement réduite :

- **aucune donnée saisie ne quitte le navigateur** (pas de backend, pas de base
  de données, pas de serveur applicatif) ;
- aucun tracker, aucun cookie, aucun analytics ;
- les exports (PDF, copie presse-papiers) sont générés entièrement côté client ;
- la seule ressource externe chargée est la police Manrope via Google Fonts ;
- la synchronisation Drive optionnelle ne transite **que** le profil magasin
  (jamais de donnée patient), via un script Apps Script déployé par le magasin
  lui-même.

Merci de tenir compte de ce modèle lors d'un signalement : tout ce qui
romprait l'isolement local des données (exfiltration, appel réseau inattendu
avec des données utilisateur, injection de script) est considéré comme une
vulnérabilité prioritaire.

## Signaler une vulnérabilité

**Ne créez pas d'issue publique pour une faille de sécurité.**

Utilisez de préférence le signalement privé de GitHub :

1. Ouvrez l'onglet **Security** du dépôt.
2. Cliquez sur **« Report a vulnerability »** (*Privately report a security
   vulnerability*).
3. Décrivez le problème, les étapes de reproduction et l'impact potentiel.

Si cette option n'est pas disponible, contactez en privé le mainteneur du dépôt
sur GitHub.

Merci d'inclure, dans la mesure du possible :

- une description claire de la vulnérabilité et de son impact ;
- les étapes de reproduction (avec des données **fictives** uniquement) ;
- la ou les pages/outils concernés et le navigateur utilisé.

## Délais de réponse

Ce projet est maintenu à titre interne et bénévole. Nous nous efforçons
d'accuser réception d'un signalement sous **quelques jours ouvrés** et de
traiter les vulnérabilités confirmées dès que possible. Merci de votre
compréhension et de votre divulgation responsable : laissez-nous un délai
raisonnable pour corriger avant toute publication.

## Outils de sécurité automatisés

Le dépôt exécute, à chaque push sur `main` et à chaque pull request
(workflow `.github/workflows/security.yml`) :

- **CodeQL** — analyse statique du JavaScript embarqué dans les pages ;
- **gitleaks** — détection de secrets accidentellement commités.
