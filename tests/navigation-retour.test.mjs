/* Garde-fous du contrat de navigation arrière — voir docs/navigation-retour.md.
 *
 * Exécution (aucune dépendance, aucun package manager) :
 *     node tests/navigation-retour.test.mjs
 *
 * Ce que ces contrôles prouvent : que la structure qui porte le comportement
 * est en place et n'a pas divergé d'un fichier à l'autre. Ce qu'ils ne prouvent
 * pas : le comportement lui-même. Un geste retour ne se lit pas dans du code —
 * il se constate sur un téléphone, et la procédure en six vérifications est
 * dans docs/navigation-retour.md. Ces contrôles existent pour que le défaut ne
 * revienne pas par le prochain outil ajouté, pas pour remplacer cette manip.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const echecs = [];
let passes = 0;

function verifier(nom, condition, detail) {
  if (condition) {
    passes += 1;
    return;
  }
  echecs.push(nom + (detail ? ' → ' + detail : ''));
}

const lire = (chemin) => readFileSync(join(racine, chemin), 'utf8');

const outils = readdirSync(join(racine, 'outils'), { withFileTypes: true })
  .filter((entree) => entree.isDirectory())
  .map((entree) => 'outils/' + entree.name + '/index.html');

/* ── 1. Les copies du gestionnaire de couches ne divergent pas ───────────────
   Les outils sont autonomes par construction : le bloc est recopié plutôt
   qu'importé. Deux copies qui divergent, c'est deux comportements du bouton
   retour dans la même application — le défaut exact que le contrat interdit. */
const DEBUT = 'var Couches = (function () {';

/* Comparaison sur les lignes dégraissées : l'indentation diffère légitimement
   d'un fichier à l'autre, le code non. */
function extraireCouches(fichier) {
  const lignes = lire(fichier).split('\n').map((ligne) => ligne.trim());
  const debut = lignes.indexOf(DEBUT);
  if (debut < 0) {
    return null;
  }
  const fin = lignes.indexOf('})();', debut);
  if (fin < 0) {
    return null;
  }
  return lignes.slice(debut, fin + 1).join('\n');
}

const porteursDeCouches = ['index.html', ...outils].filter((fichier) =>
  lire(fichier).includes(DEBUT),
);

verifier(
  'au moins deux fichiers portent le gestionnaire de couches',
  porteursDeCouches.length >= 2,
  porteursDeCouches.join(', ') || 'aucun',
);

const reference = extraireCouches(porteursDeCouches[0]);
verifier('le gestionnaire de référence est extractible', Boolean(reference), porteursDeCouches[0]);

for (const fichier of porteursDeCouches.slice(1)) {
  verifier(
    'copie identique du gestionnaire de couches — ' + fichier,
    extraireCouches(fichier) === reference,
    'diverge de ' + porteursDeCouches[0],
  );
}

/* ── 2. Une couche déclarée passe par la pile ────────────────────────────────
   Un fichier qui possède une modale mais pas de gestionnaire de couches est le
   cas qu'on cherche à attraper : c'est celui où le geste retour quitte la page
   au lieu de refermer la couche. */
for (const fichier of ['index.html', ...outils]) {
  const source = lire(fichier);
  const aUneCouche =
    /role="(dialog|alertdialog)"/.test(source) || /class="modal-overlay"/.test(source);
  if (!aUneCouche) {
    continue;
  }
  verifier(
    'couche présente donc gestionnaire présent — ' + fichier,
    source.includes(DEBUT),
    'une modale sans pile de couches : le retour quittera la page',
  );
  verifier(
    'la fermeture passe par la pile — ' + fichier,
    /Couches\.(fermer|fermerJusqua)\(/.test(source),
    'aucune fermeture routée par Couches',
  );
}

/* ── 3. Bouton retour visible pour iOS ──────────────────────────────────────
   iPhone et iPad n'ont pas de bouton retour matériel, et en mode « ajouté à
   l'écran d'accueil » il n'y a pas non plus de barre de navigateur : sans ce
   bouton flottant, l'outil est sans issue. */
for (const fichier of outils) {
  const source = lire(fichier);
  verifier('bouton retour flottant iOS — ' + fichier, source.includes('ios-back'), 'classe .ios-back absente');
  verifier(
    'détection iOS — ' + fichier,
    source.includes('is-ios') && /iPad\|iPhone\|iPod/.test(source),
    'la classe body.is-ios n\'est jamais posée',
  );
  verifier(
    'lien de retour vers le hub — ' + fichier,
    /href="\.\.\/\.\.\/"/.test(source),
    'aucun lien ← Retour vers ../../',
  );
}

console.log(`${passes} contrôle(s) passé(s)`);
if (echecs.length) {
  console.error('\n' + echecs.length + ' échec(s) :');
  for (const echec of echecs) {
    console.error('  · ' + echec);
  }
  process.exit(1);
}
