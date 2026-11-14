import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync(join(process.cwd(), 'outils/cloture-caisse/index.html'), 'utf8');
const start = html.indexOf('/* UXER 03 : répertoire professionnel, outils caisse. */');
const end = html.indexOf('@media screen and (max-width:1120px)', start);
assert.ok(start !== -1 && end > start, 'Feuille de style écran introuvable');
const screen = html.slice(start, end);

test('typographie de caisse utilisable à 100 % sans zoom forcé', () => {
  assert.match(screen, /body\{[^}]*font-size:16px;line-height:1\.5/);
  assert.match(screen, /--fs-base:16px;--fs-sm:16px/);
  assert.match(screen, /--fs-label:15px;--fs-hint:15px;--fs-micro:14px/);
  const sizes = [...screen.matchAll(/font-size:(\d+)px/g)].map(match => Number(match[1]));
  assert.ok(sizes.length >= 20, 'Échelle typographique attendue');
  assert.ok(sizes.every(size => size >= 14), 'Un texte visible est inférieur à 14 px');
  assert.doesNotMatch(screen, /\bzoom\s*:/, 'Le navigateur doit garder son zoom natif');
});

test('champs, navigation et actions suffisamment grands', () => {
  assert.match(screen, /\.qty-input,\.amt-input,\.fond-input,\.ref-input\{\s*min-height:48px/);
  assert.match(screen, /\.cash-nav a\{[^}]*min-height:48px/);
  assert.match(screen, /\.btn-reset\{[^}]*min-height:48px/);
  assert.match(screen, /\.btn-del\{min-height:44px/);
  assert.match(screen, /\.qty-input\{width:82px\}/);
  assert.match(html, /@media screen and \(max-width:640px\)/);
  assert.match(html, /\.ecart-field label\{flex:1 1 100%\}/);
});

test('tableaux lisibles au clavier et contenus dans leurs panneaux', () => {
  for (const label of ['Comptage des pièces', 'Comptage des billets', 'Comptage des paiements électroniques']) {
    assert.ok(html.includes('<caption class="sr-only">' + label + '</caption>'), 'Légende manquante : ' + label);
    assert.ok(html.includes('aria-label="' + label + ', défilement horizontal" tabindex="0"'));
  }
  assert.equal((html.match(/class="count-table-scroll"/g) || []).length, 3);
  assert.match(screen, /\.count-table-scroll\{max-width:100%;overflow-x:auto/);
  assert.match(html, /class="history-body" role="region"[^>]*tabindex="0"/);
  assert.match(html, /<caption class="sr-only">Historique des clôtures de caisse<\/caption>/);
  assert.match(screen, /\.history-body\{overflow-x:auto;contain:paint\}/);
});

test('six sections et identifiants utilisés par le calcul conservés', () => {
  for (const id of ['pieces', 'billets', 'paiements', 'especes', 'ecart', 'historique']) {
    assert.equal((html.match(new RegExp('href="#' + id + '"', 'g')) || []).length, 1);
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  for (const id of [
    'coins-tbody', 'bills-tbody', 'elec-tbody', 'total-coins', 'total-bills',
    'total-elec', 'total-especes', 'ecart-value', 'history-tbody', 'btn-save',
    'btn-reset', 'reserve-monnaie', 'fond-cible', 'ref'
  ]) {
    assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
  }
  for (const key of ['cloture-caisse-v1', 'cloture-fond-v1', 'cloture-fond-cible-v1']) {
    assert.ok(html.includes(key), 'Stockage modifié : ' + key);
  }
  assert.ok(html.includes('<link rel="stylesheet" href="../../assets/css/theme-bleu-gris.css">'));
});
