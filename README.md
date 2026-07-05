DEMARRER AVEC : docker compose -f docker-compose.prod.yml up --build -d
RESTART AVEC : docker compose -f docker-compose.prod.yml down

# Écosystème collaboratif — prototype de moteur

Squelette minimal du "moteur d'écosystème local" décrit dans le document de design :
une grille partagée, un moteur de règles locales (une seule règle pour l'instant : les
plantes), une synchronisation temps réel via WebSocket, et un client canvas tout simple.

## Option A — Avec Docker Desktop (Windows)

Cette option évite d'installer Node.js directement sur Windows : tout tourne dans
des conteneurs. C'est aussi la base la plus simple pour ajouter plus tard une
base de données (Postgres, Redis) au même `docker-compose.yml`.

### 1\. Installer WSL2 (le moteur derrière Docker Desktop sur Windows)

Ouvrir **PowerShell en administrateur** et lancer :

```powershell
wsl --install
```

Ça installe WSL2 et une distribution Ubuntu par défaut. Redémarrer si demandé,
puis lancer Ubuntu une fois depuis le menu Démarrer pour terminer sa configuration
(ça demande un nom d'utilisateur et un mot de passe Linux, indépendants de Windows).

### 2\. Installer Docker Desktop

Télécharger et installer Docker Desktop depuis https://www.docker.com/products/docker-desktop/.
Pendant l'installation, garder l'option **"Use WSL 2 instead of Hyper-V"** cochée
(c'est le comportement par défaut depuis plusieurs versions).

Une fois Docker Desktop lancé, vérifier dans **Settings → Resources → WSL Integration**
que l'intégration est activée pour la distribution Ubuntu installée à l'étape 1.

### 3\. Vérifier l'installation

Ouvrir un terminal **Ubuntu (WSL)**, pas PowerShell, et lancer :

```bash
docker --version
docker compose version
```

Les deux commandes doivent répondre avec un numéro de version.

### 4\. Placer le projet dans le système de fichiers de WSL2 (important)

C'est l'étape qui évite 90% des problèmes de lenteur et de hot-reload qui ne se
déclenche pas. Si le projet reste sous `C:\\Users\\...` (donc sous `/mnt/c/...`
vu depuis WSL), chaque accès fichier traverse la frontière Windows ↔ Linux, ce
qui est lent et casse parfois la détection de changement de fichier.

Toujours dans le terminal Ubuntu :

```bash
cd \~
mkdir -p projets \&\& cd projets
# copier ou dézipper ecosysteme-collaboratif.zip ici, par exemple :
unzip /mnt/c/Users/<TonNomWindows>/Downloads/ecosysteme-collaboratif.zip
cd ecosysteme-collaboratif
```

### 5\. Construire et lancer les conteneurs

```bash
docker compose up --build
```

La première fois, ça télécharge l'image `node:20-alpine` et installe les
dépendances dans chaque conteneur — ça prend une minute ou deux. Les fois
suivantes, `docker compose up` (sans `--build`) suffit, sauf si `package.json`
a changé.

Le terminal doit afficher quelque chose comme :

```
server-1  | Serveur démarré sur ws://localhost:8080 (grille 80x50, tick 500ms)
client-1  |   VITE ready
client-1  |   ➜  Local:   http://localhost:5173/
```

### 6\. Ouvrir le navigateur

Sur Windows, ouvrir `http://localhost:5173` normalement — Docker Desktop relaie
automatiquement les ports exposés par les conteneurs vers `localhost` côté Windows,
qu'on soit dans WSL ou pas.

### 7\. Modifier le code

Modifier les fichiers dans `\~/projets/ecosysteme-collaboratif` (avec VS Code +
son extension "WSL", ou n'importe quel éditeur capable d'ouvrir un dossier WSL) :
les deux conteneurs surveillent les fichiers montés et redémarrent ou rechargent
automatiquement.

### Pour arrêter

```bash
docker compose down
```

`docker compose down -v` en plus si on veut aussi supprimer les volumes
`node\_modules` (utile si on a un comportement bizarre après avoir changé une dépendance).

\---

## Option B — Sans Docker (Node.js installé directement)

### 1\. Installer son environnement de développement

Il faut **Node.js 20 ou plus récent**. Pour vérifier :

```bash
node -v
```

Si Node.js n'est pas installé, télécharger la version LTS sur https://nodejs.org,
ou utiliser un gestionnaire de versions comme [nvm](https://github.com/nvm-sh/nvm) :

```bash
nvm install 20
nvm use 20
```

### 2\. Installer les dépendances du projet

À la racine du projet (ce dossier) :

```bash
npm install
```

Comme `server` et `client` sont déclarés comme des "workspaces" npm dans le
`package.json` racine, cette seule commande installe les dépendances des deux côtés.

### 3\. Lancer le projet en développement

```bash
npm run dev
```

Ça démarre en parallèle :

* le serveur WebSocket sur `ws://localhost:8080` (la simulation, qui tourne en continu)
* le serveur de dev Vite, généralement sur `http://localhost:5173` (affiché dans le terminal)

Ouvrir l'URL affichée par Vite dans le navigateur. Ouvrir plusieurs onglets simule
plusieurs joueurs en même temps.

Si vous préférez deux terminaux séparés plutôt qu'un seul `npm run dev` combiné :

```bash
# terminal 1
npm run dev -w server

# terminal 2
npm run dev -w client
```

## Comment ça marche

```
server/src/
  types.ts              → CellType, Cell, PlantGenes
  world/Grid.ts          → la grille (tableau plat) + accès voisinage
  world/rules/
    RuleEngine.ts        → le registre type de case → fonction de règle
    plantRule.ts         → l'unique règle pour l'instant : la plante
  input/RateLimiter.ts   → 1 action par joueur toutes les COOLDOWN\_MS
  index.ts               → démarre le serveur WS + la boucle de tick

client/src/
  types.ts               → copie légère des types (voir note dans le fichier)
  renderer.ts             → dessine la grille sur le canvas
  main.ts                 → connexion WebSocket + gestion des clics
```

À chaque tick (toutes les `TICK\_MS`, voir `index.ts`), le serveur :

1. parcourt la grille,
2. pour chaque case, appelle la règle enregistrée pour son type,
3. applique les changements renvoyés,
4. diffuse uniquement les cases modifiées à tous les clients connectés.

## Ajouter un nouveau phénomène (ex. le feu)

C'est le test de la bonne architecture : ça doit se faire sans toucher au reste.

1. Ajouter une valeur à l'enum `CellType` dans `server/src/types.ts` (ex. `Fire = 5`).
2. Créer `server/src/world/rules/fireRule.ts`, sur le modèle de `plantRule.ts` :
il reçoit `(grid, x, y, cell)` et renvoie la liste des cases à changer.
3. Dans `index.ts`, ajouter `engine.register(CellType.Fire, fireRule)`.
4. Côté client, ajouter une couleur dans `COLORS` (`renderer.ts`) et une option
dans le `<select>` (`index.html`).

Aucune autre modification nécessaire — c'est tout l'intérêt du registre de règles.

## Pistes pour la suite

* **Agents mobiles** (fourmis, gouttes de rivière) : ils ne sont pas des propriétés
de case, donc ils ont besoin d'une structure à part (une liste d'agents avec
position + comportement, simulée dans le même tick que la grille).
* **Persistance** : pour l'instant tout est en mémoire et se perd au redémarrage.
Ajouter un snapshot périodique (JSON ou SQLite) dans `index.ts`.
* **Mise à l'échelle** : si la grille grossit beaucoup, découper en chunks et ne
simuler/diffuser que les chunks contenant de l'activité récente.
* **Limiteur de débit réel** : remplacer `COOLDOWN\_MS = 5\_000` par la vraie valeur
du document (`5 \* 60 \* 1000` pour 5 minutes), et persister `RateLimiter` par
identifiant de compte plutôt que par adresse IP de socket.



A implémenter :

* creuser la simulation des plantes en mettant en place une condition de surpopulation
* mettre en place un moyen visuel de différencier les mutations (nuances de vert par exemple)



