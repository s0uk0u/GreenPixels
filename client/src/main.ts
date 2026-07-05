import '../style.css';
import { CellType, Cell } from './types';
import { Renderer } from './renderer';

const CELL_SIZE = 10;
let lineageMode = false;

// --- Génération d'un nom aléatoire persistant ---
function generateRandomName() {
  const adjectives = ["Gérard", "Gauchiste", "Bébé", "Renard", "Ongle", "Nombril", "Sauvage", "Petit", "Le vieux", "Jacky le"];
  const nouns = ["Furtif", "Sauvage", "Sombre", "Clair", "Moche", "Purulant", "Teubé", "Fatigué", "Serein", "Vagabond"];

  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];

  return `${a}-${n}`;
}

let playerName = localStorage.getItem("playerName");
if (!playerName) {
  playerName = generateRandomName();
  localStorage.setItem("playerName", playerName);
}

// --- Affichage dans la page ---
const nameBox = document.getElementById("player-name");
if (nameBox) {
  nameBox.textContent = `Joueur : ${playerName}`;
}

const lineageBtn = document.getElementById("toggle-lineage");
if (lineageBtn) {
  lineageBtn.addEventListener("click", () => {
    lineageMode = !lineageMode;
    renderer.redrawAll(width, height, cells);
  });
}

let territoryMode = false;

const territoryBtn = document.getElementById("toggle-territory");
if (territoryBtn) {
  territoryBtn.addEventListener("click", () => {
    territoryMode = !territoryMode;
    renderer.redrawAll(width, height, cells);
  });
}

const canvas = document.getElementById('world') as HTMLCanvasElement;
const renderer = new Renderer(canvas, CELL_SIZE, () => lineageMode, () => territoryMode);
const selector = document.getElementById('cell-type') as HTMLSelectElement;
const status = document.getElementById('status') as HTMLDivElement;
const info = document.getElementById('cell-info') as HTMLDivElement;
const signMessageInput = document.getElementById('sign-message') as HTMLInputElement;

function updateSignInputVisibility() {
  signMessageInput.style.display = Number(selector.value) === CellType.Sign ? 'inline-block' : 'none';
}
function getCanvasCoords(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();

  let clientX, clientY;

  if (e instanceof TouchEvent) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = Math.floor((clientX - rect.left) * scaleX / CELL_SIZE);
  const y = Math.floor((clientY - rect.top) * scaleY / CELL_SIZE);

  return { x, y };
}
selector.addEventListener('change', updateSignInputVisibility);
updateSignInputVisibility();

const ws = new WebSocket(import.meta.env.VITE_WS_URL);

let cells: Cell[] = [];
let width = 0;
let height = 0;

// --- Envoi du nom au serveur dès la connexion ---
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "hello",
    name: playerName
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'init') {
    width = msg.width;
    height = msg.height;
    cells = msg.cells as Cell[];
    renderer.init(width, height, cells);
  } else if (msg.type === 'diff') {
    for (const { x, y, cell } of msg.changes as { x: number; y: number; cell: Cell }[]) {
      cells[y * width + x] = cell;
      renderer.setCell(x, y, cell);
    }
  } else if (msg.type === 'error') {
    status.textContent = msg.message;
    setTimeout(() => (status.textContent = ''), 2000);
  }
};

canvas.addEventListener('click', (e) => {
  const { x, y } = getCanvasCoords(e);

  const raw = selector.value;
  if (raw === '') {
    console.warn('Aucun type sélectionné');
    return;
  }

  const cellType = Number(raw) as CellType;

  const payload: Record<string, unknown> = {
    type: 'place',
    x,
    y,
    cellType,
    createdBy: playerName   // --- ajout important ---
  };

  if (cellType === CellType.Sign) {
    payload.message = signMessageInput.value;
  }

  ws.send(JSON.stringify(payload));

  if (cellType === CellType.Sign) {
    signMessageInput.value = '';
  }
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasCoords(e);

  if (x < 0 || y < 0 || x >= width || y >= height) {
    info.style.display = 'none';
    return;
  }

  const cell = cells[y * width + x];
  if (!cell || cell.type === CellType.Empty) {
    info.style.display = 'none';
    return;
  }

  if (cell.type === CellType.Sign) {
    // textContent (pas innerHTML) : un message de joueur ne doit jamais être interprété comme du HTML.
    info.textContent = `📋 ${cell.message || '(panneau vide)'}`;
    info.style.left = `${e.clientX + 12}px`;
    info.style.top = `${e.clientY + 12}px`;
    info.style.display = 'block';
    return;
  }

  if (cell.type === CellType.Nutrient) {
    info.textContent = '✨ Nutriment — booste la prochaine plante voisine qui en a besoin';
    info.style.left = `${e.clientX + 12}px`;
    info.style.top = `${e.clientY + 12}px`;
    info.style.display = 'block';
    return;
  }

  if (cell.type !== CellType.Plant) {
    info.style.display = 'none';
    return;
  }

  const g = cell.genes;
  if (!g) {
    info.style.display = 'none';
    return;
  }

  // Le pseudo et la lignée viennent d'autres joueurs : on les échappe avant
  // de les insérer dans le HTML, sinon un pseudo du type "<img onerror=...>"
  // s'exécuterait chez tous ceux qui survolent la plante.
  function echapper(texte: string): string {
    const div = document.createElement('div');
    div.textContent = texte;
    return div.innerHTML;
  }

  info.innerHTML = `
    <strong>Plante</strong><br>
    Énergie: ${cell.energy}<br>
    Âge: ${cell.age}<br><br>
    <strong>Gènes</strong><br>
    Croissance: ${g.croissance}<br>
    Propagation: ${g.propagation}<br>
    Résistance: ${g.resistance}<br>
    Distance: ${g.distance}<br>
    Hydratation: ${g.hydratation}<br>
    Densité: ${g.densite}<br>
    Graines: ${g.graines}<br><br>
    <strong>Créée par :</strong> ${echapper(cell.createdBy ?? 'inconnu')}<br>
    <strong>Lignée :</strong> ${echapper(cell.lineage ?? 'inconnue')}<br>
  `;

  info.style.left = `${e.clientX + 12}px`;
  info.style.top = `${e.clientY + 12}px`;
  info.style.display = 'block';
});

canvas.addEventListener('mouseleave', () => {
  info.style.display = 'none';
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'S') {
    ws.send(JSON.stringify({ type: 'snapshot' }));
  }
});
