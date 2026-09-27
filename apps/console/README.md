# Console

La salle de contrôle d'Order Hub, en Next.js 16 et React 19.

- Tout passe par un **proxy serveur** (`src/app/api/hub`, `src/app/api/simulator`)
  limité à une liste blanche de routes (`src/lib/routes.ts`) : les URL internes
  et les jetons ne vont jamais au navigateur, et la démo publique n'ouvre ni
  la remise à zéro du simulateur ni sa vérité terrain.
- Les analyses d'incident sont limitées à une toutes les 15 s par processus
  (`ANALYSIS_COOLDOWN_MS`).
- `src/app/api/consistency` compare la vérité terrain du simulateur à toutes
  les commandes du hub (`src/lib/consistency.ts`, pur et testé).

| Variable                  | Rôle                                  | Défaut                   |
| ------------------------- | ------------------------------------- | ------------------------ |
| `HUB_URL`                 | le hub                                | `http://127.0.0.1:8000`  |
| `SIMULATOR_URL`           | le simulateur                         | `http://127.0.0.1:8100`  |
| `SIMULATOR_CONTROL_TOKEN` | jeton du plan de contrôle, si défini  | aucun                    |
| `ANALYSIS_COOLDOWN_MS`    | délai minimal entre deux analyses     | `15000`                  |

```bash
npm run dev      # port 3000
npm run verify   # next typegen + tsc, ESLint, Vitest
npm run build    # sortie standalone (image Docker)
```
