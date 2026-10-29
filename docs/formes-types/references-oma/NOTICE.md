# Données OMA d'exemple : provenance et portée

Ces sept fichiers servent de **références de test et de comparaison**, pas de gabarits
validés à monter sur des verres de client. Ils sont dérivés des exemples publics
du dépôt [eeng/lens_protocol](https://github.com/eeng/lens_protocol),
répertoire `examples/oma/`. Licence consultée le 27 octobre 2026 :
`LICENSE.txt` du dépôt, libellée MIT, copyright (c) 2019 Emmanuel Nicolau.

Le contenu OMA d'origine a été expurgé des clés de prescription, d'identification
de travail, et des données de perçage/épaisseur non pertinentes. Les
enregistrements `TRCFMT` et `R` des deux yeux ont été conservés **sans
modifier les rayons numériques**. Les métadonnées de modèle et de boxing
ont été conservées lorsqu'elles étaient présentes.

Les fichiers portant `FMFR=SILHOUETTE` correspondent à des références
étiquetées dans les exemples de `lens_protocol`, non à une certification
officielle Silhouette. La licence du projet d'exemple n'établit pas, à elle
seule, la propriété intellectuelle des tracés industriels sous-jacents.
En conséquence, **ne pas diffuser ces tracés comme bibliothèque de formes
commercialement certifiées**, ni les utiliser pour remplacer des gabarits de
production sans vérification des droits et relevé physique concordant.

Fichiers :
- R1000_1.oma : référence `FMFR=SILHOUETTE; FRAM=1559`, 1 000 rayons/œil.
- R1000_2.oma : référence `FMFR=SILHOUETTE; FRAM=1575`, 1 000 rayons/œil.
- R1000_3.oma : référence `FMFR=SILHOUETTE; FRAM=7580`, 1 000 rayons/œil.
- R360_1.oma : 360 rayons/œil.
- R360_2.oma : 360 rayons/œil.
- R360_3.oma : 360 rayons/œil.
- STHKFMT.oma : 360 rayons/œil.

Ces sept fichiers servent désormais aussi de **contours numériques d'estimation dans le calculateur d'épaisseur**. Le laboratoire `../oma-comparateur.html` reste disponible ; la matrice de correspondance aux noms du hub et les limites sont documentées dans `../oma-integration-hf022.md`.

Le fichier d'exemple `GlassOn_Teardrop_53x35_72.oma`, obtenu depuis https://glasson.io/assets/rimless/glasson-rimless-shape-teardrop.oma, est **conservé comme référence documentaire mais n'est plus utilisé dans les calculs** : le Pilote historique a été restauré (HF-024). Il contient deux tracés de 1 000 rayons ; la licence de redistribution des données fabricant n'est pas explicitement établie.

## Mention de licence de la source

The MIT License (MIT)

Copyright (c) 2019 Emmanuel Nicolau

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
