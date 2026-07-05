import { WebSocketServer, WebSocket } from 'ws';
import { Grid } from './world/Grid.js';
import { RuleEngine } from './world/rules/RuleEngine.js';
import { plantRule } from './world/rules/plantRule.js';
import { nutrientRule } from './world/rules/nutrientRule.js';
import { waterRule } from './world/rules/waterRule.js';
import { RateLimiter } from './input/RateLimiter.js';
import { CellType, Cell } from './types.js';
import { generateLineageName } from './world/lineage.js';
import { computeClusters } from './world/clusterAnalysis.js';
import fs from 'fs';

// --- Extension du type WebSocket pour ajouter playerName ---
declare module 'ws' {
  interface WebSocket {
    playerName?: string;
  }
}

const WIDTH = 80;
const HEIGHT = 50;
const TICK_MS = 2000;
// Lit la valeur définie dans docker-compose.prod.yml (300000 = 5 min) ;
// 10s par défaut si la variable n'est pas définie (dev).
const COOLDOWN_MS = Number(process.env.COOLDOWN_MS ?? 10_000);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? null;
// docker-compose.prod.yml définit déjà TRUST_PROXY=true : on ne faisait
// jusqu'ici jamais la lecture de cette variable, donc X-Forwarded-For était
// accepté inconditionnellement — un client direct sur le port 8080 pouvait
// usurper n'importe quelle IP et donc contourner le cooldown.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

const grid = new Grid(WIDTH, HEIGHT);

// --- Enregistrement des règles ---
const engine = new RuleEngine();
engine.register(CellType.Plant, plantRule);
engine.register(CellType.Nutrient, nutrientRule);
engine.register(CellType.Water, waterRule);

// Cooldown des joueurs sur l'action "place" (plante, eau, nutriment, panneau...).
// Indexé par IP réelle, pas par connexion : se reconnecter ne doit pas
// permettre de recommencer à zéro.
const rateLimiter = new RateLimiter(COOLDOWN_MS);

const wss = new WebSocketServer({
  port: 8080,
  maxPayload: 1024,
});

// --- Snapshot ponctuel ---
function snapshot() {
  const dump = {
    time: Date.now(),
    width: grid.width,
    height: grid.height,
    cells: grid.cells,
  };

  fs.writeFileSync(`snapshot-${Date.now()}.json`, JSON.stringify(dump, null, 2));
}

// --- Diffusion aux clients ---
function broadcast(message: unknown): void {
  const data = JSON.stringify(message);
  for (const client of clients.keys()) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}

const clients = new Map<WebSocket, string>(); // socket -> playerId (IP)

function getRealIp(req: import('http').IncomingMessage): string {
  if (TRUST_PROXY) {
    const xfwd = req.headers['x-forwarded-for'];
    if (typeof xfwd === 'string' && xfwd.length > 0) {
      return xfwd.split(',')[0].trim();
    }
  }
  return req.socket.remoteAddress ?? 'unknown';
}

// Retire les caractères de contrôle et limite la longueur. Ne protège pas
// contre le HTML/JS à lui seul — c'est l'échappement côté client (renderer
// du tooltip) qui empêche l'injection ; ceci empêche surtout le spam et les
// caractères invisibles.
function nettoyerTexte(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

// --- Connexion client ---
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGIN && origin !== ALLOWED_ORIGIN) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  const playerId = getRealIp(req);
  clients.set(ws, playerId);

  ws.playerName = 'inconnu';

  ws.send(JSON.stringify({ type: 'init', width: WIDTH, height: HEIGHT, cells: grid.cells }));

  ws.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // --- Nom du joueur --- (nettoyé : un pseudo s'affiche partout via innerHTML côté client)
    if (msg.type === 'hello') {
      const nom = nettoyerTexte(msg.name, 24);
      ws.playerName = nom || 'inconnu';
      return;
    }

    // --- Snapshot demandé par le client ---
    if (msg.type === 'snapshot') {
      snapshot();
      ws.send(JSON.stringify({ type: 'info', message: 'Snapshot enregistré.' }));
      return;
    }

    // --- Clusters génétiques ---
    if (msg.type === 'clusters') {
      const plants = grid.cells.filter((c) => c.type === CellType.Plant);
      const clusters = computeClusters(plants);

      ws.send(
        JSON.stringify({
          type: 'clusters',
          clusters: clusters.map((c) => ({
            id: c.id,
            name: c.name,
            size: c.members.length,
          })),
        })
      );
      return;
    }

    // --- Placement d'une cellule ---
    if (msg.type === 'place') {
      if (!rateLimiter.tryConsume(playerId)) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Patiente encore un peu avant ta prochaine action.',
          })
        );
        return;
      }

      const { x, y, cellType } = msg;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      if (!grid.inBounds(x, y)) return;

      if (typeof cellType !== 'number' || !(cellType in CellType)) {
        return;
      }

      const ct = cellType as CellType;
      let cell: Cell;

      if (ct === CellType.Plant) {
        cell = {
          type: CellType.Plant,
          energy: 0,
          age: 0,
          genes: {
            croissance: 3,
            propagation: 0.2,
            resistance: 2,
            distance: 1,
            hydratation: 1,
            densite: 0,
            graines: 1,
          },
          createdBy: ws.playerName ?? playerId,
          lineage: ws.playerName ?? generateLineageName(),
        };
      } else if (ct === CellType.Sign) {
        // Panneau : case neutre (comme Terre/Pierre), juste porteuse d'un message.
        cell = {
          type: CellType.Sign,
          message: nettoyerTexte(msg.message, 80),
          createdBy: ws.playerName ?? playerId,
        };
      } else {
        cell = { type: ct };
      }

      grid.set(x, y, cell);
      broadcast({ type: 'diff', changes: [{ x, y, cell }] });
    }
  });

  ws.on('close', () => clients.delete(ws));
});

// --- Tick du monde ---
setInterval(() => {
  const changes = engine.tick(grid);
  if (changes.length > 0) broadcast({ type: 'diff', changes });
}, TICK_MS);

console.log(`Serveur démarré sur ws://localhost:8080 (grille ${WIDTH}x${HEIGHT}, tick ${TICK_MS}ms)`);

