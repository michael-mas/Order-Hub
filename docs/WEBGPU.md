# WebGPU — dossier de coût

> Demandé par le brief (§ 7.5) : présenter le coût du double chemin
> WebGL2 / WebGPU **avant** de l'adopter. Mesuré le 2026-09-25 sur
> `three@0.186.1`, fichiers de `node_modules/three/build`, `gzip -9`.

## Mesure

| Fichier | Rôle | Brut | gzip |
|---|---|---|---|
| `three.core.js` | noyau commun aux deux chemins | 1 458 kB | 286 kB |
| `three.module.js` | chemin WebGL | 663 kB | 131 kB |
| `three.webgpu.js` | chemin WebGPU + système de nodes | 2 285 kB | 444 kB |

Avant tree-shaking :

| Chemin servi | gzip | Écart |
|---|---|---|
| WebGL2 seul | ~417 kB | référence |
| WebGPU seul | ~730 kB | +75 % |
| **Double chemin** (les deux présents dans le graphe) | **~861 kB** | **+106 %** |

Le tree-shaking réduira les trois lignes ; l'écart relatif reste l'ordre de
grandeur à retenir. À remesurer sur le vrai chunk de scène (`size-limit`) si
la question se rouvre.

## Coûts non chiffrés, déjà constatés dans l'ancien dépôt

- Le système de nodes a exigé `keep_classnames` / `keep_fnames` sur **tout**
  le bundle (minification dégradée partout, pas seulement pour la 3D).
  ⟨À vérifier sur three r186 avant toute décision : cette contrainte existe-t-elle encore ?⟩
- Deux copies de Three dans le graphe (alias vers les sources).
- Chaque matériau écrit deux fois (GLSL et TSL), ou tout en TSL avec un rendu
  WebGL moins maîtrisé ; les portages incomplets ont fini éteints derrière
  `?webgpu` sans qu'aucun visiteur ne les reçoive.

## Ce que la scénographie prévue demande

Points, lignes et un plan procéduraux, animés au vertex shader : rien qui
exige le compute ou les storage buffers de WebGPU.

## Décision provisoire

**WebGL2 seul.** WebGPU n'est pas écarté pour toujours : il revient si une
scène en a réellement besoin, en opt-in, validé par capture comparative, et
après arbitrage de Michael sur ce coût. Jamais de chemin à moitié porté servi.
