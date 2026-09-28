# Sécurité

## Signaler une vulnérabilité

Par un [avis de sécurité privé](https://github.com/michael-mas/Order-Hub/security/advisories/new)
sur GitHub, pas par une issue publique. Réponse sous sept jours.

## Modèle de menace

Order Hub est un POC public : aucune donnée réelle, aucun compte, aucun
paiement. Ce qu'il protège, c'est la **démo en ligne** (disponibilité, coût)
et la **crédibilité de ses garanties**.

| Surface                          | Qui y accède                   | Protection                                                                                                                                                 |
| -------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages de la console              | tout visiteur                  | CSP stricte à nonce par requête, pas de `unsafe-inline` ; cadres interdits ; `nosniff`, `no-referrer`, HSTS, COOP/CORP ; aucun secret côté navigateur     |
| Proxy de la console (`/api/...`) | tout visiteur                  | liste blanche de routes ; écritures d'un autre site refusées (`Sec-Fetch-Site`, `Origin`) ; corps ≤ 16 Kio ; limites de fréquence globales par action     |
| API du hub (`/api/...`)          | la console, côté serveur       | jeton de service (`HUB_API_TOKEN`) comparé en temps constant, refus si absent ; écoute sur 127.0.0.1 dans la démo                                          |
| Webhooks du hub                  | la marketplace                 | HMAC-SHA256 sur le corps brut, horodatage signé (± 5 min), déduplication par `event_id`                                                                    |
| Plan de contrôle du simulateur   | la console, les tests          | jeton (`CONTROL_TOKEN`) comparé en temps constant ; 127.0.0.1 dans la démo ; vérité terrain et remise à zéro jamais relayées                              |
| Analyste IA                      | tout visiteur, via la console  | un appel toutes les 15 s au plus, budget quotidien d'appels au modèle (`MODEL_DAILY_ANALYSES`) ; preuves filtrées ; actions en liste fermée, jamais exécutées sans clic |
| Ressources de la démo            | tout visiteur                  | plafond de commandes par marketplace ; remise à zéro à ce plafond et au moins toutes les 24 h ; 512 Mio / 0,1 CPU vérifiés en CI                            |

Secrets : aucun en clair dans le dépôt hors valeurs de développement local
(`.env.dev`, `compose.yaml`) ; l'image de démo tire des secrets aléatoires à
chaque démarrage. Les images tournent sans privilèges (utilisateur numérique).

## Limites assumées

- **La démo est partagée** : chaque visiteur agit sur les mêmes marketplaces
  simulées. C'est voulu ; les limites de fréquence bornent le travail que
  chacun peut provoquer, pas qui l'obtient.
- **Pas de protection volumétrique** (DDoS) dans l'application : elle relève
  de la plateforme d'hébergement.
- **Pas d'utilisateurs ni de rôles** : hors périmètre du POC (voir
  [`docs/PLAN.md`](docs/PLAN.md)).

## Chaîne d'approvisionnement

À chaque commit, la CI vérifie :

- `npm audit` et `composer audit`, y compris les paquets abandonnés ;
- les Dockerfiles (Hadolint) et les scripts (ShellCheck) ;
- l'image de démo avec Trivy : les failles corrigeables HIGH et CRITICAL sont
  listées, et une CRITICAL fait échouer le build sauf si elle est acceptée
  dans [`.trivyignore.yaml`](.trivyignore.yaml), avec sa justification et sa
  date d'expiration ;
- CodeQL analyse le TypeScript et les workflows.

Les actions GitHub sont épinglées par SHA, les images de base par digest, et
Dependabot propose chaque semaine leurs mises à jour. Les jobs n'ont que le
droit de lecture, sauf la publication de l'image.
